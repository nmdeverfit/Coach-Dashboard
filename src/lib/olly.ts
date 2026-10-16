import { todoDetails } from '../data/details';
import { getProfile } from '../data/profiles';
import type {
  AcknowledgeDetail,
  BuildDetail,
  Client,
  ClientMessage,
  PrepareDetail,
  RemindDetail,
  RespondDetail,
  Todo,
  UnblockDetail,
} from '../data/types';
import { WEEKDAYS, addDays, summarizeNutrition, type Assessment } from './checkin';
import { formatDayMonth, parseDay } from './dates';
import { buildAcknowledgeView, buildPrepareView, buildUnblockView, plural, time12 } from './todos';
import { sectionCounts, summarizeTraining } from './training';

/**
 * Olly in the middle column: Tell me more (Olly BI) and Draft with AI (Olly Voice), plus the inbox thread the
 * composer writes into. Every figure comes from the same builders as the panel beside it (AC4): the answer repeats
 * the assessment's facts, the chart is computed from the same logs. Olly BI explains and never prescribes (AC2.3).
 */

const dayMonth = (iso: string) => formatDayMonth(parseDay(iso));
const weekdayDate = (iso: string) => `${WEEKDAYS[parseDay(iso).getUTCDay()]} ${dayMonth(iso)}`;
const headlineText = (a: Assessment) => [a.headline.before, a.headline.signal, a.headline.after].filter(Boolean).join(' ');

// ---------------------------------------------------------------- Tell me more

/** The one fixed prompt (Spec 4 AC2.3): first name and the day of the status on screen. */
export const tellPrompt = (client: Client, today: string) => `Tell me more about ${client.firstName}’s status on ${dayMonth(today)}`;

export interface OllyChart {
  title: string;
  /** The coloured share, then the rest. */
  parts: [{ label: string; value: number }, { label: string; value: number }];
  headline: string;
  caption: string;
}

export interface OllyAnswer {
  bullets: string[];
  /** Where the answer comes from: the stored status, quoted from the assessment's own summary. */
  context: string;
  chart: OllyChart | null;
}

/**
 * Days with meals logged in the 7 days before today, or sections done in the 14, whichever signal leads. The units
 * are the assessment's own ("meals logged on 2 days of 7", "48% of scheduled sections"), so the two never disagree.
 */
function chartFor(client: Client, today: string): OllyChart | null {
  const profile = getProfile(client.id);
  if (profile.focus === 'nutrition') {
    const { window, daysLogged } = summarizeNutrition(profile.nutrition, today);
    return {
      title: 'Meal Logging Rate',
      parts: [
        { label: 'Days logged', value: daysLogged },
        { label: 'Not logged', value: 7 - daysLogged },
      ],
      headline: `${Math.round((daysLogged / 7) * 100)}% of days logged`,
      caption: `${daysLogged}/7 days · ${window.label}`,
    };
  }
  const { done, planned } = sectionCounts(profile.training, addDays(today, -14), addDays(today, -1));
  if (!planned) return null;
  return {
    title: 'Session Completion',
    parts: [
      { label: 'Completed', value: done },
      { label: 'Missed', value: planned - done },
    ],
    headline: `${Math.round((done / planned) * 100)}% completed`,
    caption: `${done}/${planned} scheduled sections · last 2 weeks`,
  };
}

/** Phase 1 answers only from the stored status: the same summary and facts the assessment card shows. */
export function tellAnswer(client: Client, assessment: Assessment, today: string): OllyAnswer {
  return {
    bullets: assessment.bullets,
    context: `This reads from ${client.firstName}’s stored status for ${dayMonth(today)}: ${headlineText(assessment)}`,
    chart: chartFor(client, today),
  };
}

// ---------------------------------------------------------------- Working steps

/** What Olly shows while it works (the user's screen recording): a title, its steps and the one-line summary. */
export interface OllyTaskSpec {
  title: string;
  steps: string[];
  doneLabel: string;
}

