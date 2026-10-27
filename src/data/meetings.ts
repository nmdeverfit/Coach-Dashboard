import { addDays } from '../lib/checkin';
import { NOTES_TIMELINE } from '../lib/flags';
import { weekAsOf } from '../lib/week';
import { DEMO_TODAY, clients } from './mock';
import { random } from './profiles';
import { callSummary, transcriptLines } from './transcripts';
import type { Client, Meeting, MeetingSummary } from './types';

/**
 * Coach–client meetings for the Transcript tab, generated from a seed of the client's id like the rest of the
 * profile: up to two calls a week in the last three weeks and up to one in the three before, each 30 to 60 minutes
 * with a transcript of matching length (`transcripts.ts`). This week has none yet (today is Monday 06:00). Clients
 * with no activity have none, and Aima's stop when she went quiet (15 days ago), so the tab never contradicts her
 * row. Transcripts are stand-in wording; nothing reads them (Olly and the assessment use the stored status only in
 * Phase 1).
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** "Training: the upper body days…" with its topic in bold, as the coach would jot it. */
const item = (s: string) => {
  const at = s.indexOf(': ');
  return at > 0 && at < 24 ? `<li><b>${esc(s.slice(0, at))}:</b> ${esc(s.slice(at + 2))}</li>` : `<li>${esc(s)}</li>`;
};

/**
 * The coach's notes on a recorded call (the Notes timeline trial, so its meeting notes are not a bare transcript, the
 * user's call): what came up and what comes next, from the call's own summary, so they never name a point the
 * transcript cut off. Up to four points.
 */
function callNotes(summary: MeetingSummary) {
  const points = summary.discuss.slice(0, 4);
  return [
    points.length ? `<p><b>What we covered</b></p><ul>${points.map(item).join('')}</ul>` : '',
    `<p><b>Next steps</b></p><ul>${summary.followUp.map(item).join('')}</ul>`,
  ].join('');
}

const TITLES = ['Monthly check-in call', 'Weekly check-in', 'Program review', 'Nutrition catch-up', 'Goal setting session'];
const STARTS = ['07:00', '12:30', '14:00', '17:30', '18:00'];
const MINUTES = [30, 45, 60];
const WEEKS = 6;
/**
 * Notes timeline trial: about half of the recorded calls' notes were edited later that day, 15 minutes to 2 hours
 * after the call ended (their own seed, so the calls themselves are unchanged).
 */
function editedAt(id: string, date: string, start: string, minutes: number) {
  const rnd = random(`meeting-edit:${id}`);
  if (rnd() < 0.5) return undefined;
  const [h, m] = start.split(':').map(Number);
  const at = Math.min(h * 60 + m + minutes + 15 + Math.floor(rnd() * 22) * 5, 23 * 60 + 55);
  return `${date}T${String(Math.floor(at / 60)).padStart(2, '0')}:${String(at % 60).padStart(2, '0')}`;
}

function generate(client: Client): Meeting[] {
  if (client.status === 'no_activities') return [];
  const rnd = random(`meetings:${client.id}`);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const latest = client.id === 'aima-ansari' ? addDays(DEMO_TODAY, -16) : addDays(DEMO_TODAY, -1);
  const meetings: Meeting[] = [];
  // Titles take turns from a random start, so one client's calls don't all share a name.
  let title = Math.floor(rnd() * TITLES.length);
  for (let offset = -WEEKS; offset < 0; offset++) {
    // Recent weeks are busier: up to two calls in each of the last three, at most one before that.
    const r = rnd();
    const count = offset >= -3 ? (r < 0.25 ? 0 : r < 0.75 ? 1 : 2) : r < 0.5 ? 0 : 1;
    // Distinct days of that week, never after `latest`.
    const days = [0, 1, 2, 3, 4, 5, 6].map((d) => addDays(weekAsOf(offset), d)).filter((d) => d <= latest);
    for (let i = 0; i < count && days.length; i++) {
      const [date] = days.splice(Math.floor(rnd() * days.length), 1);
      const name = TITLES[title++ % TITLES.length];
      const minutes = pick(MINUTES);
      const start = pick(STARTS);
      // Meetings carried a platform link until the user dropped it; the draw stays so every call keeps its words.
      rnd();
      const summary = callSummary(client.firstName, client.status, name, minutes);
      const id = `${client.id}-m${meetings.length}`;
      meetings.push({
        id,
        title: name,
        date,
        start,
        minutes,
        timeZone: 'UTC-7',
        transcript: { kind: 'lines', lines: transcriptLines(client.firstName, client.status, name, minutes, rnd) },
        summary,
        ...(NOTES_TIMELINE ? { notes: callNotes(summary), editedAt: editedAt(id, date, start, minutes) } : {}),
      });
    }
  }
  return meetings;
}

const MEETINGS: Record<string, Meeting[]> = Object.fromEntries(clients.map((c) => [c.id, generate(c)]));

export const getMeetings = (clientId: string): Meeting[] => MEETINGS[clientId] ?? [];
