import { todoDetails } from '../data/details';
import { getProfile } from '../data/profiles';
import type {
  AcknowledgeDetail,
  BuildDetail,
  Client,
  ClientMessage,
  Highlight,
  PrepareDetail,
  RemindDetail,
  RespondDetail,
  Todo,
  UnblockDetail,
} from '../data/types';
import { WEEKDAYS, addDays, summarizeNutrition, type Assessment } from './checkin';
import { formatDayMonth, formatMonthDay, parseDay } from './dates';
import { buildAcknowledgeView, buildPrepareView, buildUnblockView, plural, time12 } from './todos';
import { summarizeTraining, workoutCounts } from './training';

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
 * Days with meals logged in the 7 days before today, or workouts done in the 14, whichever signal leads. The units
 * are the assessment's own ("meals logged on 2 days of 7", "48% of assigned workouts"), so the two never disagree.
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
  const { done, planned } = workoutCounts(profile.training, addDays(today, -14), addDays(today, -1));
  if (!planned) return null;
  return {
    title: 'Session Completion',
    parts: [
      { label: 'Completed', value: done },
      { label: 'Missed', value: planned - done },
    ],
    headline: `${Math.round((done / planned) * 100)}% completed`,
    caption: `${done}/${planned} assigned workouts · last 2 weeks`,
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

// ---------------------------------------------------------------- Deep analysis (Training tab)

export const trainingPrompt = (client: Client) => `Analyze ${client.firstName}’s training progress over the last 4 weeks`;

export interface TrainingAnalysis {
  bullets: string[];
  context: string;
  /** The four finished weeks before this one, oldest first: workouts done of assigned. */
  weeks: { label: string; pct: number | null; done: number; planned: number }[];
  /** Workouts assigned across the four weeks; no chart without any. */
  planned: number;
}

/**
 * Deep analysis reads the training log itself, week by week: adherence, its direction, the workout missed most and
 * where the program stands. Every figure is the Training tab's (same builders, AC4); it describes, never prescribes.
 */
export function trainingAnalysis(client: Client, today: string): TrainingAnalysis {
  const log = getProfile(client.id).training;
  const t = summarizeTraining(log, today);
  const monday = addDays(today, -((parseDay(today).getUTCDay() + 6) % 7));
  const starts = [4, 3, 2, 1].map((n) => addDays(monday, -7 * n));
  const weeks = starts.map((start) => {
    const { done, planned } = workoutCounts(log, start, addDays(start, 6));
    return { label: formatMonthDay(parseDay(start)), pct: planned ? Math.round((done / planned) * 100) : null, done, planned };
  });
  const done = weeks.reduce((n, w) => n + w.done, 0);
  const planned = weeks.reduce((n, w) => n + w.planned, 0);
  const first = starts[0];
  const last = addDays(monday, -1);

  const bullets: string[] = [];
  if (!planned) bullets.push(`No workouts were assigned between ${dayMonth(first)} and ${dayMonth(last)}.`);
  else {
    // Weeks with nothing assigned (before the program started) are left out of the read, and said so.
    const shown = weeks.filter((w) => w.pct !== null);
    const span = shown.length === 4 ? 'over the last 4 weeks' : `in the ${shown.length === 1 ? 'week' : `${shown.length} weeks`} with workouts assigned`;
    bullets.push(`Completed ${done} of ${planned} assigned workouts ${span} (${Math.round((done / planned) * 100)}%).`);
    if (shown.length > 1) {
      const delta = shown[shown.length - 1].pct! - shown[0].pct!;
      const path = shown.map((w) => `${w.pct}%`).join(' → ');
      bullets.push(`Week by week: ${path}, ${delta === 0 ? 'level' : `${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} points`} across those weeks.`);
    }
    // The workout left undone most often in those weeks.
    const missed = new Map<string, { missed: number; total: number }>();
    for (let d = first; d <= last; d = addDays(d, 1)) {
      const day = log.days[d];
      if (day?.kind !== 'workout') continue;
      for (const w of day.workouts) {
        const m = missed.get(w.name) ?? { missed: 0, total: 0 };
        missed.set(w.name, { missed: m.missed + (w.done ? 0 : 1), total: m.total + 1 });
      }
    }
    const top = [...missed.entries()].sort((a, b) => b[1].missed - a[1].missed || b[1].total - a[1].total)[0];
    if (top && top[1].missed > 0) bullets.push(`Missed most: ${top[0]}, ${top[1].missed} of ${top[1].total} not done.`);
  }
  const lastWorkout =
    t.lastWorkoutDaysAgo === null ? 'No workout done yet' : `Last workout ${t.lastWorkoutDaysAgo === 1 ? 'yesterday' : `${t.lastWorkoutDaysAgo} days ago`}`;
  const program =
    t.program.endsInDays < 0
      ? `${t.program.name} ended ${dayMonth(t.program.endsOn)}`
      : `week ${t.program.week} of ${t.program.weeks} of ${t.program.name}, which ends ${dayMonth(t.program.endsOn)}`;
  bullets.push(`${lastWorkout}; ${program}.`);

  return { bullets, context: `This reads from ${client.firstName}’s training log, ${dayMonth(first)} to ${dayMonth(last)}.`, weeks, planned };
}

export const trainingTask = (client: Client): OllyTaskSpec => ({
  title: `Analyzing ${client.firstName}’s training…`,
  steps: ['Read the training log, last 4 weeks', 'Compare the weeks and the workouts', 'Chart weekly completion'],
  doneLabel: 'Checked 4 weeks',
});

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
      nutrition ? `Check meals logged, ${window}` : 'Check workouts done, last 2 weeks',
      nutrition ? 'Chart the days logged' : 'Chart session completion',
    ],
    doneLabel: 'Checked 3 sources',
  };
}

