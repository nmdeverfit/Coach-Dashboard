import { addDays } from '../lib/checkin';
import { dayAt, todoDetails } from './details';
import { DEMO_TODAY, findPerson, generatedStatus } from './mock';
import type {
  AcknowledgeDetail,
  AssignedForm,
  BuildDetail,
  CheckinDetail,
  Client,
  ClientMessage,
  ClientNote,
  ClientProfile,
  ClientStatus,
  ClientTask,
  Habit,
  NutritionLog,
  RemindDetail,
  RespondDetail,
  TrainingDay,
  TrainingLog,
} from './types';

/**
 * Client profiles for the client detail page and every data tab. Clients whose to-do panel already has data keep it
 * (Clint, Glen, Leo, Darrell, and the Respond forms), so the panel and the detail page show the same numbers (AC3,
 * AC4). Everyone else gets a profile generated from a seed of their id, shaped by their status: an At risk client
 * logs and trains less than an On track one. Figures are never typed into copy; `lib/client.ts` derives them.
 */

const FIRST_MONDAY = '2026-08-03';
const LAST_SUNDAY = addDays(DEMO_TODAY, -1);
const THIS_SUNDAY = addDays(DEMO_TODAY, 6);

/** Deterministic PRNG (mulberry32) seeded from a string, so a client's profile is the same on every load. */
export function random(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How each status behaves: share of days with food logged, calories as a share of target, sections completed. */
const BEHAVIOUR: Record<ClientStatus, { log: number; kcal: [number, number]; train: number; habit: number }> = {
  on_track: { log: 0.92, kcal: [0.95, 1.04], train: 0.93, habit: 0.85 },
  needs_attention: { log: 0.55, kcal: [0.78, 0.92], train: 0.68, habit: 0.5 },
  at_risk: { log: 0.18, kcal: [0.55, 0.75], train: 0.35, habit: 0.2 },
  no_activities: { log: 0, kcal: [0, 0], train: 0, habit: 0 },
};

const PROGRAMS = ['Strength Foundations', 'Hypertrophy Block Ph. 3', 'Lean Bulk', 'Fat Loss Phase 2', 'Run Ready 10K', 'Total Body Tone'];
const WORKOUTS = ['Upper body strength', 'Lower body strength', 'Conditioning', 'Full body circuit', 'Mobility + core'];
const PLANS = [
  [0, 2, 4],
  [0, 1, 3, 4],
  [0, 1, 3, 5],
  [1, 3, 5],
];
const HABITS: Omit<Habit, 'doneOn'>[] = [
  { name: 'Drink 2L water', frequency: 'daily' },
  { name: 'Morning stretch 10 min', frequency: 'daily' },
  { name: '8,000 steps', frequency: 'daily' },
  { name: 'Sleep 7+ hours', frequency: 'daily' },
  { name: 'Meal prep', frequency: 'weekly', perWeek: 2 },
];
const NOTE_TITLES = [
  'Prefers morning sessions',
  'Knee felt fine on squats',
  'Travelling for work this month',
  'Wants to try a new split',
  'Focus on form on deadlifts',
  'Increase protein at breakfast',
  'Asked about rest days',
  'Goal: first pull-up by December',
  'Stay consistent on weekends',
  'Prefers short check-in messages',
];
const CUSTOM_TASKS = ['Take progress photos', 'Weigh in', 'Watch the mobility video'];

const dates = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

function generateTraining(client: Client, rnd: () => number, b: (typeof BEHAVIOUR)[ClientStatus]): TrainingLog {
  const weeks = rnd() < 0.5 ? 8 : 12;
  // Program ending clients finish exactly when their card says; the rest are part-way through a longer block.
  const startsOn =
    client.programEndsInDays !== undefined
      ? addDays(DEMO_TODAY, client.programEndsInDays - weeks * 7 + 1)
      : addDays(DEMO_TODAY, -7 * (2 + Math.floor(rnd() * 4)));
  const endsOn = addDays(startsOn, weeks * 7 - 1);
  const plan = PLANS[Math.floor(rnd() * PLANS.length)];
  const days: Record<string, TrainingDay> = {};
  dates(FIRST_MONDAY, THIS_SUNDAY).forEach((date, i) => {
    if (date < startsOn || date > endsOn) return;
    const slot = plan.indexOf(i % 7);
    if (slot < 0) {
      days[date] = { kind: 'rest' };
      return;
    }
    const sections = 3 + Math.floor(rnd() * 2);
    let completed = 0;
    if (date < DEMO_TODAY) for (let s = 0; s < sections; s++) completed += rnd() < b.train ? 1 : 0;
    days[date] = { kind: 'workout', name: WORKOUTS[slot % WORKOUTS.length], sections, completed };
  });
  return { days, program: { name: PROGRAMS[Math.floor(rnd() * PROGRAMS.length)], startsOn, weeks } };
}

function generateNutrition(rnd: () => number, b: (typeof BEHAVIOUR)[ClientStatus]): NutritionLog {
  const target = 1800 + 100 * Math.floor(rnd() * 9);
  const protein = 120 + 5 * Math.floor(rnd() * 12);
  // Fat in steps of 4 g keeps 9 × fat divisible by 4, so the carb grams make the target exact.
  const fat = 60 + 4 * Math.floor(rnd() * 6);
  const carb = Math.round((target - protein * 4 - fat * 9) / 4);
  const log: NutritionLog = { targets: { carb, fat, protein }, days: {} };
  dates(FIRST_MONDAY, LAST_SUNDAY).forEach((date, i) => {
    if (rnd() >= b.log) return;
    const ratio = b.kcal[0] + rnd() * (b.kcal[1] - b.kcal[0]);
    log.days[date] = dayAt(Math.round(target * ratio), Math.round(protein * ratio), i);
  });
  return log;
}

function generateHabits(rnd: () => number, b: (typeof BEHAVIOUR)[ClientStatus]): Habit[] {
  const picks = [...HABITS].sort(() => rnd() - 0.5).slice(0, 2 + Math.floor(rnd() * 2));
  return picks.map((h) => {
    const p = h.frequency === 'daily' ? b.habit : b.habit * ((h.perWeek ?? 2) / 7);
    return { ...h, doneOn: dates(FIRST_MONDAY, LAST_SUNDAY).filter(() => rnd() < p) };
  });
}

function generateNotes(rnd: () => number): ClientNote[] {
  const count = 3 + Math.floor(rnd() * 5);
  const titles = [...NOTE_TITLES].sort(() => rnd() - 0.5).slice(0, count);
  return titles.map((title) => {
    const day = addDays(DEMO_TODAY, -1 - Math.floor(rnd() * 40));
    const hour = 7 + Math.floor(rnd() * 12);
    const minute = [0, 10, 25, 40, 55][Math.floor(rnd() * 5)];
    return { title, at: `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
  });
}

const stamp = (daysAgo: number, hour: number, minute = 0) =>
  `${addDays(DEMO_TODAY, -daysAgo)}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/**
 * The thread's recent shape, weighted by status: a check-in sent and awaiting a reply, messages left unanswered for
 * days, a recent reply, or a quiet thread whose last word was the client's.
 */
const THREAD_ODDS: Record<ClientStatus, { sent: number; silent: number; replied: number }> = {
  at_risk: { sent: 0.35, silent: 0.45, replied: 0.2 },
  needs_attention: { sent: 0.35, silent: 0.2, replied: 0.3 },
  on_track: { sent: 0.2, silent: 0, replied: 0.3 },
  no_activities: { sent: 0, silent: 0, replied: 0 },
};

function generateMessages(status: ClientStatus, rnd: () => number): ClientMessage[] {
  const odds = THREAD_ODDS[status];
  const roll = rnd();
  const minute = [5, 20, 35, 50][Math.floor(rnd() * 4)];
  // Every thread starts with an older exchange the client closed.
  const older: ClientMessage[] = [
    { from: 'coach', at: stamp(9 + Math.floor(rnd() * 4), 10, minute) },
    { from: 'client', at: stamp(7 + Math.floor(rnd() * 2), 19, minute) },
  ];
  if (roll < odds.sent) return [...older, { from: 'coach', at: stamp(1 + Math.floor(rnd() * 2), 9, minute), checkin: true }];
  if (roll < odds.sent + odds.silent) {
    const first = 3 + Math.floor(rnd() * 3);
    return [...older, { from: 'coach', at: stamp(first, 9, minute), checkin: true }, { from: 'coach', at: stamp(first - 2, 17, minute) }];
  }
  if (roll < odds.sent + odds.silent + odds.replied)
    return [...older, { from: 'coach', at: stamp(2, 9, minute), checkin: true }, { from: 'client', at: stamp(1, 14 + Math.floor(rnd() * 8), minute) }];
  return older;
}

/** The weekly check-in form, due on Sundays. At risk clients missed yesterday's. */
function weeklyForm(status: ClientStatus): AssignedForm {
  return status === 'at_risk'
    ? { name: 'Weekly Check-in', lastSubmittedOn: addDays(LAST_SUNDAY, -7), reviewed: true, overdueSince: LAST_SUNDAY }
    : { name: 'Weekly Check-in', lastSubmittedOn: LAST_SUNDAY, reviewed: true };
}

/** Last week's tasks: the three derived ones plus one the coach assigned by hand. */
function weekTasks(rnd: () => number, b: (typeof BEHAVIOUR)[ClientStatus]): ClientTask[] {
  const monday = addDays(DEMO_TODAY, -7);
  return [
    { kind: 'log_meals', dueOn: monday, time: '07:00' },
    { kind: 'workouts', dueOn: addDays(monday, 1) },
    { kind: 'custom', name: CUSTOM_TASKS[Math.floor(rnd() * CUSTOM_TASKS.length)], dueOn: addDays(monday, 4), done: rnd() < b.habit },
    { kind: 'checkin_form', dueOn: LAST_SUNDAY },
  ];
}

function generate(client: Client): ClientProfile {
  const rnd = random(client.id);
  const status = generatedStatus(client);
  const b = BEHAVIOUR[status];
  const nutrition = generateNutrition(rnd, b);
  const training = generateTraining(client, rnd, b);
  return {
    focus: b.log < b.train ? 'nutrition' : 'training',
    nutrition,
    training,
    forms: [weeklyForm(status)],
    tasks: weekTasks(rnd, b),
    habits: generateHabits(rnd, b),
    notes: generateNotes(rnd),
    messages: generateMessages(status, rnd),
  };
}

/** Aima: "No app activity, no workouts and no reply in 15 days" (her carried Check-in). */
function silenceSince(profile: ClientProfile, since: string): ClientProfile {
  const days = Object.fromEntries(
    Object.entries(profile.training.days).map(([date, day]) =>
      date >= since && day.kind === 'workout' ? [date, { ...day, completed: 0 }] : [date, day],
    ),
  );
  const food = Object.fromEntries(Object.entries(profile.nutrition.days).filter(([date]) => date < since));
  return {
    ...profile,
    training: { ...profile.training, days },
    nutrition: { ...profile.nutrition, days: food },
    habits: profile.habits.map((h) => ({ ...h, doneOn: h.doneOn.filter((d) => d < since) })),
    // The last form came in the Sunday before the silence.
    forms: profile.forms.map((f) => ({ ...f, lastSubmittedOn: addDays(since, -7) })),
    tasks: profile.tasks.map((t) => (t.kind === 'custom' ? { ...t, done: false } : t)),
  };
}

/** Clients whose to-do panel has data: the profile reuses it so both surfaces agree. */
function fromTodoDetails(client: Client, base: ClientProfile): ClientProfile {
  const t3 = todoDetails.t3 as CheckinDetail;
  const t4 = todoDetails.t4 as BuildDetail;
  const t7 = todoDetails.t7 as AcknowledgeDetail;
  const t8 = todoDetails.t8 as RemindDetail;
  const respond = (d: RespondDetail): AssignedForm[] => [{ name: d.form, lastSubmittedOn: d.submittedOn, reviewed: false }];
  switch (client.id) {
    case 'clint-jacobi':
      return {
        ...base,
        focus: t3.focus,
        nutrition: t3.nutrition,
        training: t3.training,
        forms: [{ name: 'Weekly Check-in', lastSubmittedOn: '2026-08-23', reviewed: true, overdueSince: t3.context.checkinFormDueOn }],
        notes: [
          { title: 'Travelling for work until mid-September', at: '2026-08-21T18:25' },
          { title: 'Hotel gym only: dumbbells up to 25 kg', at: '2026-08-21T18:40' },
          { title: 'Prefers short check-in messages', at: '2026-08-10T09:15' },
          { title: 'Goal: cut to 82 kg by October', at: '2026-07-13T10:00' },
        ],
      };
    case 'glen-johnson':
      return { ...base, focus: 'training', training: t4.training };
    case 'leo-midgett':
      return { ...base, focus: 'training', training: t8.training, nutrition: t8.nutrition, forms: t8.forms };
    case 'darrell-steward':
      return { ...base, focus: 'nutrition', training: t7.training, nutrition: t7.nutrition };
    case 'sidney-goyette-kihn':
      return { ...base, forms: respond(todoDetails.t2 as RespondDetail) };
    case 'jenny-wilson':
      return { ...base, forms: respond(todoDetails.p3 as RespondDetail) };
    case 'aima-ansari':
      // Last reply 16 days ago; the coach has written twice since without an answer.
      return {
        ...silenceSince(base, addDays(DEMO_TODAY, -15)),
        messages: [
          { from: 'coach', at: stamp(17, 10, 5) },
          { from: 'client', at: stamp(16, 18, 40) },
          { from: 'coach', at: stamp(15, 9, 20), checkin: true },
          { from: 'coach', at: stamp(8, 9, 20) },
        ],
      };
    default:
      return base;
  }
}

const cache = new Map<string, ClientProfile>();

export function getProfile(clientId: string): ClientProfile {
  let profile = cache.get(clientId);
  if (!profile) {
    const client = findPerson(clientId)!;
    profile = fromTodoDetails(client, generate(client));
    cache.set(clientId, profile);
  }
  return profile;
}
