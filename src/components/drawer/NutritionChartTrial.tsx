import { useState, useSyncExternalStore, type ReactNode } from 'react';
import tooltipArrow from '../../assets/figma/tooltip-arrow.svg';
import type { FoodEntry, MealKey, NutritionLog } from '../../data/types';
import { MEALS, addDays, foodCalories, weekdayLabel, type NutritionSummary } from '../../lib/checkin';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { CardHeader } from './NutritionTab';

/**
 * Meal Log chart trial (the user's call; no frame). Feedback: the blue shades for 1 / 2 / 3+ entries are hard to tell
 * apart, worse for colour-blind coaches, and reading a day takes a hover per cell. Each option answers with shape,
 * position and text rather than hue, and shows more without a hover. Built only with `VITE_CHART_TRIAL=1`; every
 * figure comes from the same log as the Macro card and the assessment.
 * - A · Daily calories: a bar per day against the calorie goal, and four meal dots (logged or not) under it.
 * - B · Calorie grid: the current grid, each cell the meal's calories or "–", a Total row marked against the goal and
 *   each meal's logged days by its label.
 * - C · Summary first: three figures (days logged, average against goal, the meal logged least), the days as tiles,
 *   and a click on a day lists its meals underneath.
 */
export type MealOption = 'current' | 'bars' | 'grid' | 'summary';

export const MEAL_OPTIONS: { key: MealOption; label: string; hint: string }[] = [
  { key: 'current', label: 'Current', hint: 'The Meal Log as it is now: entries per meal in four blue shades' },
  { key: 'bars', label: 'A · Daily calories', hint: 'Has the client eaten enough? A bar per day against the goal; meal dots show what was logged' },
  { key: 'grid', label: 'B · Calorie grid', hint: 'The current grid in calories, with a Total row against the goal and each meal’s logged days' },
  { key: 'summary', label: 'C · Summary first', hint: 'Three figures up top, the days as tiles; click a day to read its meals' },
];

const KEY = 'cid-meal-option';
const read = (): MealOption => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'bars' || v === 'grid' || v === 'summary' ? v : 'current';
  } catch {
    return 'current';
  }
};
let current: MealOption = read();
const listeners = new Set<() => void>();
export function setMealOption(v: MealOption) {
  current = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Private windows: the pick lasts for the page only.
  }
  listeners.forEach((l) => l());
}
export const useMealOption = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );

/** Within this share of the calorie goal a day counts as on goal (the demo's assumption; no spec sets it). */
const GOAL_BAND = 0.1;

interface MealDay {
  date: string;
  /** Today and later have not finished. */
  upcoming: boolean;
  logged: boolean;
  kcal: number;
  meals: Record<MealKey, { foods: FoodEntry[]; kcal: number }>;
  /** Against the goal: under, on (within GOAL_BAND) or over; null when nothing was logged. */
  vsGoal: 'under' | 'on' | 'over' | null;
}