/** Tell me more reads the stored status, then the logs behind the leading signal, then charts them. */
export function tellTask(client: Client, today: string): OllyTaskSpec {
  const profile = getProfile(client.id);
  const nutrition = profile.focus === 'nutrition';
  const window = summarizeNutrition(profile.nutrition, today).window.label;
  return {
    title: `Reading ${client.firstName}’s status…`,
    steps: [
      `Read the stored status for ${dayMonth(today)}`,
      nutrition ? `Check meals logged, ${window}` : 'Check sections done, last 2 weeks',
      nutrition ? 'Chart the days logged' : 'Chart session completion',
    ],
    doneLabel: 'Checked 3 sources',
  };
}

export const draftTask = (client: Client): OllyTaskSpec => ({
  title: 'Drafting your message…',
  steps: [`Read ${client.firstName}’s to-do and status`, 'Write the draft'],
  doneLabel: 'Drafted 1 message',
});

export const sendTask = (client: Client): OllyTaskSpec => ({
  title: 'Sending your message…',
  steps: [`Deliver to ${client.name}’s inbox`],
  doneLabel: 'Message delivered',
});

// ---------------------------------------------------------------- Draft with AI

export interface OllyDraft {
  /** What the coach asked Olly for, shown as their message. */
  request: string;
  text: string;
}

/**
 * A draft scoped to the to-do that opened it (Spec 4 AC2.2), or a plain check-in from the client page. Written from
 * the panel's own data; never quotes the client and never scolds (AC12.4).
 */
export function draftFor(client: Client, todo: Todo | undefined, today: string): OllyDraft {
  const { firstName: first, name } = client;
  const detail = todo ? todoDetails[todo.id] : undefined;
  const ask = (purpose: string) => `Draft a message for ${name} to ${purpose}.`;

  switch (detail?.kind) {
    case 'remind': {
      const form = (detail as RemindDetail).forms.find((f) => f.overdueSince && f.overdueSince < today)!;
      return {
        request: ask(`remind ${first} to submit the ${form.name} form`),
        text: `Hi ${first}, a quick nudge on your ${form.name} form, due ${weekdayDate(form.overdueSince!)}. It’s how I see how the week went before I plan the next one. Two minutes whenever you get a chance.`,
      };
    }
    case 'build': {
      const { program } = summarizeTraining((detail as BuildDetail).training, today);
      const when = program.endsInDays < 0 ? `wrapped up on ${weekdayDate(program.endsOn)}` : `ends on ${weekdayDate(program.endsOn)}`;
      return {
        request: ask(`talk through ${first}’s next program`),
        text: `Hi ${first}, ${program.name} ${when}. I’m putting your next block together now. Anything you’d like more of, or less of, this time?`,
      };
    }
    case 'respond': {
      const d = detail as RespondDetail;
      return {
        request: ask(`reply to ${first}’s ${d.form}`),
        text: `Hi ${first}, thanks for sending your ${d.form}. I’m reading through it now and will come back with notes today.`,
      };
    }
    case 'prepare': {
      const next = buildPrepareView(detail as PrepareDetail, today).upcoming[0];
      const day = next.date === today ? 'today' : next.date === addDays(today, 1) ? 'tomorrow' : `on ${weekdayDate(next.date)}`;
      return {
        request: ask(`remind ${first} about the next session`),
        text: `Hi ${first}, just a reminder about your ${next.type.name} ${day} at ${time12(next.start)}. See you then!`,
      };
    }
    case 'unblock': {
      const { focus } = buildUnblockView(detail as UnblockDetail, first, today);
      const soon = focus.expiringSoon;
      return {
        request: ask(`let ${first} know about the credits running out`),
        text: soon
          ? `Hi ${first}, a heads-up: ${plural(soon.count, `${focus.pool.type.name} credit`)} expire${soon.count === 1 ? 's' : ''} in ${plural(soon.inDays, 'day')}. Want to book a session before then?`
          : `Hi ${first}, you have ${plural(focus.balance, `${focus.pool.type.name} credit`)} left. Shall we top up before your next booking?`,
      };
    }
    case 'acknowledge': {
      const { streak } = buildAcknowledgeView(detail as AcknowledgeDetail, first, today);
      return {
        request: ask(`congratulate ${first} on the streak`),
        text: `Hi ${first}, ${streak.days} days in a row on your calorie goal. That’s a real turnaround from the last few weeks. Keep it going!`,
      };
    }
    default:
      return { request: ask('check in on the week'), text: checkinText(client, today) };
  }
}

