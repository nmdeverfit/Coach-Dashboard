import { type MetricKey, type MetricPoint } from '../data/bodyMetrics';
import { DEMO_TODAY } from '../data/mock';
import { addDays } from './checkin';
import { formatMonthDay, parseDay } from './dates';

/** The Body Metrics card's time control (Figma 6565:468807 reads "Last 2 weeks"). */
export type MetricRange = 2 | 4 | 8;
export const METRIC_RANGES: { weeks: MetricRange; label: string }[] = [
  { weeks: 2, label: 'Last 2 weeks' },
  { weeks: 4, label: 'Last 4 weeks' },
  { weeks: 8, label: 'Last 8 weeks' },
];

/** First and last day a range covers: the finished days before today (Monday 06:00, nothing logged yet). */
export function rangeDays(weeks: MetricRange): { from: string; to: string } {
  return { from: addDays(DEMO_TODAY, -7 * weeks), to: addDays(DEMO_TODAY, -1) };
}

export interface MetricView {
  key: MetricKey;
  points: MetricPoint[];
  /** The headline: the last value in the range, or for steps the average of the last 7 days' logged days. */
  value: number | null;
  /** Last value against the first in the range, in %, one decimal; null with fewer than two entries. */
  change: number | null;
  from: string;
  to: string;
}

/**
 * One card's figures. Shoulder, hip and weight follow the time control; Step always reads the last 7 days, as its
 * card is drawn ("Average last 7 days" over seven daily bars).
 */
export function metricView(key: MetricKey, log: MetricPoint[], weeks: MetricRange): MetricView {
  if (key === 'steps') {
    const from = addDays(DEMO_TODAY, -7);
    const to = addDays(DEMO_TODAY, -1);
    const points = log.filter((p) => p.date >= from && p.date <= to);
    const value = points.length ? Math.round(points.reduce((s, p) => s + p.value, 0) / points.length / 10) * 10 : null;
    return { key, points, value, change: null, from, to };
  }
  const { from, to } = rangeDays(weeks);
  const points = log.filter((p) => p.date >= from && p.date <= to);
  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  const change = points.length > 1 && first ? Math.round(((last! - first) / first) * 1000) / 10 : null;
  return { key, points, value: last ?? null, change, from, to };
}

/** Three y-axis steps (the design's 50 · 100 · 150): a round step whose three times clear the highest value. */
export function yTicks(max: number): number[] {
  const raw = Math.max(max, 1) / 2.2;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s * 3 >= max * 1.1) ?? 10 * p;
  return [step, step * 2, step * 3];
}

/** "AUG 17", as the chart's axis reads (uppercase in CSS). */
export const axisDate = (iso: string) => formatMonthDay(parseDay(iso));
/** "SUN", the step chart's weekday labels. */
export const axisWeekday = (iso: string) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseDay(iso).getUTCDay()];
/** "08/31", the photos' date line. */
export const photoDate = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
/** 8,350 for steps, 82.4 for the rest. */
export const metricNumber = (key: MetricKey, v: number) => (key === 'steps' ? v.toLocaleString('en-US') : String(v));
