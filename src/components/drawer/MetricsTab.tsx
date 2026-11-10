import { useEffect, useId, useRef, useState } from 'react';
import iconDown from '../../assets/figma/icon-down-time.svg';
import iconEye from '../../assets/figma/icon-eye.svg';
import iconStack from '../../assets/figma/icon-img-stack.svg';
import iconMetricDown from '../../assets/figma/icon-metric-down.svg';
import { METRICS, bodyMetrics, type MetricDef, type MetricPoint } from '../../data/bodyMetrics';
import type { Client } from '../../data/types';
import { METRIC_RANGES, axisDate, axisWeekday, metricNumber, metricView, photoDate, yTicks, type MetricRange, type MetricView } from '../../lib/bodyMetrics';
import { daysBetween, parseDay } from '../../lib/dates';
import { CardHeader } from './NutritionTab';
import { ProgressPhotoPopup } from './ProgressPhotoPopup';
import { openMetricsPage } from '../../lib/metricsPage';
import { useStore } from '../../state/store';
import { usePhotos } from '../../lib/photoStore';

/**
 * Metrics & Photos (the user's call; Figma 6565:468678, the client detail page's tab between Task & Habit and Program
 * Ending): Progress Photos, then Body Metrics (Shoulder · Hip · Weight · Step). Only in the `build:artifact:metrics`
 * page. Every number comes from `data/bodyMetrics.ts` through `lib/bodyMetrics.ts`.
 */
export function MetricsTab({ client }: { client: Client }) {
  return (
    <div className="flex w-full flex-col gap-[15px]">
      <PhotosCard client={client} />
      <BodyMetricsCard client={client} />
    </div>
  );
}

const CARD = 'flex w-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-elevated p-px shadow-card';

/* ------------------------------------------------------------------ Progress Photos */

