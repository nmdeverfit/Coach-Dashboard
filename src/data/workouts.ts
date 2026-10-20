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

/**
 * Up to `MAX_WORKOUTS_PER_DAY` workouts led by `first`. A plan written with more is scaled down keeping its state:
 * none done stays none, all done stays all, anything between becomes one of two.
 */
export function dayWorkouts(first: string, planned: number, plannedDone: number): Workout[] {
  const count = Math.min(planned, MAX_WORKOUTS_PER_DAY);
  const done = plannedDone <= 0 ? 0 : plannedDone >= planned ? count : Math.min(plannedDone, count - 1);
  const pool = (POOLS.find(([re]) => re.test(first))?.[1] ?? []).filter((n) => n.toLowerCase() !== first.toLowerCase());
  // Title Case, as the design writes workout names ("Lower Body Strength").
  const lead = first.replace(/\b\w/g, (c) => c.toUpperCase());
  return Array.from({ length: count }, (_, i) => ({ name: i === 0 ? lead : pool[(i - 1) % pool.length], done: i < done }));
}
