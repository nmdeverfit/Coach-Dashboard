import { useSyncExternalStore, type ReactNode } from 'react';
import type { TrainingLog } from '../../data/types';
import { formatMonthDay, parseDay } from '../../lib/dates';
import dayCompleted from '../../assets/figma/icon-day-completed.svg';
import dayMissed from '../../assets/figma/icon-day-missed.svg';
import dayPartial from '../../assets/figma/icon-day-partial.svg';
import dayPaused from '../../assets/figma/icon-day-paused.svg';
import dayRest from '../../assets/figma/icon-day-rest.svg';
import pausedPattern from '../../assets/figma/training-paused.png';
import { doneOf, sessionWeeks, summarizeTraining, type SessionCell, type SessionState } from '../../lib/training';
import { useStore } from '../../state/store';
import { CardHeader } from './NutritionTab';
import { CELL, DayTooltip, Row, TrendChart, UNASSIGNED, ago, pct } from './TrainingTab';

/**
 * Training chart trial (the user's call; no frame): the session log drawn with icons instead of labelled tiles, two
 * options side by side with the current one, picked on the trial bar (`ChartTrialBar`). Built only with
 * `VITE_CHART_TRIAL=1` (`npm run build:artifact:charts`). Every figure comes from `lib/training.ts`, as the current
 * tab's do, so they cannot disagree.
 * - A · Icon calendar: the same two weeks, one icon per day, and the three figures as a row of small tiles.
 * - B · Weekly rows: five weeks, one row each with its done / assigned, which takes the 4-week trend's place.
 * - 1 · Icon tiles (Figma 6116:553518): 56 px tiles, the date over a 24 px icon, completed days in green.
 * - C · Compact tiles: the current calendar's tiles, shorter, an icon in place of the state's word.
 */
export type ChartOption = 'current' | 'figma' | 'icons' | 'weeks' | 'tiles';

export const CHART_OPTIONS: { key: ChartOption; label: string; hint: string }[] = [
  { key: 'current', label: 'Current', hint: 'The session log as it is now: labelled tiles, the legend and three rows' },
  { key: 'figma', label: '1 · Icon tiles', hint: 'Figma 6116:553518: each day a small tile, the date over its icon' },
  { key: 'icons', label: 'A · Icon calendar', hint: 'The same two weeks as icons; the figures in one row of tiles' },
  { key: 'weeks', label: 'B · Weekly rows', hint: 'Five weeks of icons, a row each with its own done / assigned' },
  { key: 'tiles', label: 'C · Compact tiles', hint: 'The current tiles, shorter, with an icon instead of the state’s word' },
];

const KEY = 'cid-chart-option';
const read = (): ChartOption => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'figma' || v === 'icons' || v === 'weeks' || v === 'tiles' ? v : 'current';
  } catch {
    return 'current';
  }
};
let current: ChartOption = read();
const listeners = new Set<() => void>();
export function setChartOption(v: ChartOption) {
  current = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Private windows: the pick lasts for the page only.
  }
  listeners.forEach((l) => l());
}
export const useChartOption = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );

const BRAND = '#184eff';
const RED = '#f03358';
const MUTED = '#9ca3af';

/**
 * One day as an icon: ✓ on brand (completed), a brand ring filled to the share done (partial), × on soft red
 * (missed), a grey dash (rest), a brand ring with a dot (today), a dashed ring (upcoming), pause bars (paused), a
 * plain grey disc (nothing assigned).
 */
