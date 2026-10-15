import calorieChartSvg from '../../assets/figma/chart-calories.svg?raw';
import iconExpandArrow from '../../assets/figma/icon-expand-arrow.svg';
import legendNotLogged from '../../assets/figma/legend-not-logged.svg';
import tooltipArrow from '../../assets/figma/tooltip-arrow.svg';
import type { MealKey, NutritionLog } from '../../data/types';
import { MEALS, foodCalories, weekdayLabel, type NutritionSummary, type WeekGridData } from '../../lib/checkin';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { useStore } from '../../state/store';

const MACRO_FILL = { carb: 'bg-macro-carb', fat: 'bg-macro-fat', protein: 'bg-macro-protein' } as const;

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * The Figma ring is drawn for one value. Keep its track, glow and gradient, and redraw the `value` arc so it shows
 * the real share of the calorie target, clockwise from 12 o'clock.
 */
function calorieChartSrc(share: number) {
  const cx = 86.0607;
  const cy = 86.0606;
  const r = 52.1214;
  const f = Math.min(Math.max(share, 0.001), 0.9999);
  const angle = f * 2 * Math.PI;
  const x = cx + r * Math.sin(angle);
  const y = cy - r * Math.cos(angle);
  const arc = `M${cx} ${cy - r}A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x.toFixed(4)} ${y.toFixed(4)}`;
  const svg = calorieChartSvg.replace(/(<path id="value" d=")[^"]*/, `$1${arc}`);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

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

function MacroCard({ summary }: { summary: NutritionSummary }) {
  const { avgCalories, targetCalories, macros } = summary;
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-ink/10 bg-elevated p-px shadow-card">
      <CardHeader title="Macro AVG" link="View nutrition" />
      <div className="flex items-center justify-between py-3 pl-3 pr-6">
        <div className="relative h-[136px] w-[167.792px] shrink-0">
          <div className="absolute left-[calc(50%-0.44px)] top-[6.18px] size-[123.636px] -translate-x-1/2">
            <div className="absolute left-0 top-0 size-[123.636px]">
              <div className="absolute inset-[-19.61%_-57.84%_-57.84%_-19.61%]">
                <img src={calorieChartSrc(avgCalories / targetCalories)} alt="" className="block size-full max-w-none" />
              </div>
            </div>
            <div className="absolute left-[19.39px] top-[38.79px] flex w-[84.848px] flex-col items-center gap-1 whitespace-nowrap text-center leading-none">
              <p className="text-[29.076px] font-bold tracking-[-0.58px] text-black tabular-nums">{fmt(avgCalories)}</p>
              <p className="text-[13px] font-semibold tracking-[-0.26px] text-black/40">/ {targetCalories} kCal</p>
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

function MealCell({ log, date, meal, mealLabel, count }: {
  log: NutritionLog;
  date: string;
  meal: MealKey;
  mealLabel: string;
  count: number | null;
}) {
  const items = log.days[date]?.[meal] ?? [];
  return (
    <div
      tabIndex={count === null ? undefined : 0}
      className={`group/cell relative flex aspect-square min-w-0 flex-1 items-center justify-center rounded-[4px] border text-[12px] leading-[18px] outline-none ${cellClass(count)}`}
    >
      {count !== null && (count === 0 ? '-' : count)}
      {count !== null && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 flex-col items-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.2)] group-hover/cell:flex group-focus/cell:flex">
          <div className="flex flex-col gap-1 rounded-lg bg-white px-2 pb-2.5 pt-2 text-left">
            <div className="flex min-w-[160px] items-center gap-0.5 whitespace-nowrap">
              <span className="text-[13px] font-semibold leading-[1.5] tracking-[-0.26px] text-ink">
                {mealLabel}
                {count > 0 && ` (${count})`}
              </span>
              <span className="text-[12px] font-normal leading-[1.5] text-ink-tertiary">· {weekdayLabel(date)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {count === 0 && <p className="text-[13px] font-normal leading-[1.4] text-ink-tertiary">Not logged</p>}
              {items.map((f) => (
                <p key={f.name} className="flex justify-between gap-3 whitespace-nowrap text-[13px] leading-[1.4] text-ink">
                  <span className="font-semibold">{f.name}</span>
                  <span className="font-normal text-ink-tertiary">{foodCalories(f)} Cal</span>
                </p>
              ))}
            </div>
          </div>
          <img src={tooltipArrow} alt="" width={10} height={5} />
        </div>
      )}
    </div>
  );
}

function WeekGrid({ week, log, divider }: { week: WeekGridData; log: NutritionLog; divider: boolean }) {
  const start = parseDay(week.dates[0]);
  const end = parseDay(week.dates[6]);
  const range =
    end.getUTCMonth() === start.getUTCMonth() ? `${formatMonthDay(start)} - ${end.getUTCDate()}` : `${formatMonthDay(start)} - ${formatMonthDay(end)}`;
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
            {week.dates.map((d) => (
              <span key={d} className="min-w-0 flex-1 tabular-nums">
                {parseDay(d).getUTCDate()}
              </span>
            ))}
          </div>
          {MEALS.map((m) => (
            <div key={m.key} className="flex gap-1">
              {week.counts[m.key].map((count, i) => (
                <MealCell key={week.dates[i]} log={log} date={week.dates[i]} meal={m.key} mealLabel={m.label} count={count} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MealLogCard({ log, summary }: { log: NutritionLog; summary: NutritionSummary }) {
  return (
    <div className="flex flex-col rounded-lg border border-ink/10 bg-elevated p-px shadow-card">
      <CardHeader title="Meal Log" link="View food log" />
      <div className="flex items-start py-4">
        {summary.weeks.map((week, i) => (
          <WeekGrid key={week.start} week={week} log={log} divider={i < summary.weeks.length - 1} />
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
          [`Meals logged (${summary.window.label})`, `${summary.mealsLogged} meals`],
          ['Avg calories (logged days)', `${fmt(summary.avgCalories)} Cal`],
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

export function NutritionTab({ log, summary }: { log: NutritionLog; summary: NutritionSummary }) {
  return (
    <div className="flex w-full flex-col gap-[15px]">
      <MacroCard summary={summary} />
      <MealLogCard log={log} summary={summary} />
    </div>
  );
}
