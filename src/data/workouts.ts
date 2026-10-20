import type { Workout } from './types';

/**
 * Names for the workouts on a training day. A day's plan names its first workout; the rest come from a pool that
 * fits it (a lower-body day gets lower-body work), in order and never repeating a name on the same day.
 */
const POOLS: [RegExp, string[]][] = [
  [/lower|leg|glute/i, ['Glutes & Legs', 'Glute Focus', 'Leg Day', 'Lower Body Burn', 'Hamstring Builder']],
  [/upper|push|pull|arm/i, ['Push Day', 'Pull Day', 'Arms & Shoulders', 'Back & Biceps', 'Chest & Triceps']],
  [/interval|condition|cardio/i, ['HIIT Intervals', 'Bike Sprints', 'Rowing Intervals', 'Core Finisher', 'Cooldown Stretch']],
  [/walk|mobility/i, ['Mobility Flow', 'Hip Openers', 'Core Stability', 'Foam Roll', 'Breathing Reset']],
  [/./, ['Strength Block', 'Core Finisher', 'Conditioning', 'Mobility Flow', 'Cooldown Stretch']],
];

/** A day carries at most this many workouts (the user's call). */
export const MAX_WORKOUTS_PER_DAY = 2;

/** Stable 0–99 from a day's key, so a day keeps its shape on every render. */
function roll(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 100;
}

/**
 * The workouts on one training day, led by `first`. Most days carry one workout and some carry two (the user's
 * call): about one in five, or one in two when the plan was only partly done, so Partial days still show (1 of 2).
 * A plan written with more workouts is scaled down keeping whether anything was done: none stays none, any stays
 * at least one, all stays all. So "last workout" and every "nothing logged" read the same as the plan.
 */
export function dayWorkouts(first: string, planned: number, plannedDone: number, seed: string): Workout[] {
  const partial = plannedDone > 0 && plannedDone < planned;
  const two = roll(`${seed}:${first}`) < (partial ? 50 : 20);
  const count = Math.min(planned, two ? MAX_WORKOUTS_PER_DAY : 1);
  const done = plannedDone <= 0 ? 0 : count === 1 || plannedDone >= planned ? count : 1;
  const pool = (POOLS.find(([re]) => re.test(first))?.[1] ?? []).filter((n) => n.toLowerCase() !== first.toLowerCase());
  // Title Case, as the design writes workout names ("Lower Body Strength").
  const lead = first.replace(/\b\w/g, (c) => c.toUpperCase());
  return Array.from({ length: count }, (_, i) => ({ name: i === 0 ? lead : pool[(i - 1) % pool.length], done: i < done }));
}