export function DayIcon({ cell, size }: { cell: SessionCell; size: number }) {
  const c = size / 2;
  const r = c - 1;
  const state = cell.assigned ? cell.state : 'unassigned';
  let body: ReactNode;
  switch (state) {
    case 'completed':
      body = (
        <>
          <circle cx={c} cy={c} r={r} fill={BRAND} />
          <path d={`M${size * 0.3} ${size * 0.52} L${size * 0.44} ${size * 0.66} L${size * 0.71} ${size * 0.37}`} fill="none" stroke="#fff" strokeWidth={size / 12} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
      break;
    case 'partial': {
      const share = cell.day ? doneOf(cell.day) / cell.day.workouts.length : 0.5;
      const ring = r - size / 14;
      body = (
        <>
          <circle cx={c} cy={c} r={r} fill="#e8eeff" />
          <circle cx={c} cy={c} r={ring} fill="none" stroke={BRAND} strokeOpacity={0.18} strokeWidth={size / 8} />
          <circle
            cx={c}
            cy={c}
            r={ring}
            fill="none"
            stroke={BRAND}
            strokeWidth={size / 8}
            pathLength={100}
            strokeDasharray={`${share * 100} 100`}
            strokeLinecap="round"
            transform={`rotate(-90 ${c} ${c})`}
          />
        </>
      );
      break;
    }
    case 'missed':
      body = (
        <>
          <circle cx={c} cy={c} r={r} fill="#fdecef" />
          <path d={`M${size * 0.36} ${size * 0.36} L${size * 0.64} ${size * 0.64} M${size * 0.64} ${size * 0.36} L${size * 0.36} ${size * 0.64}`} stroke={RED} strokeWidth={size / 12} strokeLinecap="round" />
        </>
      );
      break;
    case 'rest':
      body = (
        <>
          <circle cx={c} cy={c} r={r} fill="#f1f2f4" />
          <path d={`M${size * 0.38} ${c} L${size * 0.62} ${c}`} stroke={MUTED} strokeWidth={size / 14} strokeLinecap="round" />
        </>
      );
      break;
    case 'today':
      body = (
        <>
          <circle cx={c} cy={c} r={r - 0.5} fill="#fff" stroke={BRAND} strokeWidth={1.5} />
          <circle cx={c} cy={c} r={size / 9} fill={BRAND} />
        </>
      );
      break;
    case 'upcoming':
      body = <circle cx={c} cy={c} r={r - 0.5} fill="#fff" stroke={MUTED} strokeWidth={1.2} strokeDasharray="2.5 2.5" />;
      break;
    case 'paused':
      body = (
        <>
          <circle cx={c} cy={c} r={r} fill="#f1f2f4" />
          <path d={`M${size * 0.42} ${size * 0.36} V${size * 0.64} M${size * 0.58} ${size * 0.36} V${size * 0.64}`} stroke={MUTED} strokeWidth={size / 12} strokeLinecap="round" />
        </>
      );
      break;
    default:
      body = <circle cx={c} cy={c} r={r} fill="#eaeef1" />;
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="block shrink-0">
      {body}
    </svg>
  );
}

const LEGEND: { label: string; cell: SessionCell }[] = [
  { label: 'Completed', cell: { date: '', state: 'completed', assigned: true } },
  { label: 'Partial', cell: { date: '', state: 'partial', assigned: true } },
  { label: 'Missed', cell: { date: '', state: 'missed', assigned: true } },
  { label: 'Rest', cell: { date: '', state: 'rest', assigned: true } },
  { label: 'Today', cell: { date: '', state: 'today', assigned: true } },
  { label: 'Upcoming', cell: { date: '', state: 'upcoming', assigned: true } },
];

function IconLegend({ cells }: { cells: SessionCell[] }) {
  // Only the states the chart shows, plus Paused and Not assigned when they occur.
  const extra: { label: string; cell: SessionCell }[] = [];
  if (cells.some((c) => c.state === 'paused')) extra.push({ label: 'Paused', cell: { date: '', state: 'paused', assigned: true } });
  if (cells.some((c) => !c.assigned)) extra.push({ label: 'Not assigned', cell: { date: '', state: 'rest', assigned: false } });
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-3 text-[11px] leading-4 text-ink-tertiary">
      {[...LEGEND, ...extra].map((l) => (
        <span key={l.label} className="flex items-center gap-1.5">
          <DayIcon cell={l.cell} size={14} />
          {l.label}
        </span>
      ))}
    </div>
  );
}

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** An icon with the day's hover (the current log's: date, state, each workout). */
function HoverDay({ cell, size, children }: { cell: SessionCell; size: number; children?: ReactNode }) {
  return (
    <div tabIndex={cell.day ? 0 : undefined} className="group/cell relative flex flex-col items-center gap-1 outline-none">
      <span className={`rounded-full transition-shadow ${cell.day ? 'group-hover/cell:ring-[3px] group-hover/cell:ring-brand/15 group-focus/cell:ring-[3px] group-focus/cell:ring-brand/15' : ''}`}>
        <DayIcon cell={cell} size={size} />
      </span>
      {children}
      {cell.day && <DayTooltip cell={cell} day={cell.day} />}
    </div>
  );
}

