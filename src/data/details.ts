import type { FoodEntry, MealKey, NutritionLog, SessionType, TodoDetail, TrainingDay } from './types';
import { dayWorkouts } from './workouts';

/** Nothing assigned that day (no calendar entry at all). */
const NA = '-';

/**
 * Lays a weekly plan (Mon → Sun) onto real dates; each entry is [first workout, workouts assigned, completed], null
 * for a rest day,
 * or NA for a day with nothing assigned.
 */
function trainingWeeks(firstMonday: string, weeks: ([string, number, number] | null | typeof NA)[][]): Record<string, TrainingDay> {
  const days: Record<string, TrainingDay> = {};
  const start = new Date(`${firstMonday}T00:00:00Z`).getTime();
  weeks.forEach((week, w) =>
    week.forEach((entry, d) => {
      if (entry === NA) return;
      const date = new Date(start + (w * 7 + d) * 86_400_000).toISOString().slice(0, 10);
      days[date] = entry ? { kind: 'workout', workouts: dayWorkouts(entry[0], entry[1], entry[2], date) } : { kind: 'rest' };
    }),
  );
  return days;
}

/** A day of food logs: [name, carb, fat, protein] per food, grouped by meal. */
const foods = (meals: Partial<Record<MealKey, [string, number, number, number][]>>): Partial<Record<MealKey, FoodEntry[]>> =>
  Object.fromEntries(
    Object.entries(meals).map(([meal, list]) => [meal, list!.map(([name, carb, fat, protein]) => ({ name, carb, fat, protein }))]),
  );

// Session types as the coach set them up in Client Sessions (shared by Wendy's credits and Malcom's bookings).
export const PT: SessionType = { name: 'PT session', color: '#3975ff', minutes: 60, location: 'in_person' };
export const PILATES: SessionType = { name: 'Pilates', color: '#fcc54e', minutes: 60, location: 'in_person' };
export const ASSESSMENT: SessionType = { name: 'Assessment', color: '#fcc54e', minutes: 60, location: 'in_person' };
export const CONSULT: SessionType = { name: 'Consultant', color: '#ff6d4d', minutes: 60, location: 'in_person' };

const LEO_NUTRITION: NutritionLog = {
  // 260 g carb + 70 g fat + 150 g protein = 2,270 kcal
  targets: { carb: 260, fat: 70, protein: 150 },
  days: {
    '2026-08-24': foods({
      breakfast: [['Overnight oats', 62, 12, 24]],
      lunch: [['Chicken burrito bowl', 78, 18, 46]],
      dinner: [['Beef stir-fry with rice', 70, 20, 42]],
      snack: [['Protein shake', 10, 3, 30]],
    }),
    '2026-08-25': foods({
      breakfast: [['Eggs and toast', 30, 18, 24]],
      lunch: [['Tuna sandwich', 48, 14, 34]],
      dinner: [['Salmon, quinoa and greens', 54, 24, 40]],
    }),
    '2026-08-26': foods({
      breakfast: [['Overnight oats', 62, 12, 24]],
      lunch: [['Chicken burrito bowl', 78, 18, 46]],
      dinner: [['Turkey chili', 46, 14, 40]],
      snack: [['Greek yogurt with honey', 24, 4, 18]],
    }),
    '2026-08-27': foods({
      breakfast: [['Bagel with cream cheese', 56, 12, 12]],
      lunch: [['Poke bowl', 72, 16, 38]],
      dinner: [['Pasta with meatballs', 88, 26, 40]],
    }),
    '2026-08-28': foods({
      breakfast: [['Eggs and toast', 30, 18, 24]],
      lunch: [['Chicken Caesar wrap', 44, 22, 38]],
    }),
    '2026-08-30': foods({
      breakfast: [['Pancakes with berries', 74, 14, 14]],
      lunch: [['Chicken burrito bowl', 78, 18, 46]],
      dinner: [['Grilled steak and potatoes', 50, 28, 52]],
    }),
  },
};

/**
 * A logged day at about `kcal` calories: `protein` grams, fat at 28% of calories, carbs for the rest, split over
 * breakfast / lunch / dinner / snack as 25 / 30 / 35 / 10 %. Food names rotate so the Meal Log tooltips vary.
 */
