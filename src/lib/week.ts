import { DEMO_TODAY, clients } from '../data/mock';
import { getProfile } from '../data/profiles';
import { getSessions } from '../data/sessions';
import type { Booking, Client, ClientStatus, GroupKey } from '../data/types';
import { addDays } from './checkin';
import { daysBetween, formatMonthDay, parseDay } from './dates';
import { sessionRailLabel } from './todos';

/**
 * The week selector. Each week's statuses were generated on its Monday at 06:00 from the week before, so a past week
 * reads every figure as of that morning ("as of" = its Monday). The demo's logs start Mon 3 Aug, so the earliest week
 * with a full week of data behind it is 10 Aug: three weeks back (the brief's prior-week back-fill).
 */
export const MIN_WEEK_OFFSET = -3;

export const weekAsOf = (offset: number) => addDays(DEMO_TODAY, 7 * offset);

/** "Aug 24 – 30", or "Aug 31 – Sep 6" across a month. */
export function weekRange(offset: number) {
  const a = parseDay(weekAsOf(offset));
  const b = parseDay(addDays(weekAsOf(offset), 6));
  return a.getUTCMonth() === b.getUTCMonth() ? `${formatMonthDay(a)} – ${b.getUTCDate()}` : `${formatMonthDay(a)} – ${formatMonthDay(b)}`;
}

/** Last week's status is stored where it changed (`lastWeekStatus`); older weeks are back-filled with the current one. */
const statusInWeek = (c: Client, offset: number): ClientStatus => (offset === -1 ? (c.lastWeekStatus ?? c.status) : c.status);

/** Sessions on the Upcoming bookings card: within this many days of the morning. */
const BOOKING_WINDOW_DAYS = 3;

/** The client as that week's brief saw them: status, program countdown and the next session from that Monday. */
function clientAt(c: Client, offset: number): Client {
  if (offset === 0) return c;
  const asOf = weekAsOf(offset);
  const { program } = getProfile(c.id).training;
  const ends = daysBetween(asOf, addDays(program.startsOn, program.weeks * 7 - 1));
  const next = getSessions(c.id)
    ?.sessions.filter((b) => b.status !== 'early_cancel' && b.date >= asOf && daysBetween(asOf, b.date) <= BOOKING_WINDOW_DAYS)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))[0];
  return {
    ...c,
    status: statusInWeek(c, offset),
    lastWeekStatus: undefined,
    programEndsInDays: ends >= 0 && ends <= 7 ? ends : undefined,
    nextSession: next && sessionRailLabel(next, asOf, false),
  };
}

/**
 * The sessions on the Upcoming bookings card (three-part layout): one row per session, soonest first, from the same
 * bookings and rules as the card's clients, so every client on the card has a row and the Booking tab agrees.
 * The current week lists every booked session from today on; a past week, the sessions in that Monday's window.
 */
export function sessionsInWeek(offset: number): { client: Client; booking: Booking }[] {
  const asOf = weekAsOf(offset);
  const inWindow = (b: Booking) =>
    offset === 0
      ? b.status === 'booked' && b.date >= asOf
      : b.status !== 'early_cancel' && b.date >= asOf && daysBetween(asOf, b.date) <= BOOKING_WINDOW_DAYS;
  return groupsInWeek(offset)
    .upcoming_bookings.flatMap((client) => (getSessions(client.id)?.sessions ?? []).filter(inWindow).map((booking) => ({ client, booking })))
    .sort((a, b) => a.booking.date.localeCompare(b.booking.date) || a.booking.start.localeCompare(b.booking.start));
}

const weekCache = new Map<number, Client[]>();

/** Every client as of the given week. The current week is the live data, unchanged. */
export function clientsInWeek(offset: number): Client[] {
  let list = weekCache.get(offset);
  if (!list) {
    list = clients.map((c) => clientAt(c, offset));
    weekCache.set(offset, list);
  }
  return list;
}

/** Group membership for a week, derived from that week's statuses (AC3). */
export function groupsInWeek(offset: number): Record<GroupKey, Client[]> {
  const list = clientsInWeek(offset);
  return {
    at_risk: list.filter((c) => c.status === 'at_risk'),
    needs_attention: list.filter((c) => c.status === 'needs_attention'),
    program_ending: list.filter((c) => c.programEndsInDays !== undefined).sort((a, b) => a.programEndsInDays! - b.programEndsInDays!),
    upcoming_bookings: list.filter((c) => c.nextSession !== undefined),
  };
}

/** Past weeks' reviews: the coach reviewed most clients by the week's end. Seeded per client and week, so stable. */
export function seededReview(clientId: string, offset: number): boolean {
  let h = 2166136261;
  for (const ch of `${clientId}:${offset}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100) < 75;
}