/** A: the same two weeks as icons, the date small under each, and the three figures as tiles in one row. */
function IconCalendar({ log, today }: { log: TrainingLog; today: string }) {
  const s = summarizeTraining(log, today);
  const cells = s.weeks.flat();
  const max = Math.max(100, ...s.trend.map((w) => w.pct ?? 0));
  return (
    <div className="flex flex-col overflow-visible rounded-lg border border-ink/15 bg-elevated p-px">
      <CardHeader title="Session log" link="Workout history" />
      <div className="flex flex-col gap-2 px-10 pt-3">
        <p className="text-center text-[12px] leading-[18px] text-ink-tertiary">{s.rangeLabel}</p>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold leading-4 text-ink-muted">
          {WEEKDAY_INITIALS.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        {s.weeks.map((week) => (
          <div key={week[0].date} className="grid grid-cols-7">
            {week.map((cell) => (
              <HoverDay key={cell.date} cell={cell} size={28}>
                <span className={`text-[10px] leading-3 ${cell.date === today ? 'font-semibold text-brand' : 'text-ink-muted'}`}>{parseDay(cell.date).getUTCDate()}</span>
              </HoverDay>
            ))}
          </div>
        ))}
      </div>
      <IconLegend cells={cells} />
      <div className="grid grid-cols-3 gap-2 px-3 pb-3">
        <Tile label="Last workout" value={ago(s.lastWorkoutDaysAgo)} />
        <Tile label="2-week adherence" value={pct(s.adherence2w)} />
        <Tile label="4-week trend" value={pct(s.adherence4w)}>
          <div className="flex h-5 items-end gap-1" role="img" aria-label={s.trend.map((w) => `${w.label} ${pct(w.pct)}`).join(', ')}>
            {s.trend.map((w) => (
              <span key={w.label} title={`${w.label}: ${pct(w.pct)}`} className="w-1.5 rounded-sm bg-[#0e9cff]" style={{ height: `${Math.max(8, ((w.pct ?? 0) / max) * 100)}%` }} />
            ))}
          </div>
        </Tile>
      </div>
    </div>
  );
}

function Tile({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-2 rounded-lg bg-white px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(32,35,83,0.08)]">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[11px] leading-4 text-ink-tertiary">{label}</span>
        <span className="text-[15px] font-semibold leading-5 text-ink">{value}</span>
      </div>
      {children}
    </div>
  );
}

const weekLabel = (monday: string, sunday: string) => {
  const a = parseDay(monday);
  const b = parseDay(sunday);
  return a.getUTCMonth() === b.getUTCMonth() ? `${formatMonthDay(a)} – ${b.getUTCDate()}` : `${formatMonthDay(a)} – ${formatMonthDay(b)}`;
};

