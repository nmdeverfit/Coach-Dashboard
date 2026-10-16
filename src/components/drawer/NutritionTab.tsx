import iconExpandArrow from '../../assets/figma/icon-expand-arrow.svg';
import legendNotLogged from '../../assets/figma/legend-not-logged.svg';
import tooltipArrow from '../../assets/figma/tooltip-arrow.svg';
import type { MealKey, NutritionLog } from '../../data/types';
import { MEALS, addDays, foodCalories, weekdayLabel, type NutritionSummary, type WeekGridData } from '../../lib/checkin';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { useStore } from '../../state/store';

const MACRO_FILL = { carb: 'bg-macro-carb', fat: 'bg-macro-fat', protein: 'bg-macro-protein' } as const;

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * Calorie ring (Figma node 5645:520167), drawn inline so the arc shows the real share of the target. It keeps the
 * export's geometry, gradient and shadows; the export's frosted-glass layer uses `foreignObject`, which browsers do
 * not paint inside an <img>, so the track it implies is drawn as a plain ring instead.
 */
function CalorieRing({ share }: { share: number }) {
  const c = 86.0607;
  const r = 52.1214;
  const f = Math.min(Math.max(share, 0), 1);
  const angle = Math.min(f, 0.9999) * 2 * Math.PI;
  const arc = `M${c} ${c - r}A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${(c + r * Math.sin(angle)).toFixed(3)} ${(c - r * Math.cos(angle)).toFixed(3)}`;
  return (
    <svg viewBox="0 0 172.121 172.121" className="block size-full overflow-visible" aria-hidden>
      <defs>
        <filter id="ring-shadow" x="0" y="0" width="172.121" height="172.121" filterUnits="userSpaceOnUse">
          <feGaussianBlur in="SourceAlpha" stdDeviation="12.1212" />
          <feColorMatrix values="0 0 0 0 0.087 0 0 0 0 0.108 0 0 0 0 0.34 0 0 0 0.1 0" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ring-inner" x="37.5759" y="37.5756" width="96.9697" height="96.9697" filterUnits="userSpaceOnUse">
          <feFlood floodColor="white" result="base" />
          <feComposite in="base" in2="SourceAlpha" operator="in" result="fill" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.42424" result="blur" />
          <feComposite in="SourceAlpha" in2="blur" operator="arithmetic" k2="1" k3="-1" result="edge" />
          <feColorMatrix in="edge" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0" result="shade" />
          <feMerge>
            <feMergeNode in="fill" />
            <feMergeNode in="shade" />
          </feMerge>
        </filter>
        <linearGradient id="ring-value" x1="82.5131" y1="37.5756" x2="134.546" y2="79.5564" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFBB44" />
          <stop offset="1" stopColor="#FF6C18" />
        </linearGradient>
        <linearGradient id="ring-rim" x1="40.1617" y1="38.7101" x2="61.348" y2="147.469" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ring-track" x1="40" y1="30" x2="132" y2="142" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F3F4F7" />
          <stop offset="1" stopColor="#E4E6EC" />
        </linearGradient>
      </defs>
      <circle cx={c} cy={c} r="61.8182" fill="white" filter="url(#ring-shadow)" />
      <circle cx={c} cy={c} r={r} fill="none" stroke="url(#ring-track)" strokeWidth="7.27273" />
      {f > 0 && <path d={arc} fill="none" stroke="url(#ring-value)" strokeWidth="7.27273" strokeLinecap="round" />}
      <circle cx={c} cy={c} r="48.4848" fill="white" filter="url(#ring-inner)" />
      <circle cx={c} cy={c} r="47.8788" fill="none" stroke="url(#ring-rim)" strokeWidth="1.21212" />
    </svg>
  );
}

