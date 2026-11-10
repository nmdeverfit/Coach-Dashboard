/**
 * Build-time switches for trials that publish to their own artifact; every other build drops their code.
 * Grouped to-dos (the user's call, outside the brief) is on only with `VITE_GROUPED_TODOS=1`
 * (`npm run build:artifact:grouped`). Notes timeline (the user's call: Notes and Meetings as one tab, three ways to
 * add one) is on only with `VITE_NOTES_TIMELINE=1` (`npm run build:artifact:notes`, which turns grouped to-dos on as well, so
 * both trials show on one page, "Notes & Grouped To-dos").
 */
export const GROUPED_TODOS = import.meta.env.VITE_GROUPED_TODOS === '1';
export const NOTES_TIMELINE = import.meta.env.VITE_NOTES_TIMELINE === '1';
/**
 * Metrics & Photos (the user's call): the client detail page's Metrics & Photos tab, on only with
 * `VITE_METRICS_PHOTOS=1` (`npm run build:artifact:metrics`, which also turns the Notes timeline and grouped to-dos
 * on, with their options fixed to Popup and Show; its own artifact, "Metrics & Photos", duplicated from "Notes &
 * Grouped To-dos").
 */
export const METRICS_PHOTOS = import.meta.env.VITE_METRICS_PHOTOS === '1';
/** Training chart options (the user's call: a lighter, icon-led session log), on only with `VITE_CHART_TRIAL=1`. */
export const CHART_TRIAL = import.meta.env.VITE_CHART_TRIAL === '1';
