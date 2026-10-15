import type { TodoDetail } from './types';

/** Panel payloads by to-do id. To-dos without an entry open the panel's placeholder until their design lands. */
export const todoDetails: Record<string, TodoDetail> = {
  // "Check in with Clint Jacobi", main_signal = nutrition (Figma node 5633:140550)
  t3: {
    kind: 'checkin',
    focus: 'nutrition',
    statusLine: '1 of 7 days with a logged meal this week. Average 63 kcal logged against a 1675 kcal target',
    assessment: {
      headline: {
        before: 'Current',
        signal: 'nutrition',
        after: 'signals are very poor, with only 1 logged day and a large calorie shortfall, and she is overdue for both her check-in.',
      },
      bullets: [
        'Only 1/7 days logged, macro deviation of 74% and average calories 1166 kcal below target',
        'The weekly check-in and InBody are overdue.',
        'She is overloaded from preparing to sell the house and move to AB.',
      ],
    },
    nutrition: {
      calories: { value: 1530, target: 2000 },
      macros: [
        { key: 'carb', label: 'Carb', value: 224, target: 290 },
        { key: 'fat', label: 'Fat', value: 71, target: 100 },
        { key: 'protein', label: 'Protein', value: 71, target: 100 },
      ],
      weeks: [
        {
          start: '2026-08-24',
          meals: {
            breakfast: [1, 1, 1, 0, 1, 0, 0],
            lunch: [1, 0, 1, 0, 1, 0, 0],
            dinner: [1, 0, 2, 0, 0, 0, 0],
            snack: [0, 2, 2, 0, 5, 0, 0],
          },
        },
        {
          start: '2026-08-31',
          isCurrent: true,
          meals: {
            breakfast: [1, 0, 0, 0, null, null, null],
            lunch: [1, 1, 1, 0, null, null, null],
            dinner: [1, 1, 0, 0, null, null, null],
            snack: [3, 0, 0, 0, null, null, null],
          },
        },
      ],
      foods: {
        '2026-08-24:lunch:4': [{ name: 'Grilled chicken breast', calories: 320 }],
        '2026-08-24:snack:2': [
          { name: 'Greek yogurt', calories: 40 },
          { name: 'Mixed berries', calories: 70 },
        ],
      },
      mealsThisWeek: 9,
      avgCalories: 1400,
    },
  },
};