export const draftTask = (client: Client, fromHighlight = false): OllyTaskSpec => ({
  title: 'Drafting your message…',
  steps: [fromHighlight ? `Read ${client.firstName}’s highlight` : `Read ${client.firstName}’s to-do and status`, 'Write the draft'],
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

/**
 * A note for a Client highlight (Draft with AI on its row): a congratulation, a birthday wish or an anniversary
 * thank-you, written from the highlight's own sentence. The sentence is the system's, never the client's words.
 */
export function highlightDraft(client: Client, h: Highlight, today: string): OllyDraft {
  const first = client.firstName;
  const ask = (purpose: string) => `Draft a message for ${client.name} to ${purpose}.`;
  if (h.category === 'birthday') {
    const request = ask(`wish ${first} a happy birthday`);
    const late = h.on < today;
    const ahead = h.on > today;
    return {
      request,
      text: late
        ? `Happy belated birthday, ${first}! I hope it was a great day. Here’s to a strong year ahead.`
        : ahead
          ? `Happy birthday for tomorrow, ${first}! I hope it’s a great day. Here’s to a strong year ahead.`
          : `Happy birthday, ${first}! I hope it’s a great day. Here’s to a strong year ahead.`,
    };
  }
  const span = h.text.match(/(\d+)-(month|year)/);
  if (h.category === 'anniversary' && span) {
    const request = ask(`mark ${first}’s coaching anniversary`);
    const length = `${span[1]} ${span[2]}${span[1] === '1' ? '' : 's'}`;
    return {
      request,
      text: `Hi ${first}, ${length} since we started working together${h.on === today ? ' today' : ''}! Thanks for showing up week after week. I’m proud of how far you’ve come.`,
    };
  }
  // "hit her goal - target weight 65 kg" → "you hit your goal: target weight 65 kg"
  const request = ask(`congratulate ${first}: ${h.text.replace(/\.$/, '')}`);
  const done = h.text.replace(/\b(his|her)\b/g, 'your').replace(/\s+-\s+/, ': ').replace(/\.$/, '');
  return {
    request,
    text: `Hi ${first}, congratulations, you ${done}! That’s a big one, and well earned. What would you like to aim for next?`,
  };
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
  if (onTrack) return `Hi ${first}, ${t.adherence2w}% of your assigned workouts done over the last two weeks. Great work. Anything you’d like to change for the week ahead?`;
  return `Hi ${first}, you’ve completed ${t.adherence2w}% of your assigned workouts over the last two weeks. Is anything getting in the way that I can help plan around?`;
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
