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

/** `count` workouts led by `first`; the first `done` of them were completed. */
export function dayWorkouts(first: string, count: number, done: number): Workout[] {
  const pool = (POOLS.find(([re]) => re.test(first))?.[1] ?? []).filter((n) => n.toLowerCase() !== first.toLowerCase());
  // Title Case, as the design writes workout names ("Lower Body Strength").
  const lead = first.replace(/\b\w/g, (c) => c.toUpperCase());
  return Array.from({ length: count }, (_, i) => ({ name: i === 0 ? lead : pool[(i - 1) % pool.length], done: i < done }));
}