const MEAL_SPLIT: [MealKey, number, string[]][] = [
  ['breakfast', 0.25, ['Oats with peanut butter', 'Egg and avocado toast', 'Protein pancakes']],
  ['lunch', 0.3, ['Chicken and rice bowl', 'Beef burrito', 'Salmon poke bowl']],
  ['dinner', 0.35, ['Steak, potatoes and greens', 'Chicken pasta', 'Turkey chili with rice']],
  ['snack', 0.1, ['Greek yogurt and granola', 'Protein shake', 'Trail mix']],
];
export function dayAt(kcal: number, protein: number, seed: number): Partial<Record<MealKey, FoodEntry[]>> {
  return Object.fromEntries(
    MEAL_SPLIT.map(([meal, share, names]) => {
      const p = Math.round(protein * share);
      const f = Math.round((kcal * share * 0.28) / 9);
      const c = Math.round((kcal * share - p * 4 - f * 9) / 4);
      return [meal, [{ name: names[seed % names.length], carb: c, fat: f, protein: p }]];
    }),
  );
}
/** Consecutive days from `first`, one [kcal, protein] pair per day; null skips a day (nothing logged). */
function loggedDays(first: string, entries: ([number, number] | null)[]): NutritionLog['days'] {
  const start = new Date(`${first}T00:00:00Z`).getTime();
  const days: NutritionLog['days'] = {};
  entries.forEach((e, i) => {
    if (e) days[new Date(start + i * 86_400_000).toISOString().slice(0, 10)] = dayAt(e[0], e[1], i);
  });
  return days;
}

const LEAN_A = 'Lean Strength A';
const LEAN_B = 'Lean Strength B';
const INTERVALS = 'Intervals';
const LEAN_C = 'Lean Strength C';

const FLOW = (n: number) => `Full-Body Integration & Flow ${n}`;

const UPPER = 'Upper body strength';
const LOWER = 'Lower body strength';
const COND = 'Conditioning';
const FULL = 'Full body circuit';
const LONG = 'Long walk + mobility';

/**
 * Panel inputs by to-do id. Only raw data lives here; `lib/checkin.ts` computes every number shown on the row,
 * the status line, the AI assessment and the data area from it. To-dos without an entry open a placeholder panel.
 */
