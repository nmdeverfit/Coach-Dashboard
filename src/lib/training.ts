import type { TrainingDay, TrainingLog } from '../data/types';
import { daysBetween, formatMonthDay, parseDay } from './dates';

const DAY_MS = 86_400_000;
const addDays = (iso: string, n: number) => new Date(parseDay(iso).getTime() + n * DAY_MS).toISOString().slice(0, 10);
const mondayOf = (iso: string) => addDays(iso, -((parseDay(iso).getUTCDay() + 6) % 7));

/** The six session-log cell states from the design, plus "today". */
export type SessionState = 'completed' | 'partial' | 'missed' | 'rest' | 'today' | 'upcoming' | 'paused';

export interface SessionCell {
  date: string;
  state: SessionState;
  /** False when the date has no entry at all: nothing was assigned that day. */
  assigned: boolean;
  day?: Extract<TrainingDay, { kind: 'workout' }>;
}

export interface TrainingSummary {
  /** Last week and this week, Monday first. */
  weeks: SessionCell[][];
  rangeLabel: string;
  /** Days since the most recent training day with any workout done, or null when there is none. */
  lastWorkoutDaysAgo: number | null;
  lastWorkout: (Extract<TrainingDay, { kind: 'workout' }> & { date: string }) | null;
  /** Share of assigned workouts completed in the 14 days before today. */
  adherence2w: number | null;
  /** The four finished weeks before this one, oldest first. */
  trend: { label: string; pct: number | null }[];
  adherence4w: number | null;
  program: { name: string; week: number; weeks: number; endsOn: string; endsInDays: number; nextProgram?: string };
}

type WorkoutDay = Extract<TrainingDay, { kind: 'workout' }>;

/** Workouts done and assigned on a training day. */
export const doneOf = (day: WorkoutDay) => day.workouts.filter((w) => w.done).length;

function cellState(day: TrainingDay | undefined, date: string, today: string): SessionState {
  if (!day || day.kind === 'rest') return 'rest';
  if (day.kind === 'paused') return 'paused';
  if (date === today) return 'today';
  if (date > today) return 'upcoming';
  const done = doneOf(day);
  if (done >= day.workouts.length) return 'completed';
  return done === 0 ? 'missed' : 'partial';
}

/** Workouts completed and assigned on training days in [start, end]. */
export function workoutCounts(log: TrainingLog, start: string, end: string) {
  let done = 0;
  let planned = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const day = log.days[d];
    if (day?.kind === 'workout') {
      done += doneOf(day);
      planned += day.workouts.length;
    }
  }
  return { done, planned };
}

/** Completed workouts over assigned workouts for finished days in [start, end]. */
function adherence(log: TrainingLog, start: string, end: string) {
  const { done, planned } = workoutCounts(log, start, end);
  return planned ? Math.round((done / planned) * 100) : null;
}

/** One session-log week, Monday first. */
function weekCells(log: TrainingLog, monday: string, today: string): SessionCell[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const day = log.days[date];
    return { date, state: cellState(day, date, today), assigned: Boolean(day), day: day?.kind === 'workout' ? day : undefined };
  });
}

/**
 * Training chart trial: the last `count` weeks, oldest first, this week last, each with its cells and its finished
 * days' workouts done / assigned (adherence is null while nothing of the week is finished).
 */
export function sessionWeeks(log: TrainingLog, today: string, count: number) {
  const thisMonday = mondayOf(today);
  return Array.from({ length: count }, (_, i) => {
    const monday = addDays(thisMonday, -7 * (count - 1 - i));
    const sunday = addDays(monday, 6);
    const end = sunday < today ? sunday : addDays(today, -1);
    const counts = end >= monday ? workoutCounts(log, monday, end) : { done: 0, planned: 0 };
    return {
      monday,
      sunday,
      cells: weekCells(log, monday, today),
      ...counts,
      pct: counts.planned ? Math.round((counts.done / counts.planned) * 100) : null,
    };
  });
}

export function summarizeTraining(log: TrainingLog, today: string): TrainingSummary {
  const thisMonday = mondayOf(today);
  const weeks = [addDays(thisMonday, -7), thisMonday].map((monday) => weekCells(log, monday, today));

  const past = Object.keys(log.days)
    .filter((d) => d < today)
    .sort()
    .reverse();
  const last = past.find((d) => {
    const day = log.days[d];
    return day.kind === 'workout' && doneOf(day) > 0;
  });

  const trendStarts = [4, 3, 2, 1].map((n) => addDays(thisMonday, -7 * n));
  const { program } = log;
  const lastDate = last ? log.days[last] : undefined;
  const endsOn = addDays(program.startsOn, program.weeks * 7 - 1);
  const first = parseDay(weeks[0][0].date);
  const lastDay = parseDay(weeks[1][6].date);

  return {
    weeks,
    rangeLabel: `${formatMonthDay(first)} - ${formatMonthDay(lastDay).replace(/ (\d)$/, ' 0$1')}`,
    lastWorkoutDaysAgo: last ? daysBetween(last, today) : null,
    lastWorkout: last && lastDate?.kind === 'workout' ? { date: last, ...lastDate } : null,
    adherence2w: adherence(log, addDays(today, -14), addDays(today, -1)),
    trend: trendStarts.map((start, i) => ({ label: `W${i + 1}`, pct: adherence(log, start, addDays(start, 6)) })),
    adherence4w: adherence(log, trendStarts[0], addDays(thisMonday, -1)),
    program: {
      name: program.name,
      week: Math.min(program.weeks, Math.floor(daysBetween(program.startsOn, today) / 7) + 1),
      weeks: program.weeks,
      endsOn,
      endsInDays: daysBetween(today, endsOn),
      nextProgram: program.nextProgram,
    },
  };
}
