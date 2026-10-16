import type {
  AcknowledgeDetail,
  AssignedForm,
  Booking,
  BuildDetail,
  CreditPool,
  PrepareDetail,
  RemindDetail,
  RespondDetail,
  SessionLocation,
  TodoDetail,
  UnblockDetail,
} from '../data/types';
import { WEEKDAYS, addDays, buildCheckinView, foodCalories, summarizeNutrition, type Assessment } from './checkin';
import { daysBetween, formatDayMonth, formatMonthDay, parseDay } from './dates';
import { summarizeTraining, type TrainingSummary } from './training';

/**
 * Row reasons, assessments and data-area figures for the five non-Check-in to-do types, each computed from the raw
 * inputs in `data/details.ts` so the row, the panel and its cards cannot disagree (AC4).
 */

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
/** "Thu 27 Aug": coach-facing dates in model-written copy (Spec 4 BL4). */
const weekdayDate = (iso: string) => `${WEEKDAYS[parseDay(iso).getUTCDay()]} ${formatDayMonth(parseDay(iso))}`;
const mondayOf = (iso: string) => addDays(iso, -((parseDay(iso).getUTCDay() + 6) % 7));

/** "Today", "Yesterday", "8 days ago". */
export const daysAgo = (iso: string, today: string) => {
  const n = daysBetween(iso, today);
  return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`;
};

/** "in 5 days", "tomorrow", "today". */
const inDays = (n: number) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${plural(n, 'day')}`);

// ---------------------------------------------------------------- Respond (form review)

export interface RespondView {
  rowReason: string;
  waitingDays: number;
  canCompare: boolean;
}

export function buildRespondView(d: RespondDetail, firstName: string, today: string): RespondView {
  const waitingDays = daysBetween(d.submittedOn, today);
  return {
    rowReason: `${firstName}’s ${d.form} has been waiting ${plural(waitingDays, 'day')}.`,
    waitingDays,
    canCompare: d.responseCount >= 2,
  };
}

// ---------------------------------------------------------------- Unblock (issue credit)

/** Spec 4 LOW_CREDIT_THRESHOLD (in review, OQ15). */
export const LOW_CREDIT_THRESHOLD = 2;
/** Credits expiring within this many days raise an Unblock to-do (Spec 4 BL7). */
const EXPIRY_WINDOW_DAYS = 7;

export interface CreditPoolView {
  pool: CreditPool;
  balance: number;
  /** Unexpired batches, soonest expiry first; batches that never expire come last. */
  batches: { count: number; expiresOn?: string; inDays?: number }[];
  /** The soonest batch expiring inside the window, if any. */
  expiringSoon?: { count: number; inDays: number; label: string };
  low: boolean;
}

export interface UnblockView {
  rowReason: string;
  total: number;
  pools: CreditPoolView[];
  /** The pool the to-do is about: soonest expiry first, otherwise the lowest balance. */
  focus: CreditPoolView;
}

export function buildUnblockView(d: UnblockDetail, firstName: string, today: string): UnblockView {
  const pools = d.credits.map((pool): CreditPoolView => {
    const batches = pool.batches
      .filter((b) => !b.expiresOn || b.expiresOn >= today)
      .map((b) => ({ ...b, inDays: b.expiresOn ? daysBetween(today, b.expiresOn) : undefined }))
      .sort((a, b) => (a.inDays ?? Infinity) - (b.inDays ?? Infinity));
    const balance = batches.reduce((sum, b) => sum + b.count, 0);
    const soon = batches.find((b) => b.inDays !== undefined && b.inDays <= EXPIRY_WINDOW_DAYS);
    return {
      pool,
      balance,
      batches,
      expiringSoon: soon && { count: soon.count, inDays: soon.inDays!, label: `${plural(soon.count, 'credit')} expiring · ${inDays(soon.inDays!)}` },
      low: balance <= LOW_CREDIT_THRESHOLD,
    };
  });

  const expiring = pools.filter((p) => p.expiringSoon).sort((a, b) => a.expiringSoon!.inDays - b.expiringSoon!.inDays);
  const focus = expiring[0] ?? [...pools].sort((a, b) => a.balance - b.balance)[0];
  const rowReason = focus.expiringSoon
    ? `${firstName} has ${plural(focus.expiringSoon.count, `${focus.pool.type.name} credit`)} expiring ${inDays(focus.expiringSoon.inDays)}.`
    : `${firstName} has ${plural(focus.balance, `${focus.pool.type.name} credit`)} left.`;

  return { rowReason, total: pools.reduce((sum, p) => sum + p.balance, 0), pools, focus };
}

// ---------------------------------------------------------------- Prepare (booking)

export const LOCATION_LABEL: Record<SessionLocation, string> = { in_person: 'In-person', phone: 'Phone call', video: 'Video call' };
const LOCATION_PHRASE: Record<SessionLocation, string> = { in_person: 'in person', phone: 'by phone', video: 'on video' };

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const clock = (mins: number) => {
  const h = Math.floor(mins / 60) % 24;
  return { text: `${h % 12 || 12}:${String(mins % 60).padStart(2, '0')}`, meridiem: h < 12 ? 'am' : 'pm' };
};

