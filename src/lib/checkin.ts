import type { CheckinDetail, FoodEntry, MacroKey, MealKey, NutritionLog } from '../data/types';
import { formatMonthDay, parseDay } from './dates';

export const MEALS: { key: MealKey; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

const MACROS: { key: MacroKey; label: string; kcalPerGram: number }[] = [
  { key: 'carb', label: 'Carb', kcalPerGram: 4 },
  { key: 'fat', label: 'Fat', kcalPerGram: 9 },
  { key: 'protein', label: 'Protein', kcalPerGram: 4 },
];

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const addDays = (iso: string, n: number) => new Date(parseDay(iso).getTime() + n * DAY_MS).toISOString().slice(0, 10);
const mondayOf = (iso: string) => addDays(iso, -((parseDay(iso).getUTCDay() + 6) % 7));
const num = (n: number) => Math.round(n).toLocaleString('en-US');
export const weekdayLabel = (iso: string) => `${WEEKDAYS[parseDay(iso).getUTCDay()]}, ${formatMonthDay(parseDay(iso))}`;

export const foodCalories = (f: FoodEntry) => Math.round(MACROS.reduce((sum, m) => sum + f[m.key] * m.kcalPerGram, 0));

export interface WeekGridData {
  start: string;
  isCurrent: boolean;
  /** Days of the week (Monday first) as YYYY-MM-DD. */
  dates: string[];
  /** Entries logged per meal and day; null marks a day that has not finished yet. */
  counts: Record<MealKey, (number | null)[]>;
}

export interface NutritionSummary {
  /** The 7 finished days the summary covers: the 7 days before today. */
  window: { start: string; end: string; label: string };
  daysLogged: number;
  mealsLogged: number;
  /** Averages over logged days only. */
  avgCalories: number;
  targetCalories: number;
  calorieGap: number;
  macros: { key: MacroKey; label: string; value: number; target: number }[];
  weeks: WeekGridData[];
}

export function summarizeNutrition(log: NutritionLog, today: string): NutritionSummary {
  const end = addDays(today, -1);
  const start = addDays(today, -7);
  const windowDates = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const loggedDates = windowDates.filter((d) => Object.values(log.days[d] ?? {}).some((foods) => foods && foods.length > 0));
  const foodsIn = (d: string) => Object.values(log.days[d] ?? {}).flat() as FoodEntry[];
  const windowFoods = windowDates.flatMap(foodsIn);
  const perLoggedDay = (total: number) => (loggedDates.length ? total / loggedDates.length : 0);

  const targetCalories = MACROS.reduce((sum, m) => sum + log.targets[m.key] * m.kcalPerGram, 0);
  const avgCalories = Math.round(perLoggedDay(windowFoods.reduce((sum, f) => sum + foodCalories(f), 0)));

  const thisMonday = mondayOf(today);
  const weeks = [addDays(thisMonday, -7), thisMonday].map((weekStart) => {
    const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const counts = Object.fromEntries(
      MEALS.map((m) => [m.key, dates.map((d) => (d >= today ? null : (log.days[d]?.[m.key]?.length ?? 0)))]),
    ) as Record<MealKey, (number | null)[]>;
    return { start: weekStart, isCurrent: weekStart === thisMonday, dates, counts };
  });

  const startDay = parseDay(start);
  const endDay = parseDay(end);
  const label =
    startDay.getUTCMonth() === endDay.getUTCMonth() ? `${formatMonthDay(startDay)} - ${endDay.getUTCDate()}` : `${formatMonthDay(startDay)} - ${formatMonthDay(endDay)}`;

  return {
    window: { start, end, label },
    daysLogged: loggedDates.length,
    mealsLogged: windowFoods.length,
    avgCalories,
    targetCalories,
    calorieGap: Math.max(0, targetCalories - avgCalories),
    macros: MACROS.map((m) => ({
      key: m.key,
      label: m.label,
      value: Math.round(perLoggedDay(windowFoods.reduce((sum, f) => sum + f[m.key], 0))),
      target: log.targets[m.key],
    })),
    weeks,
  };
}

export interface CheckinView {
  summary: NutritionSummary;
  /** The greyed "why" on the to-do row. */
  rowReason: string;
  /** One-line status explanation beside the status label. */
  statusLine: string;
  assessment: { headline: { before: string; signal: string; after: string }; bullets: string[] };
}

/** Builds every sentence the Check-in to-do shows from one computed summary, so none can contradict another. */
export function buildCheckinView(detail: CheckinDetail, today: string): CheckinView {
  const s = summarizeNutrition(detail.nutrition, today);
  const protein = s.macros.find((m) => m.key === 'protein')!;
  const dayWord = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

  const bullets = [
    `${s.daysLogged}/7 days logged (${s.mealsLogged} meals) from ${s.window.label}; logged days averaged ${num(s.avgCalories)} kcal against a ${num(s.targetCalories)} kcal target.`,
    `Protein averaged ${protein.value}g of ${protein.target}g (${Math.round((protein.value / protein.target) * 100)}%) on logged days.`,
  ];
  if (detail.context.checkinFormDueOn) {
    bullets.push(`The weekly check-in form was due ${weekdayLabel(detail.context.checkinFormDueOn)} and has not been submitted.`);
  }
  if (detail.context.note) {
    bullets.push(`Coach notes from ${formatMonthDay(parseDay(detail.context.note.on))}: ${detail.context.note.summary}.`);
  }

  return {
    summary: s,
    rowReason: `Only ${s.daysLogged} of 7 days logged last week, and logged days averaged ${num(s.calorieGap)} kcal under target.`,
    statusLine: `${s.daysLogged} of 7 days with a logged meal last week. Logged days averaged ${num(s.avgCalories)} kcal against a ${num(s.targetCalories)} kcal target`,
    assessment: {
      headline: {
        before: 'Current',
        signal: 'nutrition',
        after: `signals are poor: meals were logged on only ${dayWord(s.daysLogged)} of the last 7, and logged days came in ${num(s.calorieGap)} kcal under target.`,
      },
      bullets,
    },
  };
}