export function CardHeader({
  title,
  titleHint,
  link,
  onClick,
}: {
  title: React.ReactNode;
  /** Shown on hover over the title, e.g. the date range a card covers. */
  titleHint?: string;
  link: string;
  onClick?: () => void;
}) {
  const { showToast } = useStore();
  return (
    <div className="flex items-center justify-between rounded-t-lg border-b border-ink/10 bg-white px-3 py-[14px]">
      <h4 title={titleHint} className="text-[15px] font-semibold leading-[18px] text-ink">
        {title}
      </h4>
      <button
        type="button"
        onClick={onClick ?? (() => showToast(`${link} opens the client's full data`))}
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
  // Nothing logged: the same card with an empty ring and empty bars, values read "–" rather than a misleading 0.
  const empty = summary.daysLogged === 0;
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-ink/10 bg-elevated p-px shadow-card">
      <CardHeader title="Macro AVG" link="View nutrition" />
      <div className="flex items-center justify-between py-3 pl-3 pr-6">
        <div className="relative h-[136px] w-[167.792px] shrink-0">
          <div className="absolute left-[calc(50%-0.44px)] top-[6.18px] size-[123.636px] -translate-x-1/2">
            <div className="absolute left-0 top-0 size-[123.636px]">
              <div className="absolute inset-[-19.61%]">
                <CalorieRing share={avgCalories / targetCalories} />
              </div>
            </div>
            <div className="absolute left-[19.39px] top-[38.79px] flex w-[84.848px] flex-col items-center gap-1 whitespace-nowrap text-center leading-none">
              <p className={`text-[29.076px] font-bold tracking-[-0.58px] tabular-nums ${empty ? 'text-black/30' : 'text-black'}`}>
                {empty ? '–' : fmt(avgCalories)}
              </p>
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
                  {empty ? <span className="text-ink/40">–</span> : m.value} <span className="text-ink/60">/ {m.target}g</span>
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

const weekRange = (week: WeekGridData) => {
  const start = parseDay(week.dates[0]);
  const end = parseDay(week.dates[6]);
  return end.getUTCMonth() === start.getUTCMonth() ? `${formatMonthDay(start)} - ${end.getUTCDate()}` : `${formatMonthDay(start)} - ${formatMonthDay(end)}`;
};

/**
 * Both weeks in one grid: a single meal-label column on the left, then 7 day columns per week with a divider between,
 * so the labels line up with the cells whatever their size.
 */
function MealGrid({ weeks, log, today }: { weeks: WeekGridData[]; log: NutritionLog; today: string }) {
  const columns = weeks.map(() => 'repeat(7, minmax(0, 1fr))').join(' 17px ');
  // Column of each week's first day: labels take column 1, each divider takes one column.
  const firstCol = (w: number) => 2 + w * 8;
  return (
    <div className="grid gap-x-1 gap-y-1 px-5 py-4" style={{ gridTemplateColumns: `68px ${columns}` }}>

      {weeks.map((week, w) => (
        <p
          key={`title-${week.start}`}
          className="pb-2 text-center text-[13px] font-semibold leading-[18px] text-ink"
          style={{ gridColumn: `${firstCol(w)} / span 7`, gridRow: 1 }}
        >
          {weekRange(week)}
          {week.isCurrent && <span className="font-normal"> (This week)</span>}
        </p>
      ))}
      {weeks.slice(1).map((week, w) => (
        <span key={`divider-${week.start}`} aria-hidden className="mx-auto w-px bg-line" style={{ gridColumn: firstCol(w + 1) - 1, gridRow: '1 / span 6' }} />
      ))}
      {weeks.map((week, w) =>
        week.dates.map((d, i) => (
          <span
            key={`day-${d}`}
            title={d === today ? 'Today' : undefined}
            className="flex h-5 items-center justify-center text-[12px] leading-[18px] text-ink-secondary tabular-nums"
            style={{ gridColumn: firstCol(w) + i, gridRow: 2 }}
          >
            {d === today ? (
              // Today, as the Training session log marks it: brand number, semibold, on a subtle blue chip.
              <span className="flex size-5 items-center justify-center rounded-full bg-brand-subtle text-[12px] font-semibold text-brand">
                {parseDay(d).getUTCDate()}
              </span>
            ) : (
              parseDay(d).getUTCDate()
            )}
          </span>
        )),
      )}
      {MEALS.map((m, r) => (
        <span
          key={`label-${m.key}`}
          className="flex items-center text-[11px] font-semibold uppercase leading-[18px] text-ink-tertiary"
          style={{ gridColumn: 1, gridRow: 3 + r }}
        >
          {m.label}
        </span>
      ))}
      {MEALS.map((m, r) =>
        weeks.map((week, w) =>
          week.counts[m.key].map((count, i) => (
            <div key={`${m.key}-${week.dates[i]}`} className="flex" style={{ gridColumn: firstCol(w) + i, gridRow: 3 + r }}>
              <MealCell log={log} date={week.dates[i]} meal={m.key} mealLabel={m.label} count={count} />
            </div>
          )),
        ),
      )}
    </div>
  );
}

function MealLogCard({ log, summary }: { log: NutritionLog; summary: NutritionSummary }) {
  return (
    <div className="flex flex-col rounded-lg border border-ink/10 bg-elevated p-px shadow-card">
      <CardHeader title="Meal Log" link="View food log" />
      {/* The summary covers the 7 days before today, so today is the day after its window. */}
      <MealGrid weeks={summary.weeks} log={log} today={addDays(summary.window.end, 1)} />
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
          ['Avg calories (logged days)', summary.daysLogged ? `${fmt(summary.avgCalories)} Cal` : 'Nothing logged'],
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
  // With nothing logged the cards still render, in their empty state: empty ring and bars, every Meal Log cell
  // "Not logged", and the summary rows say so (Spec 4 AC2.4, AC10.5).
  return (
    <div className="flex w-full flex-col gap-[15px]">
      <MacroCard summary={summary} />
      <MealLogCard log={log} summary={summary} />
    </div>
  );
}