/** "2:00pm" */
export const time12 = (hhmm: string) => {
  const c = clock(minutesOf(hhmm));
  return `${c.text}${c.meridiem}`;
};

/** "2:00 - 3:00pm (60 min)", or "11:30am - 12:30pm (60 min)" across noon. */
export function timeRange(b: Booking) {
  const start = clock(minutesOf(b.start));
  const end = clock(minutesOf(b.start) + b.type.minutes);
  const from = start.meridiem === end.meridiem ? start.text : `${start.text}${start.meridiem}`;
  return `${from} - ${end.text}${end.meridiem} (${b.type.minutes} min)`;
}

export interface PrepareView {
  rowReason: string;
  /** Booked sessions from today on, soonest first. */
  upcoming: Booking[];
  lastSession?: string;
  thisWeek: { completed: number; lateCancel: number; earlyCancel: number };
  /** Session label on the Upcoming bookings card: "Sep 1 • 2:00 PM". */
  railLabel: string;
}

export function buildPrepareView(d: PrepareDetail, today: string): PrepareView {
  const upcoming = d.sessions
    .filter((s) => s.status === 'booked' && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const next = upcoming[0];
  const lastSession = d.sessions
    .filter((s) => s.status === 'completed' && s.date < today)
    .map((s) => s.date)
    .sort()
    .pop();

  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const week = d.sessions.filter((s) => s.date >= monday && s.date <= sunday);
  const count = (status: Booking['status']) => week.filter((s) => s.status === status).length;

  const when = daysBetween(today, next.date);
  const day = when === 0 ? 'today' : when === 1 ? 'tomorrow' : `on ${weekdayDate(next.date)}`;
  const railDay = when === 0 ? 'Today' : `${formatMonthDay(parseDay(next.date))} •`;

  return {
    rowReason: `${next.type.name} ${day} at ${time12(next.start)}, ${LOCATION_PHRASE[next.type.location]}.`,
    upcoming,
    lastSession,
    thisWeek: { completed: count('completed'), lateCancel: count('late_cancel'), earlyCancel: count('early_cancel') },
    railLabel: `${railDay} ${time12(next.start).toUpperCase().replace(/(AM|PM)$/, ' $1')}`,
  };
}

// ---------------------------------------------------------------- Build (assign program)

export interface BuildView {
  rowReason: string;
  assessment: Assessment;
  training: TrainingSummary;
}

export function buildBuildView(d: BuildDetail, firstName: string, today: string): BuildView {
  const training = summarizeTraining(d.training, today);
  const { program } = training;
  const ended = program.endsInDays < 0;

  // Days since the last date anything was assigned, not counting today.
  const lastAssigned = Object.keys(d.training.days)
    .filter((date) => date < today)
    .sort()
    .pop();
  const idleDays = lastAssigned ? daysBetween(lastAssigned, today) - 1 : 0;

  const rowReason = ended
    ? `${firstName} has had nothing assigned for ${plural(idleDays, 'day')}.`
    : `${firstName}’s program ends ${program.endsInDays === 0 ? 'today' : `in ${plural(program.endsInDays, 'day')}`}.`;

  const bullets: string[] = [];
  if (d.context.programRequestedOn) bullets.push(`Asked for a new program in a message on ${weekdayDate(d.context.programRequestedOn)}.`);
  const last = training.lastWorkout;
  if (last) bullets.push(`Last workout on ${weekdayDate(last.date)}, ${last.name}: ${last.completed} of ${last.sections} sections done.`);
  if (training.adherence2w !== null) bullets.push(`Completed ${training.adherence2w}% of scheduled sections over the last 2 weeks.`);

  return {
    rowReason,
    training,
    assessment: {
      headline: {
        before: ended
          ? `“${program.name}” ended on ${weekdayDate(program.endsOn)} and nothing has been assigned since.`
          : `“${program.name}” ends on ${weekdayDate(program.endsOn)} and no next program is assigned.`,
      },
      bullets: bullets.slice(0, 3),
    },
  };
}

// ---------------------------------------------------------------- Remind (overdue check-in form)

export interface FormStatusRow extends AssignedForm {
  status: 'submitted' | 'overdue';
}

export interface RemindView {
  rowReason: string;
  assessment: Assessment;
  overdue: AssignedForm;
  rows: FormStatusRow[];
}

export function buildRemindView(d: RemindDetail, firstName: string, today: string): RemindView {
  const overdue = d.forms.find((f) => f.overdueSince && f.overdueSince < today)!;
  const lastWeek = summarizeTraining(d.training, today).weeks[0].filter((c) => c.day);
  const done = lastWeek.filter((c) => c.state === 'completed').length;
  const nutrition = summarizeNutrition(d.nutrition, today);

  const bullets = [
    overdue.lastSubmittedOn
      ? `Last submitted on ${weekdayDate(overdue.lastSubmittedOn)}, ${daysAgo(overdue.lastSubmittedOn, today).toLowerCase()}.`
      : 'Never submitted since it was assigned.',
    `Completed ${done} of ${lastWeek.length} scheduled workouts last week.`,
    `Meals logged on ${nutrition.daysLogged} of the last 7 days.`,
  ];

  return {
    rowReason: `${firstName} has a check-in form overdue.`,
    overdue,
    rows: d.forms.map((f) => ({ ...f, status: f === overdue ? 'overdue' : 'submitted' })),
    assessment: {
      headline: { before: `${overdue.name} was due ${weekdayDate(overdue.overdueSince!)} and has not been submitted.` },
      bullets,
    },
  };
}

// ---------------------------------------------------------------- Acknowledge (Phase 2, trialled)

export interface AcknowledgeView {
  rowReason: string;
  assessment: Assessment;
  streak: { days: number; start: string; avgCalories: number; avgProtein: number };
  /** The three 7-day windows before the streak, oldest first; avg is over logged days, null when none. */
  priorWeeks: { start: string; avgCalories: number | null }[];
  targetCalories: number;
}

const kcal = (n: number) => Math.round(n).toLocaleString('en-US');
/** "25–30 Aug", or "28 Aug – 2 Sep" across months. */
const dayRange = (from: string, to: string) => {
  const a = parseDay(from);
  const b = parseDay(to);
  return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${formatDayMonth(b)}` : `${formatDayMonth(a)} – ${formatDayMonth(b)}`;
};

export function buildAcknowledgeView(d: AcknowledgeDetail, firstName: string, today: string): AcknowledgeView {
  const { targetCalories, macros } = summarizeNutrition(d.nutrition, today);
  const foodsOn = (date: string) => Object.values(d.nutrition.days[date] ?? {}).flat();
  const caloriesOn = (date: string) => {
    const foods = foodsOn(date);
    return foods.length ? foods.reduce((sum, f) => sum + foodCalories(f!), 0) : null;
  };

  // Days at or above the target, counted back from yesterday.
  let days = 0;
  for (let date = addDays(today, -1); (caloriesOn(date) ?? 0) >= targetCalories; date = addDays(date, -1)) days += 1;
  const start = addDays(today, -days);
  const streakDates = Array.from({ length: days }, (_, i) => addDays(start, i));
  const avgOf = (dates: string[], pick: (date: string) => number | null) => {
    const values = dates.map(pick).filter((v): v is number => v !== null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const avgCalories = avgOf(streakDates, caloriesOn) ?? 0;
  const avgProtein = avgOf(streakDates, (date) => foodsOn(date).reduce((sum, f) => sum + f!.protein, 0)) ?? 0;

  const priorWeeks = [3, 2, 1].map((n) => {
    const weekStart = addDays(start, -7 * n);
    return { start: weekStart, avgCalories: avgOf(Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), caloriesOn) };
  });
  // Consecutive short weeks right before the streak.
  let shortWeeks = 0;
  for (const w of [...priorWeeks].reverse()) {
    if (w.avgCalories === null || w.avgCalories >= targetCalories) break;
    shortWeeks += 1;
  }

  const protein = macros.find((m) => m.key === 'protein')!;
  return {
    rowReason: `${firstName} hit the +${d.goal.surplusKcal} kcal surplus ${days} days running after ${plural(shortWeeks, 'week')} short.`,
    streak: { days, start, avgCalories, avgProtein },
    priorWeeks,
    targetCalories,
    assessment: {
      headline: {
        before: 'Back on the',
        signal: 'nutrition',
        after: `goal: ${days} days in a row at or above ${kcal(targetCalories)} kcal, the +${d.goal.surplusKcal} kcal surplus.`,
      },
      bullets: [
        `${dayRange(start, addDays(today, -1))} averaged ${kcal(avgCalories)} kcal a day.`,
        `The ${plural(shortWeeks, 'week')} before averaged ${priorWeeks
          .slice(-shortWeeks)
          .map((w) => kcal(w.avgCalories!))
          .join(' → ')} kcal, all under target.`,
        `Protein averaged ${Math.round(avgProtein)} of ${protein.target}g during the streak.`,
      ],
    },
  };
}

// ---------------------------------------------------------------- Row reason for any type

/** The greyed "why" on a to-do row, from the same builder the panel uses; the panel repeats it verbatim (BL4). */
export function rowReasonFor(detail: TodoDetail, firstName: string, today: string): string {
  switch (detail.kind) {
    case 'checkin':
      return buildCheckinView(detail, today).rowReason;
    case 'respond':
      return buildRespondView(detail, firstName, today).rowReason;
    case 'unblock':
      return buildUnblockView(detail, firstName, today).rowReason;
    case 'prepare':
      return buildPrepareView(detail, today).rowReason;
    case 'build':
      return buildBuildView(detail, firstName, today).rowReason;
    case 'remind':
      return buildRemindView(detail, firstName, today).rowReason;
    case 'acknowledge':
      return buildAcknowledgeView(detail, firstName, today).rowReason;
  }
}
