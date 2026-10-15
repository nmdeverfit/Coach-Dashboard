import calorieChart from '../../assets/figma/chart-calories.svg';
import iconExpandArrow from '../../assets/figma/icon-expand-arrow.svg';
import legendNotLogged from '../../assets/figma/legend-not-logged.svg';
import tooltipArrow from '../../assets/figma/tooltip-arrow.svg';
import type { MealKey, MealWeek, NutritionDetail } from '../../data/types';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { useStore } from '../../state/store';

const MEALS: { key: MealKey; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

const MACRO_FILL = { carb: 'bg-macro-carb', fat: 'bg-macro-fat', protein: 'bg-macro-protein' } as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86_400_000;
const dayOf = (start: string, index: number) => new Date(parseDay(start).getTime() + index * DAY_MS);
const fmt = (n: number) => n.toLocaleString('en-US');

function CardHeader({ title, link }: { title: string; link: string }) {
  const { showToast } = useStore();
  return (
    <div className="flex items-center justify-between rounded-t-lg border-b border-ink/10 bg-white px-3 py-[14px]">
      <h4 className="text-[15px] font-semibold leading-[18px] text-ink">{title}</h4>
      <button
        type="button"
        onClick={() => showToast(`${link} opens the client's full data`)}
        className="flex items-center gap-1.5 text-[13px] font-semibold leading-[18px] text-ink-secondary hover:text-ink"
      >
        {link}
        <span className="flex size-[14px] items-center justify-center">
          <img src={iconExpandArrow} alt="" width={14} height={14} className="rotate-90" />
        </span>
      </button>
    </div>
  );
}

function MacroCard({ nutrition }: { nutrition: NutritionDetail }) {
  const { calories, macros } = nutrition;
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-ink/10 bg-elevated p-px shadow-card">
      <CardHeader title="Macro AVG" link="View nutrition" />
      <div className="flex items-center justify-between py-3 pl-3 pr-6">
        <div className="relative h-[136px] w-[167.792px] shrink-0">
          <div className="absolute left-[calc(50%-0.44px)] top-[6.18px] size-[123.636px] -translate-x-1/2">
            <div className="absolute left-0 top-0 size-[123.636px]">
              <div className="absolute inset-[-19.61%_-57.84%_-57.84%_-19.61%]">
                <img src={calorieChart} alt="" className="block size-full max-w-none" />
              </div>
            </div>
            <div className="absolute left-[19.39px] top-[38.79px] flex w-[84.848px] flex-col items-center gap-1 whitespace-nowrap text-center leading-none">
              <p className="text-[29.076px] font-bold tracking-[-0.58px] text-black tabular-nums">{fmt(calories.value)}</p>
              <p className="text-[13px] font-semibold tracking-[-0.26px] text-black/40">/ {calories.target} kCal</p>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 self-stretch pr-5">
          {macros.map((m) => (
            <div key={m.key} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[13px] font-semibold leading-[18px] text-ink">
                <span>{m.label}</span>
                <span className="tabular-nums">
                  {m.value} <span className="text-ink/60">/ {m.target}g</span>
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-black/[0.08]">
                <div className={`h-2 rounded-full ${MACRO_FILL[m.key]}`} style={{ width: `${Math.min(100, (m.value / m.target) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function cellClass(count: number | null) {
  if (count === null) return 'border-dashed border-line-light';
  if (count === 0) return 'border-meal-empty bg-meal-empty font-normal text-dark';
  if (count === 1) return 'border-meal-1 bg-meal-1 font-semibold text-white';
  if (count === 2) return 'border-[#1646e3] bg-[#1646e3] font-semibold text-white';
  return 'border-meal-4 bg-meal-4 font-semibold text-white';
}

function MealCell({ week, meal, mealLabel, index, count, foods }: {
  week: MealWeek;
  meal: MealKey;
  mealLabel: string;
  index: number;
  count: number | null;
  foods: NutritionDetail['foods'];
}) {
  const date = dayOf(week.start, index);
  const items = foods[`${week.start}:${meal}:${index}`];
  return (
    <div
      tabIndex={count === null ? undefined : 0}
      className={`group/cell relative flex aspect-square min-w-0 flex-1 items-center justify-center rounded-[4px] border text-[12px] leading-[18px] outline-none ${cellClass(count)}`}
    >
      {count !== null && (count === 0 ? '-' : count)}
      {count !== null && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 flex-col items-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.2)] group-hover/cell:flex group-focus/cell:flex">
          <div className="flex flex-col gap-1 rounded-lg bg-white px-2 pb-2.5 pt-2 text-left">
            <div className="flex w-[160px] items-center gap-0.5 whitespace-nowrap">
              <span className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-ink">
                {mealLabel}
                {count > 0 && ` (${count})`}
              </span>
              <span className="text-[12px] font-normal leading-[1.5] text-ink-tertiary">
                · {WEEKDAYS[date.getUTCDay()]}, {formatMonthDay(date)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {count === 0 && <p className="text-[13px] font-normal leading-[1.4] text-ink-tertiary">Not logged</p>}
              {count > 0 &&
                (items ?? []).map((f) => (
                  <p key={f.name} className="flex justify-between gap-3 whitespace-nowrap text-[13px] leading-[1.4] text-ink">
                    <span className="font-semibold">{f.name}</span>
                    <span className="font-normal text-ink-tertiary">{f.calories} Cal</span>
                  </p>
                ))}
              {count > 0 && !items && (
                <p className="text-[13px] font-normal leading-[1.4] text-ink-tertiary">
                  {count} meal{count === 1 ? '' : 's'} logged
                </p>
              )}
            </div>
          </div>
          <img src={tooltipArrow} alt="" width={10} height={5} />
        </div>
      )}
    </div>
  );
}

function WeekGrid({ week, foods, divider }: { week: MealWeek; foods: NutritionDetail['foods']; divider: boolean }) {
  const end = dayOf(week.start, 6);
  const startLabel = formatMonthDay(parseDay(week.start));
  const range =
    end.getUTCMonth() === parseDay(week.start).getUTCMonth() ? `${startLabel} - ${end.getUTCDate()}` : `${startLabel} - ${formatMonthDay(end)}`;
  return (
    <div className={`flex min-w-0 flex-1 flex-col px-5 ${divider ? 'border-r border-line' : ''}`}>
      <div className="flex items-center py-2 text-[13px] leading-[18px]">
        <span className="w-[68px] shrink-0" aria-hidden />
        <p className="flex-1 text-center font-semibold text-ink">
          {range}
          {week.isCurrent && <span className="font-normal"> (This week)</span>}
        </p>
      </div>
      <div className="flex items-start gap-3 pb-3">
        <div className="grid w-[68px] shrink-0 gap-y-1 text-[11px] font-semibold uppercase leading-[18px] text-ink-tertiary">
          <span className="h-[18px]" aria-hidden />
          {MEALS.map((m) => (
            <span key={m.key} className="flex h-[28px] items-center">
              {m.label}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex gap-1 text-center text-[12px] leading-[18px] text-ink-secondary">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="min-w-0 flex-1 tabular-nums">
                {dayOf(week.start, i).getUTCDate()}
              </span>
            ))}
          </div>
          {MEALS.map((m) => (
            <div key={m.key} className="flex gap-1">
              {week.meals[m.key].map((count, i) => (
                <MealCell key={i} week={week} meal={m.key} mealLabel={m.label} index={i} count={count} foods={foods} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MealLogCard({ nutrition }: { nutrition: NutritionDetail }) {
  return (
    <div className="flex flex-col rounded-lg border border-ink/10 bg-elevated p-px shadow-card">
      <CardHeader title="Meal Log" link="View food log" />
      <div className="flex items-start py-4">
        {nutrition.weeks.map((week, i) => (
          <WeekGrid key={week.start} week={week} foods={nutrition.foods} divider={i < nutrition.weeks.length - 1} />
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 px-4 py-3 text-[12px] leading-[18px] text-ink">
        <span className="flex items-center gap-2">
          1 meal
          <span className="flex gap-0.5">
            {['bg-meal-1', 'bg-meal-2', 'bg-meal-3', 'bg-meal-4'].map((c) => (
              <span key={c} className={`size-4 rounded-[3.368px] ${c}`} />
            ))}
          </span>
          3+ meals
        </span>
        <span className="flex items-center gap-2">
          <img src={legendNotLogged} alt="" width={16} height={16} />
          Not logged
        </span>
        <span className="flex items-center gap-2">
          <span className="size-4 rounded-[2.837px] border-[1.064px] border-dashed border-ink-muted" />
          Upcoming
        </span>
      </div>
      <div className="flex flex-col px-4 pb-4 pt-2 text-[13px] leading-[18px] text-ink">
        {[
          ['Meal logged (this week)', `${nutrition.mealsThisWeek} meals`],
          ['Avg Calories', `${fmt(nutrition.avgCalories)} Cal`],
        ].map(([label, value]) => (
          <div key={label} className="flex items-baseline border-t border-ink/10 px-1 pb-2.5 pt-[11px]">
            <span className="w-[180px] shrink-0">{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NutritionTab({ nutrition }: { nutrition: NutritionDetail }) {
  return (
    <div className="flex w-full flex-col gap-[15px]">
      <MacroCard nutrition={nutrition} />
      <MealLogCard nutrition={nutrition} />
    </div>
  );
}
