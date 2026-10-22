import { addDays } from '../lib/checkin';
import { weekAsOf } from '../lib/week';
import { DEMO_TODAY, clients } from './mock';
import { random } from './profiles';
import { callSummary, transcriptLines } from './transcripts';
import type { Client, Meeting } from './types';

/**
 * Coach–client meetings for the Transcript tab, generated from a seed of the client's id like the rest of the
 * profile: up to two calls a week in the last three weeks and up to one in the three before, each 30 to 60 minutes
 * with a transcript of matching length (`transcripts.ts`). This week has none yet (today is Monday 06:00). Clients
 * with no activity have none, and Aima's stop when she went quiet (15 days ago), so the tab never contradicts her
 * row. Transcripts are stand-in wording; nothing reads them (Olly and the assessment use the stored status only in
 * Phase 1).
 */

const TITLES = ['Monthly check-in call', 'Weekly check-in', 'Program review', 'Nutrition catch-up', 'Goal setting session'];
const STARTS = ['07:00', '12:30', '14:00', '17:30', '18:00'];
const MINUTES = [30, 45, 60];
const WEEKS = 6;
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
      meetings.push({
        id: `${client.id}-m${meetings.length}`,
        title: name,
        date,
        start,
        minutes,
        timeZone: 'UTC-7',
        transcript: { kind: 'lines', lines: transcriptLines(client.firstName, client.status, name, minutes, rnd) },
        summary: callSummary(client.firstName, client.status, name, minutes),
      });
    }
  }
  return meetings;
}

const MEETINGS: Record<string, Meeting[]> = Object.fromEntries(clients.map((c) => [c.id, generate(c)]));

export const getMeetings = (clientId: string): Meeting[] => MEETINGS[clientId] ?? [];