/** A check-in written from the client's leading signal. */
function checkinText(client: Client, today: string): string {
  const first = client.firstName;
  const profile = getProfile(client.id);
  const onTrack = client.status === 'on_track';
  if (profile.focus === 'nutrition') {
    const n = summarizeNutrition(profile.nutrition, today);
    if (onTrack) return `Hi ${first}, great consistency this week: meals logged on ${n.daysLogged} of the last 7 days. Anything you’d like to change for the week ahead?`;
    return n.daysLogged === 0
      ? `Hi ${first}, I haven’t seen any meals logged this past week. Even a quick photo or a rough entry helps me see what’s working. How are things on your side?`
      : `Hi ${first}, I can see meals logged on ${n.daysLogged} of the last 7 days. Even a quick photo or a rough entry helps me see what’s working. How’s the week looking?`;
  }
  const t = summarizeTraining(profile.training, today);
  if (t.adherence2w === null) return `Hi ${first}, checking in on how the week went. Anything you’d like to plan together for the next one?`;
  if (onTrack) return `Hi ${first}, ${t.adherence2w}% of your scheduled sections done over the last two weeks. Great work. Anything you’d like to change for the week ahead?`;
  return `Hi ${first}, you’ve completed ${t.adherence2w}% of scheduled sections over the last two weeks. Is anything getting in the way that I can help plan around?`;
}

// ---------------------------------------------------------------- Inbox thread

export interface ThreadMessage {
  from: 'coach' | 'client';
  /** "YYYY-MM-DDTHH:MM" */
  at: string;
  text: string;
}

/** Stand-in wording for the demo's thread; the profile stores who wrote when, not what (BL4 keeps Olly off the text). */
const CLIENT_LINES = [
  'All good, thanks coach! Busy week but getting there.',
  'Thanks! Legs were sore after Thursday but I’m fine now.',
  'Got it, I’ll try to log more consistently this week.',
  'Sounds good, see you on the next check-in.',
];
const COACH_CHECKIN = 'Hi {first}, how did the week go? Anything I should know before we plan the next one?';
const COACH_FOLLOWUP = 'Just checking in again, {first}. No pressure, a quick reply is plenty.';
const COACH_OPENER = 'Hi {first}, how are you finding the plan so far?';

export function threadFor(client: Client): ThreadMessage[] {
  const fill = (s: string) => s.replace('{first}', client.firstName);
  let clientLine = client.id.length;
  return [...getProfile(client.id).messages]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((m: ClientMessage, i, all) => {
      if (m.from === 'client') return { ...m, text: CLIENT_LINES[clientLine++ % CLIENT_LINES.length] };
      const followUp = i > 0 && all[i - 1].from === 'coach';
      return { ...m, text: fill(m.checkin ? COACH_CHECKIN : followUp ? COACH_FOLLOWUP : COACH_OPENER) };
    });
}

/** "Monday, 31 Aug 2026" */
export function threadDay(iso: string) {
  const d = parseDay(iso);
  const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()];
  return `${day}, ${formatDayMonth(d)} ${d.getUTCFullYear()}`;
}

/** "05:53 AM" */
export function threadTime(at: string) {
  const [h, m] = at.slice(11, 16).split(':').map(Number);
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
