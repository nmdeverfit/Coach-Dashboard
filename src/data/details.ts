import type { TodoDetail } from './types';

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
    context: {
      checkinFormDueOn: '2026-08-30',
      note: { on: '2026-08-20', summary: 'preparing to sell the house and move to AB' },
    },
  },
};
