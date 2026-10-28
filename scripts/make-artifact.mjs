// Turns the single-file build into a page fragment for sharing as a claude.ai Artifact,
// which supplies its own <!doctype>, <html>, <head> and <body> wrapper.
// An optional argument names the output, e.g. `coach-dashboard-grouped` for the grouped to-dos trial.
import { readFileSync, writeFileSync } from 'node:fs';

const name = process.argv[2] ?? 'coach-dashboard';
// The trial's page gets its own title, so its artifact never reads as the layout's.
const TITLES = {
  'coach-dashboard-grouped': 'Check-in Dashboard v2 · Grouped to-dos',
  // The notes trial carries the grouped to-dos too, so both show on one page (the user's call).
  'coach-dashboard-notes': 'Notes & Grouped To-dos',
  'coach-dashboard-charts': 'Training chart options',
};

const html = readFileSync('dist-single/index.html', 'utf8');
const fragment = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?(html|head|body)[^>]*>/gi, '')
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .trim()
  .replace(/<title>[^<]*<\/title>/, (t) => (TITLES[name] ? `<title>${TITLES[name]}</title>` : t));

writeFileSync(`dist-single/${name}.html`, `${fragment}\n`);
console.log(`wrote dist-single/${name}.html`);