function mealDay(log: NutritionLog, date: string, today: string, goal: number): MealDay {
  const meals = Object.fromEntries(
    MEALS.map((m) => {
      const foods = log.days[date]?.[m.key] ?? [];
      return [m.key, { foods, kcal: foods.reduce((s, f) => s + foodCalories(f), 0) }];
    }),
  ) as MealDay['meals'];
  const kcal = MEALS.reduce((s, m) => s + meals[m.key].kcal, 0);
  const upcoming = date >= today;
  const logged = !upcoming && MEALS.some((m) => meals[m.key].foods.length > 0);
  const share = kcal / goal;
  const vsGoal = !logged ? null : share < 1 - GOAL_BAND ? 'under' : share > 1 + GOAL_BAND ? 'over' : 'on';
  return { date, upcoming, logged, kcal, meals, vsGoal };
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const dayNum = (d: string) => parseDay(d).getUTCDate();

/** The two weeks the current Meal Log shows, as days. */
function useWeeks(log: NutritionLog, summary: NutritionSummary) {
  const today = addDays(summary.window.end, 1);
  const goal = summary.targetCalories;
  const weeks = summary.weeks.map((w) => ({ ...w, days: w.dates.map((d) => mealDay(log, d, today, goal)) }));
  return { today, goal, weeks };
}

const weekRange = (dates: string[]) => {
  const start = parseDay(dates[0]);
  const end = parseDay(dates[6]);
  return end.getUTCMonth() === start.getUTCMonth() ? `${formatMonthDay(start)} - ${end.getUTCDate()}` : `${formatMonthDay(start)} - ${formatMonthDay(end)}`;
};

/** The card around every option, with the current summary rows at the bottom. */
function MealCard({ summary, children }: { summary: NutritionSummary; children: ReactNode }) {
  return (
    <div data-meal-card className="flex flex-col rounded-lg border border-ink/10 bg-elevated p-px shadow-card">
      <CardHeader title="Meal Log" link="View food log" />
      {children}
      <div className="flex flex-col px-4 pb-4 pt-1 text-[13px] leading-[18px] text-ink">
        {[
          [`Days logged (${summary.window.label})`, `${summary.daysLogged} of 7 days · ${summary.mealsLogged} entries`],
          ['Avg calories (logged days)', summary.daysLogged ? `${fmt(summary.avgCalories)} of ${fmt(summary.targetCalories)} Cal` : 'Nothing logged'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline border-t border-ink/10 px-1 pb-2.5 pt-[11px]">
            <span className="w-[200px] shrink-0">{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A day's meals, each with its foods and calories: the hover on A, the cell hover on B, the panel on C. */
function DayMeals({ day, only }: { day: MealDay; only?: MealKey }) {
  return (
    <div className="flex flex-col gap-2">
      {MEALS.filter((m) => !only || m.key === only).map((m) => {
        const meal = day.meals[m.key];
        return (
          <div key={m.key} className="flex flex-col gap-0.5">
            <p className="flex justify-between gap-4 whitespace-nowrap text-[12px] font-semibold uppercase leading-[18px] text-ink-tertiary">
              {m.label}
              <span className="normal-case tabular-nums">{meal.foods.length ? `${fmt(meal.kcal)} Cal` : 'Not logged'}</span>
            </p>
            {meal.foods.map((f) => (
              <p key={f.name} className="flex justify-between gap-4 whitespace-nowrap text-[13px] leading-[1.4] text-ink">
                <span>{f.name}</span>
                <span className="text-ink-tertiary tabular-nums">{foodCalories(f)} Cal</span>
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** The current log's white hover card, over the cell or bar. */
function HoverCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 flex-col items-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.2)] group-hover/cell:flex group-focus/cell:flex">
      <div className="flex min-w-[200px] flex-col gap-1.5 rounded-lg bg-white px-3 pb-2.5 pt-2 text-left">
        <p className="text-[13px] font-semibold leading-[1.5] text-ink">{title}</p>
        {children}
      </div>
      <img src={tooltipArrow} alt="" width={10} height={5} />
    </div>
  );
}

/** Against the goal in words and a glyph, so it never rests on colour alone. */
const VS_GOAL = {
  under: { glyph: '↓', word: 'Under goal' },
  on: { glyph: '✓', word: 'On goal' },
  over: { glyph: '↑', word: 'Over goal' },
} as const;

/* ---------------------------------- A · Daily calories ---------------------------------- */

const BAR_H = 88;
/** The bar scale tops out at 130 % of the goal; the goal line sits at 100 %. */
const SCALE = 1.3;

function DailyCalories({ log, summary }: { log: NutritionLog; summary: NutritionSummary }) {
  const { today, goal, weeks } = useWeeks(log, summary);
  const columns = weeks.map(() => 'repeat(7, minmax(0, 1fr))').join(' 17px ');
  const firstCol = (w: number) => 2 + w * 8;
  const goalY = BAR_H * (1 / SCALE);
  return (
    <MealCard summary={summary}>
      <div className="grid gap-x-1 px-5 pb-3 pt-4" style={{ gridTemplateColumns: `68px ${columns}` }}>
        {weeks.map((week, w) => (
          <p key={`t-${week.start}`} className="pb-3 text-center text-[13px] font-semibold leading-[18px] text-ink" style={{ gridColumn: `${firstCol(w)} / span 7`, gridRow: 1 }}>
            {weekRange(week.dates)}
            {week.isCurrent && <span className="font-normal"> (This week)</span>}
          </p>
        ))}
        {weeks.slice(1).map((week, w) => (
          <span key={`div-${week.start}`} aria-hidden className="mx-auto w-px bg-line" style={{ gridColumn: firstCol(w + 1) - 1, gridRow: '1 / span 4' }} />
        ))}
        {/* The goal: a label on the left, a dashed line across both weeks. */}
        <div className="relative" style={{ gridColumn: 1, gridRow: 2, height: BAR_H }}>
          <span className="absolute right-1 -translate-y-1/2 text-right text-[11px] font-semibold leading-[14px] text-ink-tertiary" style={{ bottom: goalY - 7 }}>
            Goal
            <br />
            <span className="font-normal tabular-nums">{fmt(goal)}</span>
          </span>
        </div>
        <div aria-hidden className="pointer-events-none relative" style={{ gridColumn: `2 / -1`, gridRow: 2, height: BAR_H }}>
          <span className="absolute inset-x-0 border-t border-dashed border-ink-tertiary/60" style={{ bottom: goalY }} />
        </div>
        {weeks.map((week, w) =>
          week.days.map((day, i) => {
            const h = Math.min(1, day.kcal / goal / SCALE) * BAR_H;
            return (
              <div
                key={`bar-${day.date}`}
                tabIndex={day.logged ? 0 : undefined}
                aria-label={day.logged ? `${weekdayLabel(day.date)}: ${fmt(day.kcal)} Cal, ${VS_GOAL[day.vsGoal!].word.toLowerCase()}` : undefined}
                className="group/cell relative flex flex-col items-center justify-end outline-none"
                style={{ gridColumn: firstCol(w) + i, gridRow: 2, height: BAR_H }}
              >
                {day.logged ? (
                  <>
                    <span className="mb-0.5 text-[10px] font-semibold leading-3 text-ink tabular-nums">{day.kcal >= 1000 ? `${(day.kcal / 1000).toFixed(1)}k` : fmt(day.kcal)}</span>
                    <span className="w-[18px] rounded-t-[4px] bg-brand transition-opacity group-hover/cell:opacity-80" style={{ height: h }} />
                    <HoverCard title={`${weekdayLabel(day.date)} · ${fmt(day.kcal)} Cal`}>
                      <p className="text-[12px] leading-4 text-ink-tertiary">
                        {VS_GOAL[day.vsGoal!].word} ({Math.round((day.kcal / goal) * 100)}% of {fmt(goal)})
                      </p>
                      <DayMeals day={day} />
                    </HoverCard>
                  </>
                ) : day.upcoming ? (
                  <span className="h-6 w-[18px] rounded-t-[4px] border border-b-0 border-dashed border-ink-muted/50" />
                ) : (
                  <span className="pb-1 text-[11px] leading-3 text-ink-tertiary">–</span>
                )}
              </div>
            );
          }),
        )}
        {/* Baseline, then the dates. */}
        <span aria-hidden className="h-px bg-line" style={{ gridColumn: '2 / -1', gridRow: 3 }} />
        {weeks.map((week, w) =>
          week.days.map((day, i) => (
            <span key={`d-${day.date}`} className="flex h-6 items-center justify-center text-[12px] text-ink-secondary tabular-nums" style={{ gridColumn: firstCol(w) + i, gridRow: 4 }}>
              {day.date === today ? <span className="flex size-5 items-center justify-center rounded-full bg-brand-subtle font-semibold text-brand">{dayNum(day.date)}</span> : dayNum(day.date)}
            </span>
          )),
        )}
        {/* Which meals were logged: a filled dot, or an empty ring. */}
        {MEALS.map((m, r) => (
          <span key={`l-${m.key}`} className="flex h-4 items-center text-[10px] font-semibold uppercase leading-none text-ink-tertiary" style={{ gridColumn: 1, gridRow: 5 + r }}>
            {m.label}
          </span>
        ))}
        {MEALS.map((m, r) =>
          weeks.map((week, w) =>
            week.days.map((day, i) => (
              <span key={`${m.key}-${day.date}`} className="flex h-4 items-center justify-center" style={{ gridColumn: firstCol(w) + i, gridRow: 5 + r }}>
                {day.upcoming ? null : day.meals[m.key].foods.length ? (
                  <span className="size-2 rounded-full bg-brand" />
                ) : (
                  <span className="size-2 rounded-full border border-ink-muted" />
                )}
              </span>
            )),
          ),
        )}
      </div>
      <div className="flex items-center justify-center gap-4 px-4 pb-3 text-[12px] leading-[18px] text-ink">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-brand" /> Meal logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full border border-ink-muted" /> Not logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-ink-tertiary/60" /> Calorie goal
        </span>
      </div>
    </MealCard>
  );
}

/* ---------------------------------- B · Calorie grid ---------------------------------- */

function CalorieGrid({ log, summary }: { log: NutritionLog; summary: NutritionSummary }) {
  const { today, goal, weeks } = useWeeks(log, summary);
  const columns = weeks.map(() => 'repeat(7, minmax(0, 1fr))').join(' 17px ');
  const firstCol = (w: number) => 2 + w * 8;
  // Each meal's logged days over the summary's 7 days.
  const window = Array.from({ length: 7 }, (_, i) => mealDay(log, addDays(summary.window.start, i), today, goal));
  const loggedDays = (k: MealKey) => window.filter((d) => d.meals[k].foods.length > 0).length;
  const rows = MEALS.length + 1;
  return (
    <MealCard summary={summary}>
      <div className="grid gap-1 px-5 pb-3 pt-4" style={{ gridTemplateColumns: `76px ${columns}` }}>
        {weeks.map((week, w) => (
          <p key={`t-${week.start}`} className="pb-2 text-center text-[13px] font-semibold leading-[18px] text-ink" style={{ gridColumn: `${firstCol(w)} / span 7`, gridRow: 1 }}>
            {weekRange(week.dates)}
            {week.isCurrent && <span className="font-normal"> (This week)</span>}
          </p>
        ))}
        {weeks.slice(1).map((week, w) => (
          <span key={`div-${week.start}`} aria-hidden className="mx-auto w-px bg-line" style={{ gridColumn: firstCol(w + 1) - 1, gridRow: `1 / span ${rows + 2}` }} />
        ))}
        {weeks.map((week, w) =>
          week.days.map((day, i) => (
            <span key={`d-${day.date}`} className="flex h-5 items-center justify-center text-[12px] text-ink-secondary tabular-nums" style={{ gridColumn: firstCol(w) + i, gridRow: 2 }}>
              {day.date === today ? <span className="flex size-5 items-center justify-center rounded-full bg-brand-subtle font-semibold text-brand">{dayNum(day.date)}</span> : dayNum(day.date)}
            </span>
          )),
        )}
        {MEALS.map((m, r) => (
          <span key={`l-${m.key}`} className="flex flex-col justify-center" style={{ gridColumn: 1, gridRow: 3 + r }}>
            <span className="text-[11px] font-semibold uppercase leading-[14px] text-ink-tertiary">{m.label}</span>
            <span className="text-[11px] leading-[14px] text-ink-secondary tabular-nums">{loggedDays(m.key)}/7 days</span>
          </span>
        ))}
        <span className="flex items-center text-[11px] font-semibold uppercase leading-[14px] text-ink" style={{ gridColumn: 1, gridRow: 3 + MEALS.length }}>
          Total
        </span>
        {MEALS.map((m, r) =>
          weeks.map((week, w) =>
            week.days.map((day, i) => {
              const meal = day.meals[m.key];
              return (
                <div key={`${m.key}-${day.date}`} className="flex" style={{ gridColumn: firstCol(w) + i, gridRow: 3 + r }}>
                  {day.upcoming ? (
                    <span className="h-9 flex-1 rounded-[4px] border border-dashed border-line-light" />
                  ) : (
                    <span
                      tabIndex={0}
                      className={`group/cell relative flex h-9 min-w-0 flex-1 items-center justify-center rounded-[4px] text-[11px] leading-none tabular-nums outline-none ${
                        meal.foods.length ? 'bg-brand-subtle font-semibold text-brand' : 'bg-black/[0.04] text-ink-muted'
                      }`}
                    >
                      {meal.foods.length ? fmt(meal.kcal) : '–'}
                      <HoverCard title={`${m.label} · ${weekdayLabel(day.date)}`}>
                        <DayMeals day={day} only={m.key} />
                      </HoverCard>
                    </span>
                  )}
                </div>
              );
            }),
          ),
        )}
        {weeks.map((week, w) =>
          week.days.map((day, i) => (
            <div
              key={`tot-${day.date}`}
              className="flex h-10 flex-col items-center justify-center border-t border-ink/15 text-[11px] leading-[14px] tabular-nums"
              style={{ gridColumn: firstCol(w) + i, gridRow: 3 + MEALS.length }}
              title={day.vsGoal ? `${VS_GOAL[day.vsGoal].word}: ${Math.round((day.kcal / goal) * 100)}% of ${fmt(goal)} Cal` : undefined}
            >
              {day.upcoming ? null : day.logged ? (
                <>
                  <span className="font-semibold text-ink">{fmt(day.kcal)}</span>
                  <span className={day.vsGoal === 'on' ? 'text-brand' : 'text-ink-secondary'}>
                    {VS_GOAL[day.vsGoal!].glyph} {Math.round((day.kcal / goal) * 100)}%
                  </span>
                </>
              ) : (
                <span className="text-ink-muted">–</span>
              )}
            </div>
          )),
        )}
      </div>
      <div className="flex items-center justify-center gap-4 px-4 pb-3 text-[12px] leading-[18px] text-ink">
        <span className="flex items-center gap-1.5">
          <span className="rounded-[3px] bg-brand-subtle px-1 text-[10px] font-semibold text-brand">420</span> Calories logged
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-[3px] bg-black/[0.04] px-1.5 text-[10px] text-ink-muted">–</span> Not logged
        </span>
        <span className="text-ink-secondary">
          Total: ↓ under · ✓ on · ↑ over the {fmt(goal)} Cal goal (±{GOAL_BAND * 100}%)
        </span>
      </div>
    </MealCard>
  );
}

/* ---------------------------------- C · Summary first ---------------------------------- */

function Figure({ label, value, sub }: { label: string; value: ReactNode; sub: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg bg-surface-secondary px-3 py-2.5">
      <span className="text-[12px] leading-4 text-ink-tertiary">{label}</span>
      <span className="text-[15px] font-semibold leading-5 text-ink tabular-nums">{value}</span>
      <span className="text-[12px] leading-4 text-ink-secondary">{sub}</span>
    </div>
  );
}

function SummaryFirst({ log, summary }: { log: NutritionLog; summary: NutritionSummary }) {
  const { today, goal, weeks } = useWeeks(log, summary);
  const all = weeks.flatMap((w) => w.days);
  const window = all.filter((d) => d.date >= summary.window.start && d.date <= summary.window.end);
  const byMeal = MEALS.map((m) => ({ ...m, days: window.filter((d) => d.meals[m.key].foods.length > 0).length }));
  const fewest = Math.min(...byMeal.map((m) => m.days));
  const least = byMeal.filter((m) => m.days === fewest);
  const evenly = least.length === byMeal.length;
  const lastLogged = [...all].reverse().find((d) => d.logged);
  const [picked, setPicked] = useState<string | null>(lastLogged?.date ?? null);
  const day = all.find((d) => d.date === picked);
  const share = summary.daysLogged ? Math.round((summary.avgCalories / goal) * 100) : null;
  return (
    <MealCard summary={summary}>
      <div className="flex gap-2 px-5 pt-4">
        <Figure label="Days logged" value={`${summary.daysLogged} of 7`} sub={summary.window.label} />
        <Figure
          label="Avg calories (logged days)"
          value={summary.daysLogged ? `${fmt(summary.avgCalories)} / ${fmt(goal)}` : '–'}
          sub={share === null ? 'Nothing logged' : `${share}% of goal`}
        />
        <Figure
          label="Meal logged least"
          value={!summary.daysLogged ? '–' : evenly ? (fewest === 7 ? 'None' : 'All alike') : least.map((m) => m.label).join(', ')}
          sub={!summary.daysLogged ? 'Nothing logged' : evenly ? `Every meal on ${fewest} of 7 days` : `${fewest} of 7 days`}
        />
      </div>
      <div className="flex flex-col items-center gap-1 px-5 pt-4">
        <div className="grid w-full grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase leading-[18px] text-ink-tertiary">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week.start} className="grid w-full grid-cols-7 gap-1">
            {week.days.map((d) => {
              const count = MEALS.filter((m) => d.meals[m.key].foods.length > 0).length;
              const isToday = d.date === today;
              const on = picked === d.date;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={d.upcoming && !isToday}
                  onClick={() => setPicked(d.date)}
                  aria-pressed={on}
                  className={`flex h-[60px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border text-[12px] leading-4 transition-shadow ${
                    on ? 'ring-2 ring-brand ring-offset-1' : ''
                  } ${
                    d.upcoming
                      ? isToday
                        ? 'border-brand bg-white'
                        : 'cursor-default border-dashed border-ink-muted/40 bg-white'
                      : d.logged
                        ? 'border-transparent bg-brand-subtle hover:ring-2 hover:ring-brand/30'
                        : 'border-line bg-white hover:ring-2 hover:ring-black/10'
                  }`}
                >
                  <span className={isToday ? 'font-semibold text-brand' : 'text-ink'}>{String(dayNum(d.date)).padStart(2, '0')}</span>
                  {d.upcoming ? (
                    <span className={`text-[11px] ${isToday ? 'font-semibold text-brand' : 'text-ink-secondary'}`}>{isToday ? 'Today' : 'Upcoming'}</span>
                  ) : d.logged ? (
                    <>
                      <span className="flex gap-0.5" aria-label={`${count} of 4 meals`}>
                        {MEALS.map((m) => (
                          <span key={m.key} className={`h-1.5 w-2 rounded-full ${d.meals[m.key].foods.length ? 'bg-brand' : 'border border-brand/40'}`} />
                        ))}
                      </span>
                      <span className="text-[11px] font-semibold text-ink tabular-nums">{fmt(d.kcal)}</span>
                    </>
                  ) : (
                    <span className="text-[11px] text-ink-tertiary">No log</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mx-5 mb-3 mt-3 rounded-lg border border-line bg-white px-3 py-2.5">
        {day && day.logged ? (
          <>
            <p className="mb-2 flex items-baseline justify-between text-[13px] font-semibold leading-[18px] text-ink">
              {weekdayLabel(day.date)}
              <span className="font-normal text-ink-secondary tabular-nums">
                {fmt(day.kcal)} of {fmt(goal)} Cal · {VS_GOAL[day.vsGoal!].word.toLowerCase()}
              </span>
            </p>
            <div className="grid grid-cols-2 gap-x-6">
              <DayMeals day={day} only="breakfast" />
              <DayMeals day={day} only="lunch" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-6">
              <DayMeals day={day} only="dinner" />
              <DayMeals day={day} only="snack" />
            </div>
          </>
        ) : (
          <p className="text-[13px] leading-[18px] text-ink-tertiary">
            {day ? (day.upcoming ? `Nothing logged yet today.` : `Nothing logged on ${weekdayLabel(day.date)}.`) : 'Pick a day to see its meals.'}
          </p>
        )}
      </div>
    </MealCard>
  );
}

/** The Meal Log in the picked option. */
export function MealLogOption({ option, log, summary }: { option: Exclude<MealOption, 'current'>; log: NutritionLog; summary: NutritionSummary }) {
  if (option === 'bars') return <DailyCalories log={log} summary={summary} />;
  if (option === 'grid') return <CalorieGrid log={log} summary={summary} />;
  return <SummaryFirst log={log} summary={summary} />;
}
