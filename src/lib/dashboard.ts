import { getSessions } from '../data/sessions';
import type { Booking, Client, ClientMessage, ClientProfile, ClientStatus, SessionType, Todo } from '../data/types';
import { addDays, weekdayLabel } from './checkin';
import { buildClientAssessment } from './client';
import { daysBetween, formatMonthDay, parseDay } from './dates';
import { buildUnblockView, inDays, plural, timeSpan } from './todos';

/**
 * The client-list view (Figma 5676:145292): which tab a client sits in, the one-line status summary, the Activity
 * line and Last active. Every figure comes from the client's profile, the same one the detail page reads (AC3, AC4).
 */

/** The brief is generated at 06:00 on the demo's Monday. */
const GENERATED_AT_HOUR = 6;

export type DashboardTab =
  | 'all'
  | 'booking'
  | 'at_risk'
  | 'needs_attention'
  | 'on_track'
  | 'program_ending'
  | 'no_activities'
  | 'form_review'
  | 'review_completed'
  | 'paused';

const STATUS_WORDS: Record<ClientStatus, string> = {
  at_risk: 'at risk',
  needs_attention: 'needs attention',
  on_track: 'on track',
  no_activities: 'no activities',
};
const STATUS_RANK: Record<ClientStatus, number> = { at_risk: 0, needs_attention: 1, on_track: 2, no_activities: 3 };

/** Need Review lists the most urgent first. */
export const byUrgency = (a: Client, b: Client) => STATUS_RANK[a.status] - STATUS_RANK[b.status];

// ---------------------------------------------------------------- Status column

/**
 * The status column's summary: the assessment's headline on the detail page, minus its leading "Current", so the
 * two never differ. No activities clients get the fixed line and no assessment (brief, Client-list view).
 */
