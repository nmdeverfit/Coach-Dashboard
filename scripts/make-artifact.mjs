// Turns the single-file build into a page fragment for sharing as a claude.ai Artifact,
// which supplies its own <!doctype>, <html>, <head> and <body> wrapper.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');
const fragment = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?(html|head|body)[^>]*>/gi, '')
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .trim();

writeFileSync('dist-single/coach-dashboard.html', `${fragment}\n`);
console.log('wrote dist-single/coach-dashboard.html');
