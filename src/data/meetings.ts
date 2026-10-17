import { addDays } from '../lib/checkin';
import { weekAsOf } from '../lib/week';
import { DEMO_TODAY, clients } from './mock';
import { random } from './profiles';
import type { Client, ClientStatus, Meeting, TranscriptLine } from './types';

/**
 * Coach–client meetings for the Transcript tab, generated from a seed of the client's id like the rest of the
 * profile: up to two calls a week in the last three weeks and up to one in the three before, each with a short
 * transcript. This week has none yet (today is Monday 06:00). Clients with no activity have none, and Aima's stop
 * when she went quiet (15 days ago), so the tab never contradicts her row. Transcripts are stand-in wording; nothing
 * reads them (Olly and the assessment use the stored status only in Phase 1).
 */

const TITLES = ['Monthly check-in call', 'Weekly check-in', 'Program review', 'Nutrition catch-up', 'Goal setting session'];
const STARTS = ['07:00', '12:30', '14:00', '17:30', '18:00'];
const MINUTES = [15, 30, 45, 60];
const WEEKS = 6;
const LINKS = [
  'https://zoom.us/j/84213307751',
  'https://meet.google.com/xvq-pmrd-kte',
  'https://teams.microsoft.com/l/meetup-join/19%3ameeting',
];

/** How the client describes the stretch before the call, by status. */
const HOW_IT_WENT: Record<Exclude<ClientStatus, 'no_activities'>, string> = {
  on_track: 'Pretty good. I got every session in and logging meals has become a habit.',
  needs_attention: 'Mixed. Work got busy midweek, so a couple of sessions slipped.',
  at_risk: 'Honestly, not great. A lot has been going on and the app kind of fell off.',
};

function transcriptFor(client: Client, title: string, minutes: number): TranscriptLine[] {
  const first = client.firstName;
  const status = client.status === 'no_activities' ? 'needs_attention' : client.status;
  const lines: [TranscriptLine['from'], string][] = [
    ['coach', `Hi ${first}, thanks for jumping on. How have the last couple of weeks been?`],
    ['client', HOW_IT_WENT[status]],
    ['coach', 'What has been the hardest part to fit in?'],
    ['client', status === 'on_track' ? 'Mostly the longer sessions on weekends, but I make them work.' : 'Evenings. By the time I get home I don’t have much left.'],
    ['coach', title === 'Nutrition catch-up' ? 'Let’s keep meals simple: two go-to breakfasts and a quick photo log.' : 'Let’s keep the plan as it is and move the long session to the morning.'],
    ['client', 'That sounds doable. I’ll try it this week.'],
    ['coach', 'Great. Message me if anything gets in the way, and we’ll check back next call.'],
  ];
  // Spread the lines over the call.
  const step = Math.floor((minutes * 60) / (lines.length + 1));
  return lines.map(([from, text], i) => {
    const s = 5 + i * step;
    return { from, at: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, text };
  });
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
      meetings.push({
        id: `${client.id}-m${meetings.length}`,
        title: name,
        date,
        start: pick(STARTS),
        minutes,
        timeZone: 'UTC-7',
        link: pick(LINKS),
        transcript: { kind: 'lines', lines: transcriptFor(client, name, minutes) },
      });
    }
  }
  return meetings;
}

const MEETINGS: Record<string, Meeting[]> = Object.fromEntries(clients.map((c) => [c.id, generate(c)]));

export const getMeetings = (clientId: string): Meeting[] => MEETINGS[clientId] ?? [];