/** B: five weeks, a row each: the week, seven icons, and what was done of what was assigned. */
function WeeklyRows({ log, today }: { log: TrainingLog; today: string }) {
  const s = summarizeTraining(log, today);
  const weeks = sessionWeeks(log, today, 5);
  return (
    <div className="flex flex-col overflow-visible rounded-lg border border-ink/15 bg-elevated p-px">
      <CardHeader title="Session log" link="Workout history" />
      <div className="flex items-center gap-4 px-4 pt-3 text-[12px] leading-[18px] text-ink-tertiary">
        <span>
          Last workout <span className="font-semibold text-ink">{ago(s.lastWorkoutDaysAgo)}</span>
        </span>
        <span aria-hidden className="size-1 rounded-full bg-[#d9d9d9]" />
        <span>
          2-week adherence <span className="font-semibold text-ink">{pct(s.adherence2w)}</span>
        </span>
        <span aria-hidden className="size-1 rounded-full bg-[#d9d9d9]" />
        <span>
          4-week adherence <span className="font-semibold text-ink">{pct(s.adherence4w)}</span>
        </span>
      </div>
      <table className="mx-4 mt-2 border-separate border-spacing-y-1.5 text-[12px] leading-[18px]">
        <thead>
          <tr className="text-[11px] font-semibold text-ink-muted">
            <th className="w-[96px] text-left font-semibold">Week</th>
            {WEEKDAY_INITIALS.map((d, i) => (
              <th key={i} className="w-9 text-center font-semibold">
                {d}
              </th>
            ))}
            <th className="w-[92px] text-right font-semibold">Done</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => {
            const thisWeek = w.monday <= today && today <= w.sunday;
            return (
              <tr key={w.monday}>
                <td className={`whitespace-nowrap ${thisWeek ? 'font-semibold text-ink' : 'text-ink-tertiary'}`}>{thisWeek ? 'This week' : weekLabel(w.monday, w.sunday)}</td>
                {w.cells.map((cell) => (
                  <td key={cell.date} className="text-center">
                    <div className="flex justify-center">
                      <HoverDay cell={cell} size={22} />
                    </div>
                  </td>
                ))}
                <td className="whitespace-nowrap text-right">
                  {w.pct === null ? (
                    <span className="text-ink-muted">—</span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-ink-tertiary">
                        {w.done}/{w.planned}
                      </span>
                      <span className="w-9 text-right font-semibold text-ink">{w.pct}%</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <IconLegend cells={weeks.flatMap((w) => w.cells)} />
    </div>
  );
}

/**
 * The icon drawn on a tile, whose own fill already says the state: only the glyph, in the tile's colour (white ✓ on
 * the brand tile, a brand ring on the partial one, a red × on the missed one, and so on).
 */
function TileGlyph({ cell, size }: { cell: SessionCell; size: number }) {
  const c = size / 2;
  const w = size / 9;
  const state = cell.assigned ? cell.state : 'unassigned';
  let body: ReactNode = null;
  switch (state) {
    case 'completed':
      body = <path d={`M${size * 0.2} ${size * 0.52} L${size * 0.4} ${size * 0.72} L${size * 0.8} ${size * 0.3}`} fill="none" stroke="#fff" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
      break;
    case 'partial': {
      const share = cell.day ? doneOf(cell.day) / cell.day.workouts.length : 0.5;
      const r = c - w;
      body = (
        <>
          <circle cx={c} cy={c} r={r} fill="none" stroke={BRAND} strokeOpacity={0.2} strokeWidth={w} />
          <circle cx={c} cy={c} r={r} fill="none" stroke={BRAND} strokeWidth={w} pathLength={100} strokeDasharray={`${share * 100} 100`} strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`} />
        </>
      );
      break;
    }
    case 'missed':
      body = <path d={`M${size * 0.25} ${size * 0.25} L${size * 0.75} ${size * 0.75} M${size * 0.75} ${size * 0.25} L${size * 0.25} ${size * 0.75}`} stroke={RED} strokeWidth={w} strokeLinecap="round" />;
      break;
    case 'rest':
      body = <path d={`M${size * 0.25} ${c} L${size * 0.75} ${c}`} stroke={MUTED} strokeWidth={w} strokeLinecap="round" />;
      break;
    case 'today':
      body = <circle cx={c} cy={c} r={size / 5} fill={BRAND} />;
      break;
    case 'paused':
      body = <path d={`M${size * 0.38} ${size * 0.25} V${size * 0.75} M${size * 0.62} ${size * 0.25} V${size * 0.75}`} stroke={MUTED} strokeWidth={w} strokeLinecap="round" />;
      break;
  }
  if (!body) return null;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="block shrink-0">
      {body}
    </svg>
  );
}

/** C's legend: each state as a small tile with its glyph, as the calendar draws it. */
function TileLegend({ cells }: { cells: SessionCell[] }) {
  const items: SessionCell[] = (['completed', 'partial', 'missed', 'rest', 'today', 'upcoming'] as const).map((state) => ({ date: '', state, assigned: true }));
  if (cells.some((c) => c.state === 'paused')) items.push({ date: '', state: 'paused', assigned: true });
  if (cells.some((c) => !c.assigned)) items.push({ date: '', state: 'rest', assigned: false });
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-3 text-[11px] leading-4 text-ink-tertiary">
      {items.map((c) => {
        const st = c.assigned ? CELL[c.state] : UNASSIGNED;
        return (
          <span key={st.label} className="flex items-center gap-1.5">
            <span className={`flex size-4 items-center justify-center rounded border ${st.box}`}>
              <TileGlyph cell={c} size={10} />
            </span>
            {st.label}
          </span>
        );
      })}
    </div>
  );
}

/** The session log card with the current figures under it; `children` draws the two weeks and their legend. */
function TileCard({ log, today, children }: { log: TrainingLog; today: string; children: ReactNode }) {
  const s = summarizeTraining(log, today);
  return (
    <div className="flex flex-col overflow-visible rounded-lg border border-ink/15 bg-elevated p-px">
      <CardHeader title="Session log" link="Workout history" />
      <div className="flex flex-col gap-3 pt-4">
        <p className="text-center text-[13px] font-semibold leading-[18px] text-ink">{s.rangeLabel}</p>
        {children}
      </div>
      <div className="flex flex-col px-3 pb-3">
        <Row label="Last workout" value={ago(s.lastWorkoutDaysAgo)} />
        <Row label="2-week adherence" value={pct(s.adherence2w)} />
        <div className="flex items-center px-1 py-2.5 text-[13px] leading-[18px] text-ink">
          <p className="w-[210px] shrink-0">
            4-week trend
            <br />
            <span className="font-semibold">({pct(s.adherence4w)} adherence)</span>
          </p>
          <TrendChart trend={s.trend} />
        </div>
      </div>
    </div>
  );
}

/** Option 1's tiles (Figma 6116:553518): fill, border and date colour per state; the icon is the frame's export. */
const FIGMA_TILE: Record<SessionState | 'unassigned', { box: string; date: string; icon?: string; word?: string }> = {
  completed: { box: 'border-transparent bg-[#059669]/10', date: 'font-semibold text-[#059669]', icon: dayCompleted },
  partial: { box: 'border-transparent bg-brand/[0.12]', date: 'text-ink', icon: dayPartial },
  missed: { box: 'border-[#feeff2] bg-[#f2617d]/10', date: 'font-semibold text-[#f03358]', icon: dayMissed },
  rest: { box: 'border-line bg-white', date: 'text-ink', icon: dayRest },
  today: { box: 'border-brand bg-white', date: '', word: 'font-semibold text-brand' },
  upcoming: { box: 'border-dashed border-ink-muted/40 bg-white', date: 'text-ink', word: 'font-semibold text-ink-secondary' },
  paused: { box: 'border-[#f6f6f6] bg-[#f2f2f2]', date: 'text-ink', icon: dayPaused },
  unassigned: { box: 'border-line bg-[#eaeef1]', date: 'text-ink-secondary' },
};
/** Seven 80 px columns, 4 px apart (the frame's), narrowing evenly when the card is less wide. */
const FIGMA_COLS = 'grid w-full max-w-[584px] grid-cols-[repeat(7,minmax(0,80px))] justify-center gap-1';
// Read when drawn: `TrainingTab` imports this file, so its `CELL` is not set yet while this module loads.
const figmaLabel = (k: SessionState | 'unassigned') => (k === 'unassigned' ? UNASSIGNED.label : CELL[k].label);

/**
 * 1: the frame's 56 px tiles, the date over a 24 px icon. No legend (the user's call): today and upcoming days, which
 * have no icon, name themselves in the icon's place; not assigned stays blank.
 */
function FigmaTiles({ log, today }: { log: TrainingLog; today: string }) {
  const s = summarizeTraining(log, today);
  return (
    <TileCard log={log} today={today}>
      <div className="flex flex-col items-center gap-1 px-10 pb-4">
        <div className={`${FIGMA_COLS} text-center text-[11px] font-semibold uppercase leading-[18px] text-ink-tertiary`}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        {s.weeks.map((week) => (
          <div key={week[0].date} className={FIGMA_COLS}>
            {week.map((cell) => {
              const key = cell.assigned ? cell.state : 'unassigned';
              const t = FIGMA_TILE[key];
              const day = String(parseDay(cell.date).getUTCDate()).padStart(2, '0');
              return (
                <div
                  key={cell.date}
                  tabIndex={cell.day ? 0 : undefined}
                  aria-label={`${day}: ${figmaLabel(key)}`}
                  className={`group/cell relative flex min-w-0 flex-col items-center gap-1 rounded-lg border pb-2 pt-1.5 outline-none transition-shadow duration-150 hover:z-10 hover:ring-[3px] hover:ring-black/[0.06] focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-black/[0.06] ${t.box}`}
                >
                  {key === 'paused' && <img src={pausedPattern} alt="" className="pointer-events-none absolute inset-0 size-full rounded-lg object-cover opacity-40" />}
                  {cell.date === today ? (
                    <span className="relative my-[-1px] flex size-5 items-center justify-center rounded-full bg-brand-subtle text-[11px] font-semibold leading-none text-brand">{day}</span>
                  ) : (
                    <span className={`relative text-[12px] leading-[18px] ${t.date}`}>{day}</span>
                  )}
                  {t.icon ? (
                    <img src={t.icon} alt="" width={24} height={24} className="relative block size-6" />
                  ) : t.word ? (
                    <span className={`relative flex h-6 items-center text-[11px] leading-none tracking-[-0.22px] ${t.word}`}>{figmaLabel(key)}</span>
                  ) : (
                    <span aria-hidden className="block size-6" />
                  )}
                  {cell.day && <DayTooltip cell={cell} day={cell.day} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </TileCard>
  );
}

/** C: the current calendar, its tiles 44 px tall instead of 76: the date at the top left, the state as an icon. */
function CompactTiles({ log, today }: { log: TrainingLog; today: string }) {
  const s = summarizeTraining(log, today);
  const cells = s.weeks.flat();
  return (
    <TileCard log={log} today={today}>
        <div className="flex flex-col gap-1 px-10">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase leading-[18px] text-ink-tertiary">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          {s.weeks.map((week) => (
            <div key={week[0].date} className="grid grid-cols-7 gap-1">
              {week.map((cell) => {
                const st = cell.assigned ? CELL[cell.state] : UNASSIGNED;
                const isToday = cell.date === today;
                const day = String(parseDay(cell.date).getUTCDate()).padStart(2, '0');
                return (
                  <div
                    key={cell.date}
                    tabIndex={cell.day ? 0 : undefined}
                    aria-label={`${day}: ${st.label}`}
                    className={`group/cell relative flex h-11 min-w-0 items-start justify-between rounded-lg border px-1.5 pb-1.5 pt-1.5 outline-none transition-shadow duration-150 hover:z-10 hover:ring-[3px] focus-visible:z-10 focus-visible:ring-[3px] ${st.box} ${st.ring}`}
                  >
                    {isToday ? (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-[11px] font-semibold leading-[18px] text-brand">{day}</span>
                    ) : (
                      <span className={`text-[11px] leading-[18px] ${cell.state === 'completed' && cell.assigned ? 'text-white' : 'text-ink'}`}>{day}</span>
                    )}
                    <span className="self-end">
                      <TileGlyph cell={cell} size={16} />
                    </span>
                    {cell.day && <DayTooltip cell={cell} day={cell.day} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <TileLegend cells={cells} />
    </TileCard>
  );
}

/** The Training tab in the picked option, with the program card under it as now. */
export function TrainingChartOption({ option, log, today }: { option: Exclude<ChartOption, 'current'>; log: TrainingLog; today: string }) {
  const s = summarizeTraining(log, today);
  return (
    <div className="flex w-full flex-col gap-[15px]">
      {option === 'figma' ? <FigmaTiles log={log} today={today} /> : option === 'icons' ? <IconCalendar log={log} today={today} /> : option === 'weeks' ? <WeeklyRows log={log} today={today} /> : <CompactTiles log={log} today={today} />}
      <div className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-elevated p-px">
        <CardHeader title="Program" link="View program" />
        <div className="flex flex-col p-3">
          <Row label="Name" value={s.program.name} />
          <Row label="Progress" value={`Week ${s.program.week} of ${s.program.weeks}`} />
          <Row label="End Date" value={formatMonthDay(parseDay(s.program.endsOn))} />
          <Row label="Next Program" value={s.program.nextProgram ?? 'Not assigned'} muted={!s.program.nextProgram} last />
        </div>
      </div>
    </div>
  );
}

/** Where the bar's shortcut lands: Clint's Check-in panel opens on Nutrition, so his detail page on Training. */
const SHOWCASE = 'clint-jacobi';

/** The trial's switcher, a dark bar at the bottom left like the Notes trial's (not product UI). */
export function ChartTrialBar() {
  const option = useChartOption();
  const { selectClient } = useStore();
  const active = CHART_OPTIONS.find((o) => o.key === option)!;
  return (
    <div data-keep-open className="fixed bottom-4 left-[80px] z-[45] flex flex-col items-start gap-1.5 rounded-xl bg-ink px-3 py-2.5 text-white shadow-[0_8px_24px_rgba(32,35,83,0.28)]">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/60">Training chart</span>
        <div role="tablist" aria-label="Training chart option" className="flex rounded-lg bg-white/10 p-0.5">
          {CHART_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={option === o.key}
              onClick={() => setChartOption(o.key)}
              className={`h-7 whitespace-nowrap rounded-md px-3 text-[12px] font-semibold ${option === o.key ? 'bg-white text-ink' : 'text-white/80 hover:text-white'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <span className="h-5 w-px bg-white/20" />
        <button
          type="button"
          onClick={() => selectClient(SHOWCASE, 'training')}
          className="h-7 whitespace-nowrap rounded-md px-2 text-[12px] font-semibold text-white/80 hover:bg-white/10 hover:text-white"
        >
          Open Clint’s training
        </button>
      </div>
      <p className="text-[11px] leading-4 text-white/70">{active.hint}</p>
    </div>
  );
}
