/**
 * Build-time switches for trials that publish to their own artifact. Grouped to-dos (the user's call, outside the
 * brief) is on only with `VITE_GROUPED_TODOS=1` (`npm run build:artifact:grouped`); every other build drops its code.
 */
export const GROUPED_TODOS = import.meta.env.VITE_GROUPED_TODOS === '1';
