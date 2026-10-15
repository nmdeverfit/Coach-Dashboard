import type { TodoDetail, TrainingDay } from './types';

/** Lays a weekly plan (Mon → Sun) onto real dates; each entry is [workout, sections, completed] or null for rest. */
function trainingWeeks(firstMonday: string, weeks: ([string, number, number] | null)[][]): Record<string, TrainingDay> {
  const days: Record<string, TrainingDay> = {};
  const start = new Date(`${firstMonday}T00:00:00Z`).getTime();
  weeks.forEach((week, w) =>
    week.forEach((entry, d) => {
      const date = new Date(start + (w * 7 + d) * 86_400_000).toISOString().slice(0, 10);
      days[date] = entry ? { kind: 'workout', name: entry[0], sections: entry[1], completed: entry[2] } : { kind: 'rest' };
    }),
  );
  return days;
}

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
};
