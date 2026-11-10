import { addDays } from '../lib/checkin';
import p0806 from '../assets/progress/p0806.jpg';
import p0808 from '../assets/progress/p0808.jpg';
import p0816 from '../assets/progress/p0816.jpg';
import p0820 from '../assets/progress/p0820.jpg';
import p0824 from '../assets/progress/p0824.jpg';
import p0828 from '../assets/progress/p0828.jpg';
import p0831 from '../assets/progress/p0831.jpg';
import { DEMO_TODAY, generatedStatus } from './mock';
import { random } from './profiles';
import type { Client, ClientStatus } from './types';

/**
 * Body metrics and progress photos (the Metrics & Photos trial, the user's call; Figma 6565:468678). Only the
 * `build:artifact:metrics` page shows them. Every figure on the tab comes from these logs (`lib/bodyMetrics.ts`).
 */

export type MetricKey = 'shoulder' | 'hip' | 'weight' | 'steps';

export interface MetricPoint {
  /** ISO day. */
  date: string;
  value: number;
}

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  /** As drawn: Shoulder and Steps as bars, Hip and Weight as lines. */
  chart: 'bar' | 'line';
  /** Figma Colors/Chart 1 (#7856FF), the Hip line's #CA80DC and Colors/Chart 2 (#FF7557). */
  color: string;
}

/** The four cards, in the design's order (Shoulder · Hip, Weight · Step). */
export const METRICS: MetricDef[] = [
  { key: 'shoulder', label: 'Shoulder', unit: 'cm', chart: 'bar', color: '#7856ff' },
  { key: 'hip', label: 'Hip', unit: 'cm', chart: 'line', color: '#ca80dc' },
  { key: 'weight', label: 'Weight', unit: 'kg', chart: 'line', color: '#7856ff' },
  { key: 'steps', label: 'Step', unit: 'steps', chart: 'bar', color: '#ff7557' },
];

/** The logs go back eight weeks, the longest range the time control offers; nothing is logged today yet (06:00). */
export const METRICS_FROM = addDays(DEMO_TODAY, -56);
const METRICS_TO = addDays(DEMO_TODAY, -1);

/** How often a client logs, by the 06:00 status: an At risk client weighs in and measures least. */
const LOGGING: Record<ClientStatus, { share: number; trend: [number, number]; steps: [number, number] }> = {
  on_track: { share: 0.95, trend: [-0.05, -0.025], steps: [7500, 10500] },
  needs_attention: { share: 0.7, trend: [-0.015, 0.005], steps: [5500, 8000] },
  at_risk: { share: 0.45, trend: [0.005, 0.015], steps: [3500, 6000] },
  no_activities: { share: 0, trend: [0, 0], steps: [0, 0] },
};

/**
 * Clint's own figures, so his cards read like his photos (the rest are seeded): he measures and photographs himself
 * every few days and has been losing weight for eight weeks, whatever his nutrition logging says this week.
 */
const BASES: Record<string, { weight: number; shoulder: number; hip: number; share: number; trend: number; steps: number }> = {
  'clint-jacobi': { weight: 87.2, shoulder: 117.5, hip: 100.5, share: 0.92, trend: -0.06, steps: 7800 },
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const cache = new Map<string, Record<MetricKey, MetricPoint[]> | null>();

/**
 * A client's body metric logs from `METRICS_FROM` to yesterday: weight every other day, shoulder and hip every fourth
 * day, steps daily, each skipped at random as the client's status logs less. A client with no activity has none.
 */
export function bodyMetrics(client: Client): Record<MetricKey, MetricPoint[]> | null {
  if (cache.has(client.id)) return cache.get(client.id)!;
  const status = generatedStatus(client);
  const how = LOGGING[status];
  if (!how.share) {
    cache.set(client.id, null);
    return null;
  }
  const rnd = random(`${client.id}:metrics`);
  const pick = ([a, b]: [number, number]) => a + (b - a) * rnd();
  const own = BASES[client.id];
  const base = own ?? { weight: pick([56, 92]), shoulder: pick([98, 122]), hip: pick([88, 108]) };
  const trend = own?.trend ?? pick(how.trend);
  const steps = own?.steps ?? pick(how.steps);
  const share = own?.share ?? how.share;
  const offset = Math.floor(rnd() * 4);
  const out: Record<MetricKey, MetricPoint[]> = { shoulder: [], hip: [], weight: [], steps: [] };
  const days = 56;
  for (let i = 0; i < days; i++) {
    const date = addDays(METRICS_FROM, i);
    if (date > METRICS_TO) break;
    const t = i / (days - 1);
    const logs = () => rnd() < share;
    if (i % 2 === offset % 2 && logs()) out.weight.push({ date, value: round1(base.weight * (1 + trend * t) + (rnd() - 0.5) * 0.8) });
    if (i % 4 === offset) {
      if (logs()) out.shoulder.push({ date, value: round1(base.shoulder * (1 + trend * 0.4 * t) + (rnd() - 0.5) * 0.6) });
      if (logs()) out.hip.push({ date, value: round1(base.hip * (1 + trend * 0.8 * t) + (rnd() - 0.5) * 0.6) });
    }
    if (logs()) out.steps.push({ date, value: Math.round((steps * (0.8 + rnd() * 0.4)) / 10) * 10 });
  }
  cache.set(client.id, out);
  return out;
}

export interface ProgressPhoto {
  /** ISO day the photo was taken. */
  date: string;
  src: string;
}

/**
 * Progress photos, newest first. Only Clint has them (the design's set, on its dates; the 08/20 and 08/12 photos are
 * the same picture in the design, kept as drawn); everyone else's card shows its empty state.
 */
const PHOTOS: Record<string, ProgressPhoto[]> = {
  'clint-jacobi': [
    { date: '2026-08-31', src: p0831 },
    { date: '2026-08-28', src: p0828 },
    { date: '2026-08-24', src: p0824 },
    { date: '2026-08-20', src: p0820 },
    { date: '2026-08-16', src: p0816 },
    { date: '2026-08-12', src: p0820 },
    { date: '2026-08-08', src: p0808 },
    { date: '2026-08-06', src: p0806 },
  ],
};

export const progressPhotos = (clientId: string): ProgressPhoto[] => PHOTOS[clientId] ?? [];