export const todoDetails: Record<string, TodoDetail> = {
  // "Check in with Clint Jacobi", main_signal = nutrition (Figma node 5633:140550)
  t3: {
    kind: 'checkin',
    focus: 'nutrition',
    nutrition: {
      // 240 g carb + 60 g fat + 125 g protein = 2,000 kcal
      targets: { carb: 240, fat: 60, protein: 125 },
      days: {
        '2026-08-24': {
          breakfast: [{ name: 'Oatmeal with banana', carb: 58, fat: 6, protein: 10 }],
          lunch: [{ name: 'Chicken breast with rice', carb: 52, fat: 10, protein: 44 }],
          dinner: [{ name: 'Salmon with potatoes', carb: 38, fat: 22, protein: 36 }],
          snack: [
            { name: 'Greek yogurt', carb: 8, fat: 4, protein: 12 },
            { name: 'Mixed berries', carb: 16, fat: 0, protein: 1 },
          ],
        },
        '2026-08-26': {
          breakfast: [{ name: 'Scrambled eggs on toast', carb: 28, fat: 16, protein: 20 }],
          lunch: [{ name: 'Turkey wrap', carb: 42, fat: 12, protein: 28 }],
        },
      },
    },
    training: {
      // Four finished weeks feed the 4-week trend; the last two show in the session log with the current week.
      days: trainingWeeks('2026-08-03', [
        [[UPPER, 3, 3], null, [LOWER, 3, 3], [COND, 2, 2], [FULL, 2, 2], [LONG, 3, 2], null],
        [[UPPER, 3, 3], null, [LOWER, 3, 3], [COND, 2, 2], [FULL, 2, 2], [LONG, 3, 3], null],
        [[UPPER, 3, 3], null, [LOWER, 3, 3], [COND, 2, 2], [FULL, 2, 1], [LONG, 3, 2], null],
        [[UPPER, 3, 3], null, [LOWER, 3, 3], [COND, 2, 1], [FULL, 2, 1], [LONG, 3, 0], null],
        // This week: nothing done yet at 06:00 on Monday.
        [[UPPER, 3, 0], null, [LOWER, 3, 0], [COND, 2, 0], [FULL, 2, 0], [LONG, 3, 0], null],
      ]),
      program: { name: 'Strength Phase 3', startsOn: '2026-07-13', weeks: 8 },
    },
    context: { checkinFormDueOn: '2026-08-30' },
  },

  // "Reply to Sidney Goyette-Kihn": Respond, form review (Figma node 5647:132342)
  t2: {
    kind: 'respond',
    form: 'Weekly Check-in',
    submittedOn: '2026-08-28',
    responseCount: 6,
    answers: [
      { kind: 'scale', question: 'How well have you stuck to your nutrition plan this week?', min: 0, max: 5, value: 2 },
      {
        kind: 'text',
        question: 'If answer was not a 5, explain what was not on track and consider why! Help me understand what happened so I can help!',
        answer:
          'Vacation days definitely are where I struggle with keeping a good eating and drinking habit so Wednesday and Thursday I fell off a bit but all other days were fine.',
      },
      { kind: 'choice', question: 'How is your water intake?', selected: ['Good, working on being better'] },
      { kind: 'scale', question: 'How is your sleep?', min: 0, max: 5, value: 5 },
      {
        kind: 'text',
        question: 'What is your training like? How is your energy during your workouts or physical activity?',
        answer: 'Got all my sessions in before the trip. Energy was great at the start of the week, a bit flat after the travel day.',
      },
      { kind: 'text', question: 'How are your energy levels and motivation?', answer: '100%' },
      { kind: 'scale', question: 'How is your stress level?', min: 0, max: 5, value: 1 },
    ],
  },
  // Carried over from Wed 26 Aug: Jenny's form is still waiting.
  p3: {
    kind: 'respond',
    form: 'Weekly Check-in',
    submittedOn: '2026-08-23',
    responseCount: 1,
    answers: [
      { kind: 'scale', question: 'How well have you stuck to your nutrition plan this week?', min: 0, max: 5, value: 4 },
      {
        kind: 'text',
        question: 'If answer was not a 5, explain what was not on track and consider why! Help me understand what happened so I can help!',
        answer: 'Two dinners out with friends. I picked lighter options but went over on drinks both nights.',
      },
      { kind: 'choice', question: 'How is your water intake?', selected: ['Great, hitting my goal'] },
      { kind: 'scale', question: 'How is your sleep?', min: 0, max: 5, value: 3 },
      {
        kind: 'text',
        question: 'What is your training like? How is your energy during your workouts or physical activity?',
        answer: 'Strong week. Added weight on squats and felt good through every session.',
      },
      { kind: 'text', question: 'How are your energy levels and motivation?', answer: 'High, excited for the next block.' },
      { kind: 'scale', question: 'How is your stress level?', min: 0, max: 5, value: 2 },
    ],
  },
  // "Assign a new program to Glen Johnson": Build (Figma node 5647:133017)
  t4: {
    kind: 'build',
    training: {
      // The program's last four weeks. It ended Thu 27 Aug; nothing is assigned after it.
      days: trainingWeeks('2026-08-03', [
        [[FLOW(1), 4, 4], [FLOW(2), 3, 3], null, [FLOW(3), 4, 4], [FLOW(4), 3, 2], null, null],
        [[FLOW(1), 4, 4], [FLOW(2), 3, 3], null, [FLOW(3), 4, 3], [FLOW(4), 3, 2], null, null],
        [[FLOW(1), 4, 4], [FLOW(2), 3, 2], null, [FLOW(3), 4, 4], [FLOW(4), 3, 3], null, null],
        [[FLOW(1), 4, 4], [FLOW(2), 3, 3], null, [FLOW(3), 4, 2], NA, NA, NA],
      ]),
      program: { name: 'Full-Body Integration & Flow', startsOn: '2026-07-03', weeks: 8 },
    },
    context: { programRequestedOn: '2026-08-29' },
  },
  // "Remind Leo Midgett to submit a check-in form": Remind (Figma node 5647:133214)
  t8: {
    kind: 'remind',
    // Every submitted form is reviewed; an unreviewed one would raise a Respond to-do, which outranks Remind (BL3).
    forms: [
      { name: 'Weekly Check-in', lastSubmittedOn: '2026-08-23', reviewed: true, overdueSince: '2026-08-30' },
      { name: 'Monthly Self-Reflection and Development Check-In', lastSubmittedOn: '2026-08-02', reviewed: true },
      { name: 'HOLIDAY PLANS 2025 into 2026', lastSubmittedOn: '2026-08-27', reviewed: true },
      { name: 'Weekly Check-in Nutrition', lastSubmittedOn: '2026-08-29', reviewed: true },
    ],
    training: {
      days: trainingWeeks('2026-08-03', [
        [[LEAN_A, 4, 4], [LEAN_B, 4, 4], null, [INTERVALS, 2, 2], null, [LEAN_C, 4, 4], null],
        [[LEAN_A, 4, 4], [LEAN_B, 4, 3], null, [INTERVALS, 2, 2], null, [LEAN_C, 4, 4], null],
        [[LEAN_A, 4, 4], [LEAN_B, 4, 4], null, [INTERVALS, 2, 2], null, [LEAN_C, 4, 3], null],
        [[LEAN_A, 4, 4], [LEAN_B, 4, 4], null, [INTERVALS, 2, 0], null, [LEAN_C, 4, 4], null],
        [[LEAN_A, 4, 0], [LEAN_B, 4, 0], null, [INTERVALS, 2, 0], null, [LEAN_C, 4, 0], null],
      ]),
      program: { name: 'Lean Strength', startsOn: '2026-07-27', weeks: 12 },
    },
    nutrition: LEO_NUTRITION,
  },
  // "Issue credit for Wendy Kurtz": Unblock (Figma node 5647:132546)
  t5: {
    kind: 'unblock',
    credits: [
      { type: PT, batches: [{ count: 7 }] },
      { type: PILATES, batches: [{ count: 3, expiresOn: '2026-09-05' }, { count: 2, expiresOn: '2026-09-10' }, { count: 1 }] },
      { type: CONSULT, batches: [{ count: 2 }] },
    ],
  },
  // "Prepare for the session with Malcom Reed": Prepare (Figma node 5647:132813)
  t6: {
    kind: 'prepare',
    sessions: [
      { type: PT, date: '2026-08-13', start: '14:00', status: 'completed' },
      { type: PT, date: '2026-08-20', start: '14:00', status: 'completed' },
      { type: PT, date: '2026-08-27', start: '14:00', status: 'early_cancel' },
      // This week: this morning's session was cancelled late last night, Wednesday's well ahead.
      { type: PT, date: '2026-08-31', start: '07:00', status: 'late_cancel' },
      { type: PT, date: '2026-09-01', start: '14:00', status: 'booked' },
      { type: CONSULT, date: '2026-09-02', start: '10:00', status: 'early_cancel' },
      { type: ASSESSMENT, date: '2026-09-04', start: '14:00', status: 'booked' },
      { type: CONSULT, date: '2026-09-07', start: '14:00', status: 'booked' },
    ],
  },
  // "Congratulate Darrell Steward": Acknowledge, a Phase 2 type the demo trials (no Figma frame).
  t7: {
    kind: 'acknowledge',
    // 362 g carb + 88 g fat + 165 g protein = 2,900 kcal: maintenance 2,600 plus the 300 kcal surplus.
    goal: { surplusKcal: 300 },
    nutrition: {
      targets: { carb: 362, fat: 88, protein: 165 },
      days: loggedDays('2026-08-04', [
        // Three weeks under the target, Tue 4 Aug – Mon 24 Aug.
        [2480, 140], [2550, 150], [2520, 145], null, [2600, 150], [2450, 135], [2500, 140],
        [2580, 150], [2620, 155], [2550, 145], [2600, 150], null, [2650, 150], [2560, 145],
        [2640, 155], [2700, 160], [2620, 150], [2680, 155], [2720, 160], [2600, 150], [2700, 155],
        // Then six days running at or above it, Tue 25 Aug – Sun 30 Aug.
        [2960, 165], [3010, 170], [2940, 162], [3050, 172], [2980, 168], [2930, 160],
      ]),
    },
    training: {
      days: trainingWeeks('2026-08-03', [
        [[UPPER, 3, 3], [LOWER, 3, 3], null, [UPPER, 3, 2], [LOWER, 3, 3], null, null],
        [[UPPER, 3, 3], [LOWER, 3, 2], null, [UPPER, 3, 3], [LOWER, 3, 3], null, null],
        [[UPPER, 3, 3], [LOWER, 3, 3], null, [UPPER, 3, 3], [LOWER, 3, 2], null, null],
        [[UPPER, 3, 3], [LOWER, 3, 3], null, [UPPER, 3, 3], [LOWER, 3, 3], null, null],
        [[UPPER, 3, 0], [LOWER, 3, 0], null, [UPPER, 3, 0], [LOWER, 3, 0], null, null],
      ]),
      program: { name: 'Lean Bulk', startsOn: '2026-07-20', weeks: 12 },
    },
  },
};