function PhotosCard({ client }: { client: Client }) {
  const photos = usePhotos(client.id);
  const [viewer, setViewer] = useState<{ start: string; compare: boolean } | null>(null);
  return (
    <div className={CARD}>
      <CardHeader title="Progress Photos" />
      <div className="flex flex-col gap-2.5 p-[15px]">
        {photos.length === 0 ? (
          <p className="py-6 text-center text-[13px] leading-[1.5] text-ink-muted">No progress photos from {client.firstName} yet.</p>
        ) : (
          <>
            {/* Eight 72 px photos just overflow the card, so the thin bar under them shows there is more (as drawn). */}
            <div className="scroll-photos -mb-1 flex gap-2 overflow-x-auto pb-2.5">
              {photos.map((p) => (
                <button key={p.id} type="button" onClick={() => setViewer({ start: p.id, compare: false })} className="group flex shrink-0 flex-col items-center gap-2">
                  <span className="block size-[72px] overflow-hidden rounded-[4px] ring-brand/0 transition group-hover:ring-2 group-hover:ring-brand/40">
                    <img src={p.src} alt={`${client.firstName}, ${axisDate(p.date)}`} className="size-full object-cover object-top" />
                  </span>
                  <span className="text-[14px] leading-[1.5] text-ink-secondary">{photoDate(p.date)}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-7 pr-2">
              <button type="button" onClick={() => setViewer({ start: photos[0].id, compare: false })} className="flex items-center gap-2 text-[14px] font-semibold leading-[15px] text-ink-secondary hover:text-ink">
                {/* eye 1, in Figma's inset wrapper */}
                <span className="relative size-5 shrink-0" aria-hidden>
                  <span className="absolute inset-[0.96%_1.92%_0.96%_0]">
                    <img src={iconEye} alt="" className="absolute inset-0 block size-full max-w-none" />
                  </span>
                </span>
                View All
              </button>
              <button
                type="button"
                disabled={photos.length < 2}
                onClick={() => setViewer({ start: photos[0].id, compare: true })}
                className="flex items-center gap-2 text-[14px] font-semibold leading-[15px] text-brand hover:underline disabled:opacity-40"
              >
                <span className="relative size-5 shrink-0" aria-hidden>
                  <span className="absolute inset-[15.38%]">
                    <img src={iconStack} alt="" className="absolute inset-0 block size-full max-w-none" />
                  </span>
                </span>
                Compare
              </button>
            </div>
          </>
        )}
      </div>
      {viewer && <ProgressPhotoPopup client={client} photos={photos} startId={viewer.start} compare={viewer.compare} onClose={() => setViewer(null)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Body Metrics */

export function TimeControl({ value, onChange }: { value: MetricRange; onChange: (w: MetricRange) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-[30px] items-center gap-[5px] rounded-[5px] border bg-white pl-2.5 pr-[5px] text-[12px] font-semibold leading-[1.5] text-[#273d52] ${
          open ? 'border-brand' : 'border-[#e1e1ea] hover:border-ink-muted'
        }`}
      >
        {METRIC_RANGES.find((r) => r.weeks === value)?.label}
        <img src={iconDown} alt="" width={16} height={16} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-full z-20 mt-1 w-[140px] animate-fade-in overflow-hidden rounded-[5px] border border-[#e1e1ea] bg-white py-1 shadow-[0_4px_16px_rgba(32,35,83,0.12)]">
          {METRIC_RANGES.map((r) => (
            <li key={r.weeks}>
              <button
                type="button"
                role="option"
                aria-selected={r.weeks === value}
                onClick={() => {
                  onChange(r.weeks);
                  setOpen(false);
                }}
                className={`flex w-full px-3 py-2 text-left text-[12px] leading-[1.5] hover:bg-surface-secondary ${
                  r.weeks === value ? 'font-semibold text-brand' : 'text-ink'
                }`}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BodyMetricsCard({ client }: { client: Client }) {
  const { selectClient } = useStore();
  const logs = bodyMetrics(client);
  const [weeks, setWeeks] = useState<MetricRange>(2);
  return (
    <div className={CARD}>
      <CardHeader
        title="Body Metrics"
        link="View all metrics"
        onClick={() => {
          // The client's Metrics page takes the page's place, so the panel closes first.
          selectClient(null);
          openMetricsPage(client.id);
        }}
      />
      <div className="flex flex-col gap-2.5 p-[15px]">
        {!logs ? (
          <p className="py-6 text-center text-[13px] leading-[1.5] text-ink-muted">No body metrics from {client.firstName} yet.</p>
        ) : (
          <>
            <div className="flex justify-end">
              <TimeControl value={weeks} onChange={setWeeks} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {METRICS.map((m) => (
                <MetricCard key={m.key} def={m} view={metricView(m.key, logs[m.key], weeks)} weeks={weeks} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Up or down since the range's first entry: the design's red chip for down, a green one for up (no frame for up). */
function ChangeChip({ change }: { change: number }) {
  const down = change < 0;
  return (
    <span className={`flex items-center gap-1 rounded-[4px] p-1 ${down ? 'bg-[#faedef]' : 'bg-[#e8f6ef]'}`}>
      <img src={iconMetricDown} alt="" width={12} height={12} className={down ? '' : 'rotate-180 [filter:hue-rotate(160deg)_saturate(0.9)_brightness(0.8)]'} />
      <span className={`text-[10px] font-semibold leading-none tracking-[0.5px] ${down ? 'text-[#fe2c55]' : 'text-[#059669]'}`}>
        {Math.abs(change).toFixed(1)} %
      </span>
    </span>
  );
}

/** Sleep reads "6 h 58 min", in its parts (the Metrics page's card). */
function Headline({ def, value }: { def: MetricDef; value: number | null }) {
  if (value === null) return <span className="flex h-[25px] items-center text-[23px] font-semibold leading-[1.5] text-[#273d52]">—</span>;
  if (def.key === 'sleep') {
    const h = Math.floor(value / 60);
    const m = value % 60;
    return (
      <span className="flex items-end gap-[3px] font-semibold text-[#273d52]">
        <span className="text-[23px] leading-[25px]">{h}</span>
        <span className="text-[15px] leading-[19px]">h</span>
        <span className="pl-1 text-[23px] leading-[25px]">{m}</span>
        <span className="text-[15px] leading-[19px]">min</span>
      </span>
    );
  }
  return <span className="flex h-[25px] items-center text-[23px] font-semibold leading-[1.5] text-[#273d52]">{metricNumber(def.key, value)}</span>;
}

/**
 * One metric card: the tab's 216 px card (Figma 6565:468810), or on the Metrics page a taller one with a wider plot
 * (`plotW`, `plotH`) whose lines zoom to their values (`zoom`), as Everfit's All Metrics draws them.
 */
export function MetricCard({
  def,
  view,
  weeks,
  plotW = PLOT_W,
  plotH = PLOT_H,
  zoom = false,
  height = 216,
}: {
  def: MetricDef;
  view: MetricView;
  weeks: MetricRange;
  plotW?: number;
  plotH?: number;
  zoom?: boolean;
  height?: number;
}) {
  const steps = def.key === 'steps';
  return (
    <div className="flex flex-col overflow-hidden rounded-[5px] border border-[#f0f0f2] bg-white" style={{ height }}>
      <div className="flex flex-col gap-2.5 border-b border-[#f0f0f2] px-4 py-3">
        <p className="text-[13px] font-semibold leading-[1.5] text-[#273d52]">{def.label}</p>
        <div className="flex items-end gap-[11px]">
          <div className="flex items-end gap-[5px]">
            <Headline def={def} value={view.value} />
            {def.key !== 'sleep' && (
              <span className={`flex h-[19px] items-center font-semibold leading-[1.5] ${steps ? 'text-[13px] text-[#7b7e91]' : 'text-[15px] text-[#273d52]'}`}>
                {steps ? 'Average last 7 days' : def.unit}
              </span>
            )}
          </div>
          {/* No chip with fewer than two entries, or no change at all. */}
          {view.change !== null && view.change !== 0 && <ChangeChip change={view.change} />}
        </div>
      </div>
      <Chart def={def} view={view} weeks={weeks} plotW={plotW} plotH={plotH} zoom={zoom} />
    </div>
  );
}

/** Plot geometry, from the frame: 47 px of axis on the left, 20 px of padding on the right, an 84 px plot. */
const PLOT_H = 84;
const PLOT_W = 236;

function Tip({ def, point }: { def: MetricDef; point: MetricPoint }) {
  return (
    <span className="pointer-events-none flex flex-col gap-2.5 whitespace-nowrap rounded-[5px] border border-[#fbfbfb] bg-white p-2.5 shadow-[0_1px_4px_rgba(38,38,38,0.2)]">
      <span className="text-[12px] font-semibold leading-[1.5] text-[#7b7e91]">{axisDate(point.date)}</span>
      <span className="flex items-center gap-[3px]">
        <span className="text-[15px] font-semibold leading-[10px] text-ink">
          {def.key === 'sleep' ? `${Math.floor(point.value / 60)} h ${point.value % 60}` : metricNumber(def.key, point.value)}
        </span>
        <span className="text-[12px] font-semibold leading-[11px] text-ink">{def.unit}</span>
        <span className="flex items-center gap-1 pl-[3px] text-[10px] leading-[1.5] text-[#a3a3b5]">
          <span className="size-[2px] rounded-full bg-[#a3a3b5]" />
          Last value
        </span>
      </span>
    </span>
  );
}

/** A zoomed axis for a line on the Metrics page: three round steps above a base just under the lowest value. */
function zoomTicks(values: number[]): { base: number; ticks: number[] } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const raw = Math.max((hi - lo) / 2.5, Math.abs(hi) * 0.01, 0.1);
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= raw) ?? 10 * p;
  const base = Math.floor(lo / step) * step - step;
  return { base, ticks: [base + step, base + 2 * step, base + 3 * step, base + 4 * step].filter((t) => t <= base + 4 * step) };
}

const tickLabel = (key: MetricDef['key'], t: number) => (key === 'sleep' ? `${Math.round(t / 60)}h` : Number.isInteger(t) ? t.toLocaleString('en-US') : t.toFixed(1));

function Chart({
  def,
  view,
  weeks,
  plotW: PLOT_W,
  plotH: PLOT_H,
  zoom,
}: {
  def: MetricDef;
  view: MetricView;
  weeks: MetricRange;
  plotW: number;
  plotH: number;
  zoom: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gradient = useId();
  const pts = view.points;
  // Sleep's axis steps in whole hours.
  const scale = def.key === 'sleep' ? 60 : 1;
  const zoomed = zoom && def.chart === 'line' && pts.length > 0 ? zoomTicks(pts.map((p) => p.value)) : null;
  const ticks = zoomed ? zoomed.ticks : yTicks(Math.max(0, ...pts.map((p) => p.value)) / scale).map((t) => t * scale);
  const base = zoomed ? zoomed.base : 0;
  const top = ticks[ticks.length - 1];
  const y = (v: number) => PLOT_H - ((v - base) / (top - base)) * PLOT_H;
  // Bars are 10 px as drawn, 20 px on a wide Step chart, thinner when a long range packs many in.
  const bw = def.key === 'steps' ? (PLOT_W > 300 ? 20 : 10) : Math.max(4, Math.min(10, PLOT_W / Math.max(1, pts.length) / 1.8));
  const span = Math.max(1, daysBetween(view.from, view.to));
  // Bars sit evenly from edge to edge (as drawn), Step's on its seven day slots so a day with no steps logged stays
  // empty; a line places each entry on its day.
  const steps = def.key === 'steps';
  const x = (i: number) =>
    steps
      ? (daysBetween(view.from, pts[i].date) * (PLOT_W - bw)) / 6
      : def.chart === 'bar'
        ? pts.length === 1
          ? (PLOT_W - bw) / 2
          : (i * (PLOT_W - bw)) / (pts.length - 1)
        : (daysBetween(view.from, pts[i].date) / span) * PLOT_W;
  // Axis labels: every bar on the step chart, first · middle · last bar on the other bar chart, three dates on a line.
  const labels: { at: number; text: string }[] =
    def.chart === 'line'
      ? [0, 0.5, 1].map((f) => ({ at: f * PLOT_W, text: axisDate(addDaysIso(view.from, Math.round(f * span))) }))
      : steps
        ? [0, 1, 2, 3, 4, 5, 6].map((d) => ({ at: (d * (PLOT_W - bw)) / 6 + bw / 2, text: axisWeekday(addDaysIso(view.from, d)) }))
        : [...new Set([0, Math.floor((pts.length - 1) / 2), pts.length - 1])].filter((i) => i >= 0).map((i) => ({ at: x(i) + bw / 2, text: axisDate(pts[i].date) }));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col pb-[15px] pl-[5px] pr-5 pt-[15px]">
      <div className="relative" style={{ height: PLOT_H }}>
        {/* y axis: three steps (the 0 row is hidden, as drawn), right-aligned in a 32 px column */}
        {ticks.map((t) => (
          <span key={t} className="absolute left-0 w-8 -translate-y-1/2 text-right text-[10px] font-semibold leading-[1.5] text-[#7b7e91]" style={{ top: y(t) }}>
            {tickLabel(def.key, t)}
          </span>
        ))}
        <div className="absolute inset-y-0 left-[42px] right-0 border-b border-[#f0f0f2]" />
        <div className="absolute inset-y-0 right-0" style={{ left: 42, width: PLOT_W }} onMouseLeave={() => setHover(null)}>
          {pts.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-[12px] leading-[1.5] text-ink-muted">
              Nothing logged in the last {def.key === 'steps' ? '7 days' : `${weeks} weeks`}
            </p>
          )}
          {def.chart === 'bar'
            ? pts.map((p, i) => (
                <span
                  key={p.date}
                  onMouseEnter={() => setHover(i)}
                  className="absolute bottom-0 box-content rounded-t-[3px]"
                  style={{
                    width: bw,
                    left: x(i) - (hover === i ? 3 : 0),
                    height: PLOT_H - y(p.value) - (hover === i ? 3 : 0),
                    background: def.color,
                    border: hover === i ? `3px solid ${def.color}33` : undefined,
                    borderBottom: 'none',
                    backgroundClip: 'padding-box',
                  }}
                />
              ))
            : pts.length > 0 && (
                <svg width={PLOT_W} height={PLOT_H} className="absolute inset-0 overflow-visible">
                  <defs>
                    <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={def.color} stopOpacity="0.16" />
                      <stop offset="1" stopColor={def.color} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M${x(0)},${PLOT_H} ${pts.map((p, i) => `L${x(i)},${y(p.value)}`).join(' ')} L${x(pts.length - 1)},${PLOT_H} Z`}
                    fill={`url(#${gradient})`}
                  />
                  <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')} fill="none" stroke={def.color} strokeWidth="2" strokeLinejoin="round" />
                  {hover !== null && <circle cx={x(hover)} cy={y(pts[hover].value)} r="4" fill="white" stroke={def.color} strokeWidth="2" />}
                  {/* One hover strip per entry, split halfway to its neighbours. */}
                  {pts.map((p, i) => {
                    const l = i ? (x(i - 1) + x(i)) / 2 : 0;
                    const r = i < pts.length - 1 ? (x(i) + x(i + 1)) / 2 : PLOT_W;
                    return <rect key={p.date} x={l} y={0} width={Math.max(1, r - l)} height={PLOT_H} fill="transparent" onMouseEnter={() => setHover(i)} />;
                  })}
                </svg>
              )}
          {hover !== null && pts[hover] && (
            <span
              className="absolute z-10 -translate-x-1/2 -translate-y-full"
              style={{ left: Math.min(Math.max(def.chart === 'bar' ? x(hover) + bw / 2 : x(hover), 60), PLOT_W - 40), top: y(pts[hover].value) - 8 }}
            >
              <Tip def={def} point={pts[hover]} />
            </span>
          )}
        </div>
      </div>
      {/* x axis: 5 px ticks, then 9 px uppercase dates */}
      <div className="relative mt-[3px] h-[23px]" style={{ marginLeft: 42, width: PLOT_W }}>
        {labels.map((l) => (
          <span key={l.at} className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-[3px]" style={{ left: l.at }}>
            <span className="h-[5px] w-px bg-[#e1e1ea]" />
            <span className="whitespace-nowrap text-[9px] font-semibold uppercase leading-[1.5] text-[#7b7e91]">{l.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function addDaysIso(iso: string, n: number) {
  const d = parseDay(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
