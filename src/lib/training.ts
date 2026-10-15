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
  /** Days since the most recent workout with any section done, or null when there is none. */
  lastWorkoutDaysAgo: number | null;
  lastWorkout: (Extract<TrainingDay, { kind: 'workout' }> & { date: string }) | null;
  /** Share of scheduled sections completed in the 14 days before today. */
  adherence2w: number | null;
  /** The four finished weeks before this one, oldest first. */
  trend: { label: string; pct: number | null }[];
  adherence4w: number | null;
  program: { name: string; week: number; weeks: number; endsOn: string; endsInDays: number; nextProgram?: string };
}

function cellState(day: TrainingDay | undefined, date: string, today: string): SessionState {
  if (!day || day.kind === 'rest') return 'rest';
  if (day.kind === 'paused') return 'paused';
  if (date === today) return 'today';
  if (date > today) return 'upcoming';
  if (day.completed >= day.sections) return 'completed';
  return day.completed === 0 ? 'missed' : 'partial';
}

/** Completed sections over scheduled sections for finished days in [start, end]. */
function adherence(log: TrainingLog, start: string, end: string) {
  let done = 0;
  let planned = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const day = log.days[d];
    if (day?.kind === 'workout') {
      done += day.completed;
      planned += day.sections;
    }
  }
  return planned ? Math.round((done / planned) * 100) : null;
}

export function summarizeTraining(log: TrainingLog, today: string): TrainingSummary {
  const thisMonday = mondayOf(today);
  const weeks = [addDays(thisMonday, -7), thisMonday].map((monday) =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const day = log.days[date];
      return { date, state: cellState(day, date, today), assigned: Boolean(day), day: day?.kind === 'workout' ? day : undefined };
    }),
  );

  const past = Object.keys(log.days)
    .filter((d) => d < today)
    .sort()
    .reverse();
  const last = past.find((d) => {
    const day = log.days[d];
    return day.kind === 'workout' && day.completed > 0;
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
