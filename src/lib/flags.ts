/**
 * Build-time switches for trials that publish to their own artifact; every other build drops their code.
 * Grouped to-dos (the user's call, outside the brief) is on only with `VITE_GROUPED_TODOS=1`
 * (`npm run build:artifact:grouped`). Notes timeline (the user's call: Notes and Meetings as one tab, three ways to
 * add one) is on only with `VITE_NOTES_TIMELINE=1` (`npm run build:artifact:notes`).
 */
export const GROUPED_TODOS = import.meta.env.VITE_GROUPED_TODOS === '1';
export const NOTES_TIMELINE = import.meta.env.VITE_NOTES_TIMELINE === '1';