export function statusLine(client: Client, profile: ClientProfile, today: string): string {
  if (client.status === 'no_activities') return 'No activity logged this week.';
  const { before, signal, after } = buildClientAssessment(client, profile, today).headline;
  const text = [before === 'Current' ? '' : before, signal, after].filter(Boolean).join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------- Activity column

export interface ActivityLine {
  /** Rich text: `strong` parts are semibold, as drawn. */
  parts: { text: string; strong?: boolean }[];
  /** A second, plain line ("Awaiting response (1 day)"). */
  note?: string;
  action?: 'follow_up' | 'draft_reach_out';
}

const hoursAgo = (at: string, today: string) =>
  daysBetween(at.slice(0, 10), today) * 24 + GENERATED_AT_HOUR - Number(at.slice(11, 13));

const agoLabel = (hours: number) => (hours < 24 ? `${hours} hour${hours === 1 ? '' : 's'} ago` : `${Math.floor(hours / 24)} days ago`);

/**
 * What changed for the client, most telling first: a status change since last week, then the message thread (a reply
 * in the last 48 hours, messages left unanswered for 3+ days, or a message still awaiting a reply). The thread is
 * read for who wrote last and when, never for what was said.
 */
export function activityLine(client: Client, profile: ClientProfile, today: string): ActivityLine | null {
  const first = client.firstName;
  const last = client.lastWeekStatus;
  if (last && last !== client.status) {
    const monday = addDays(today, -((parseDay(today).getUTCDay() + 6) % 7) - 7);
    const worse = STATUS_RANK[client.status] < STATUS_RANK[last];
    return {
      parts: [
        { text: `${first} ` },
        { text: `was ${STATUS_WORDS[last]}`, strong: true },
        { text: ` in the week of ${formatMonthDay(parseDay(monday))} - ${formatMonthDay(parseDay(addDays(monday, 6)))} ${worse ? 'but' : 'and'} is ` },
        { text: `now ${STATUS_WORDS[client.status]}`, strong: true },
        { text: '.' },
      ],
      action: 'draft_reach_out',
    };
  }

  const thread = [...profile.messages].sort((a, b) => a.at.localeCompare(b.at));
  const latest = thread[thread.length - 1];
  if (!latest) return null;

  if (latest.from === 'client') {
    const hours = hoursAgo(latest.at, today);
    if (hours >= 48) return null;
    return {
      parts: [{ text: `${first} ` }, { text: 'responded', strong: true }, { text: ` to your message ${agoLabel(hours)}.` }],
      action: 'follow_up',
    };
  }

  // The coach's messages since the client last wrote.
  const lastReply = thread.map((m) => m.from).lastIndexOf('client');
  const unanswered: ClientMessage[] = thread.slice(lastReply + 1);
  const waited = daysBetween(unanswered[0].at.slice(0, 10), today);
  if (waited >= 3) {
    return { parts: [{ text: 'No response', strong: true }, { text: ` from ${first} in ${waited} days.` }], action: 'follow_up' };
  }
  const sentDays = daysBetween(latest.at.slice(0, 10), today);
  return {
    parts: [
      { text: `You sent ${first} ` },
      { text: latest.checkin ? 'a check-in message' : 'a message', strong: true },
      { text: ` on ${formatMonthDay(parseDay(latest.at.slice(0, 10)))}.` },
    ],
    note: `Awaiting response (${sentDays} day${sentDays === 1 ? '' : 's'})`,
  };
}

// ---------------------------------------------------------------- Last active

/** The client's latest activity of any kind: food logged, a section trained, a habit ticked, a form, a message. */
export function lastActive(profile: ClientProfile, today: string): string {
  const dates = [
    ...Object.entries(profile.nutrition.days)
      .filter(([, meals]) => Object.values(meals ?? {}).some((foods) => foods && foods.length))
      .map(([date]) => date),
    ...Object.entries(profile.training.days)
      .filter(([, day]) => day.kind === 'workout' && day.completed > 0)
      .map(([date]) => date),
    ...profile.habits.flatMap((h) => h.doneOn),
    ...profile.forms.flatMap((f) => (f.lastSubmittedOn ? [f.lastSubmittedOn] : [])),
    ...profile.messages.filter((m) => m.from === 'client').map((m) => m.at.slice(0, 10)),
  ].filter((d) => d < today);
  if (!dates.length) return '—';
  const days = daysBetween(dates.sort()[dates.length - 1], today);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

// ---------------------------------------------------------------- Tabs

/** A submitted form is waiting while it is unreviewed and its Respond to-do has not been completed. */
export function hasFormToReview(client: Client, profile: ClientProfile, todos: Todo[]): boolean {
  const done = todos.some((t) => t.clientId === client.id && t.type === 'respond' && t.state === 'completed');
  return !done && profile.forms.some((f) => !f.reviewed && f.lastSubmittedOn);
}

export function inTab(tab: DashboardTab, client: Client, ctx: { formToReview: boolean; reviewed: boolean }): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'booking':
      return getSessions(client.id) !== undefined;
    case 'program_ending':
      return client.programEndsInDays !== undefined;
    case 'form_review':
      return ctx.formToReview;
    case 'review_completed':
      return ctx.reviewed;
    case 'paused':
      return false;
    default:
      return client.status === tab;
  }
}

// ---------------------------------------------------------------- Booking tab

export interface BookingRow {
  /** The soonest booked session from today on. */
  next?: { booking: Booking; date: string; time: string };
  /** Absent when the client holds no credits on any session type. */
  credits?: {
    balance: number;
    /** The pool that needs the coach: credits expiring within 7 days first, else a balance at the low threshold. */
    alert?: { type: SessionType; kind: 'expiring'; label: string } | { type: SessionType; kind: 'low' };
  };
}

/**
 * The Booking tab's two columns, from the client's bookings and credits. The credit figures come from the Unblock
 * builder, so Wendy's row and her Unblock panel say the same thing.
 */
export function bookingRow(client: Client, today: string): BookingRow {
  const s = getSessions(client.id);
  if (!s) return {};
  const booking = s.sessions
    .filter((b) => b.status === 'booked' && b.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))[0];
  const next = booking && { booking, date: weekdayLabel(booking.date), time: timeSpan(booking) };

  if (!s.credits.length) return { next };
  const view = buildUnblockView({ kind: 'unblock', credits: s.credits }, client.firstName, today);
  const { focus } = view;
  const alert = focus.expiringSoon
    ? { type: focus.pool.type, kind: 'expiring' as const, label: `${plural(focus.expiringSoon.count, 'credit')} expiring ${inDays(focus.expiringSoon.inDays)}` }
    : focus.low
      ? { type: focus.pool.type, kind: 'low' as const }
      : undefined;
  return { next, credits: { balance: view.total, alert } };
}
