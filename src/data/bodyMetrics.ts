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

export type MetricKey = 'shoulder' | 'hip' | 'weight' | 'steps' | 'sleep' | 'rhr' | 'bodyFat' | 'bmi';

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

/**
 * Every metric, in the client's Metrics page order (the user's screenshot of Everfit's All Metrics: Steps, Sleep,
 * Weight, Resting Heart Rate, Body Fat, BMI, then the tab's tape measures). Sleep is in minutes.
 */
export const ALL_METRICS: MetricDef[] = [
  { key: 'steps', label: 'Steps', unit: 'steps', chart: 'bar', color: '#ff5e45' },
  { key: 'sleep', label: 'Sleep', unit: 'min', chart: 'bar', color: '#3ed3b4' },
  { key: 'weight', label: 'Weight', unit: 'kg', chart: 'line', color: '#184eff' },
  { key: 'rhr', label: 'Resting Heart Rate', unit: 'bpm', chart: 'line', color: '#184eff' },
  { key: 'bodyFat', label: 'Body Fat', unit: '%', chart: 'line', color: '#184eff' },
  { key: 'bmi', label: 'BMI', unit: '', chart: 'line', color: '#184eff' },
  { key: 'shoulder', label: 'Shoulder', unit: 'cm', chart: 'bar', color: '#7856ff' },
  { key: 'hip', label: 'Hip', unit: 'cm', chart: 'line', color: '#ca80dc' },
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
  const photoDays = new Set((PHOTOS[client.id] ?? []).map((p) => p.date));
  const out: Record<MetricKey, MetricPoint[]> = { shoulder: [], hip: [], weight: [], steps: [], sleep: [], rhr: [], bodyFat: [], bmi: [] };
  const days = 56;
  for (let i = 0; i < days; i++) {
    const date = addDays(METRICS_FROM, i);
    if (date > METRICS_TO) break;
    const t = i / (days - 1);
    const logs = () => rnd() < share;
    // A photo day is a weigh-in day (the popup shows the photo's weight); the rest every other day.
    const photoDay = photoDays.has(date) || photoDays.has(addDays(date, 1));
    if ((photoDay || i % 2 === offset % 2) && (photoDay || logs())) out.weight.push({ date, value: round1(base.weight * (1 + trend * t) + (rnd() - 0.5) * 0.8) });
    if (i % 4 === offset) {
      if (logs()) out.shoulder.push({ date, value: round1(base.shoulder * (1 + trend * 0.4 * t) + (rnd() - 0.5) * 0.6) });
      if (logs()) out.hip.push({ date, value: round1(base.hip * (1 + trend * 0.8 * t) + (rnd() - 0.5) * 0.6) });
    }
    if (logs()) out.steps.push({ date, value: Math.round((steps * (0.8 + rnd() * 0.4)) / 10) * 10 });
  }
  // The Metrics page's extra metrics come from a second seed, so the tab's four cards keep their figures.
  const more = random(`${client.id}:metrics-more`);
  const height = own ? 1.83 : 1.58 + more() * 0.3;
  const sleep = 380 + more() * 80;
  const rhr = own ? 64 : 56 + more() * 18;
  const fat = 16 + more() * 14;
  const photos = new Map((PHOTOS[client.id] ?? []).map((p) => [p.date, p.bodyFat]));
  for (let i = 0; i < days; i++) {
    const date = addDays(METRICS_FROM, i);
    if (date > METRICS_TO) break;
    const t = i / (days - 1);
    if (more() < share) out.sleep.push({ date, value: Math.round(sleep + (more() - 0.5) * 110) });
    if (i % 3 === offset % 3 && more() < share) out.rhr.push({ date, value: Math.round(rhr + (more() - 0.5) * 6 - trend * 20 * t) });
    // Body fat: on a photo day the photo's own figure (they agree); otherwise weekly, drifting with the weight.
    const onPhoto = photos.get(date) ?? photos.get(addDays(date, 1));
    if (onPhoto != null) out.bodyFat.push({ date, value: onPhoto });
    else if (!photos.size && i % 7 === offset && more() < share) out.bodyFat.push({ date, value: round1(fat * (1 + trend * 1.5 * t) + (more() - 0.5)) });
  }
  // BMI from each weigh-in and the client's height.
  out.bmi = out.weight.map((p) => ({ date: p.date, value: round1(p.value / (height * height)) }));
  cache.set(client.id, out);
  return out;
}

export interface ProgressPhoto {
  /** Unique within the client: the day for the demo's set, a generated id for an upload. */
  id: string;
  /** ISO day the photo was taken. */
  date: string;
  src: string;
  /** Body fat logged with the photo, in % (the popup's "Body Fat"), when given. */
  bodyFat: number | null;
  /** Weight typed in with an upload; otherwise the photo reads the weight log (`weightOn`). */
  weight?: number;
  /** The popup's view filter (Front · Left · Right · Back), from the upload's tag; every demo photo is a front one. */
  angle?: PhotoAngle;
}

/**
 * Progress photos, newest first. Only Clint has them (the design's set, on its dates; the 08/20 and 08/12 photos are
 * the same picture in the design, kept as drawn); everyone else's card shows its empty state.
 */
const PHOTOS: Record<string, ProgressPhoto[]> = {
  'clint-jacobi': [
    { id: '2026-08-31', date: '2026-08-31', src: p0831, bodyFat: 16, angle: 'front' },
    { id: '2026-08-28', date: '2026-08-28', src: p0828, bodyFat: 17, angle: 'front' },
    { id: '2026-08-24', date: '2026-08-24', src: p0824, bodyFat: 18, angle: 'front' },
    { id: '2026-08-20', date: '2026-08-20', src: p0820, bodyFat: 20, angle: 'front' },
    { id: '2026-08-16', date: '2026-08-16', src: p0816, bodyFat: 21, angle: 'front' },
    { id: '2026-08-12', date: '2026-08-12', src: p0820, bodyFat: 22, angle: 'front' },
    { id: '2026-08-08', date: '2026-08-08', src: p0808, bodyFat: 23, angle: 'front' },
    { id: '2026-08-06', date: '2026-08-06', src: p0806, bodyFat: 24, angle: 'front' },
  ],
};

export type PhotoAngle = 'front' | 'left' | 'right' | 'back';

export const progressPhotos = (clientId: string): ProgressPhoto[] => PHOTOS[clientId] ?? [];

/** The weight shown with a photo: the last weigh-in on or before its day (from the same log as the Weight card). */
export function weightOn(client: Client, date: string): number | null {
  const log = bodyMetrics(client)?.weight ?? [];
  let last: number | null = null;
  for (const p of log) if (p.date <= date) last = p.value;
  return last;
}
