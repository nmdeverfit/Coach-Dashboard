/**
 * Build-time switches for trials that publish to their own artifact; every other build drops their code.
 * Grouped to-dos (the user's call, outside the brief) is on only with `VITE_GROUPED_TODOS=1`
 * (`npm run build:artifact:grouped`). Notes timeline (the user's call: Notes and Meetings as one tab, three ways to
 * add one) is on only with `VITE_NOTES_TIMELINE=1` (`npm run build:artifact:notes`, which turns grouped to-dos on as well, so
 * both trials show on one page, "Notes & Grouped To-dos").
 */
export const GROUPED_TODOS = import.meta.env.VITE_GROUPED_TODOS === '1';
export const NOTES_TIMELINE = import.meta.env.VITE_NOTES_TIMELINE === '1';
/** Training chart options (the user's call: a lighter, icon-led session log), on only with `VITE_CHART_TRIAL=1`. */
export const CHART_TRIAL = import.meta.env.VITE_CHART_TRIAL === '1';
