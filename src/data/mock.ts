import { buildCheckinView } from '../lib/checkin';
import { todoDetails } from './details';
import type { Client, Highlight, Todo } from './types';

/** Demo "today": the design's brief is dated Monday Aug 31. */
export const DEMO_TODAY = '2026-08-31';
export const COACH_FIRST_NAME = 'Long';
export const GENERATED_AT = '06:00 AM';

const figmaFiles = import.meta.glob<string>('../assets/figma/*.png', { eager: true, import: 'default' });
const figmaImage = (name: string): string | undefined => figmaFiles[`../assets/figma/${name}.png`];

/** The design reuses some photos across clients; these point at the shared export. */
const SHARED_PHOTOS: Record<string, string> = {
  'anabella-potts': 'wilma-flintstone',
  'wendy-kurtz': 'wilma-flintstone',
  'penelope-brooks': 'wilma-flintstone',
  'emma-williams': 'aisha-doyle',
  'alexander-thompson': 'aima-ansari',
};
const avatar = (slug: string) => figmaImage(`av-${SHARED_PHOTOS[slug] ?? slug}`);

export const coachAvatar = figmaImage('avatar-coach');

type Seed = Omit<Client, 'id' | 'firstName' | 'avatar'> & { slug: string };

const seeds: Seed[] = [
  // At risk
  { slug: 'aima-ansari', name: 'Aima Ansari', status: 'at_risk' },
  { slug: 'ali-chapman', name: 'Ali Chapman', status: 'at_risk' },
  { slug: 'anabella-potts', name: 'Anabella Potts', status: 'at_risk' },
  { slug: 'aisha-doyle', name: 'Aisha Doyle', status: 'at_risk' },
  { slug: 'clint-jacobi', name: 'Clint Jacobi', status: 'at_risk' },
  { slug: 'wilma-flintstone', name: 'Wilma Flintstone', status: 'at_risk' },
  { slug: 'marcus-hale', name: 'Marcus Hale', status: 'at_risk' },
  { slug: 'priya-nair', name: 'Priya Nair', status: 'at_risk' },
  { slug: 'tom-becker', name: 'Tom Becker', status: 'at_risk' },
  { slug: 'sofia-rossi', name: 'Sofia Rossi', status: 'at_risk' },
  // Needs attention
  { slug: 'zoey-wright', name: 'Zoey Wright', status: 'needs_attention' },
  { slug: 'grace-adams', name: 'Grace Adams', status: 'needs_attention' },
  { slug: 'emma-williams', name: 'Emma Williams', status: 'needs_attention' },
  { slug: 'james-lee', name: 'James Lee', status: 'needs_attention' },
  { slug: 'wade-warren', name: 'Wade Warren', status: 'needs_attention' },
  { slug: 'nora-fields', name: 'Nora Fields', status: 'needs_attention' },
  { slug: 'owen-price', name: 'Owen Price', status: 'needs_attention' },
  { slug: 'hana-sato', name: 'Hana Sato', status: 'needs_attention' },
  { slug: 'ben-carter', name: 'Ben Carter', status: 'needs_attention' },
  { slug: 'chloe-martin', name: 'Chloe Martin', status: 'needs_attention' },
  // Program ending (lifecycle: carries a countdown)
  { slug: 'andrew-scott', name: 'Andrew Scott', status: 'on_track', programEndsInDays: 1 },
  { slug: 'layla-mitchell', name: 'Layla Mitchell', status: 'on_track', programEndsInDays: 3 },
  { slug: 'evelyn-moore', name: 'Evelyn Moore', status: 'on_track', programEndsInDays: 3 },
  { slug: 'elijah-wright', name: 'Elijah Wright', status: 'on_track', programEndsInDays: 4 },
  { slug: 'ava-turner', name: 'Ava Turner', status: 'on_track', programEndsInDays: 5 },
  { slug: 'noah-kim', name: 'Noah Kim', status: 'on_track', programEndsInDays: 5 },
  { slug: 'isla-brown', name: 'Isla Brown', status: 'on_track', programEndsInDays: 6 },
  { slug: 'leo-park', name: 'Leo Park', status: 'on_track', programEndsInDays: 6 },
  { slug: 'mila-cruz', name: 'Mila Cruz', status: 'on_track', programEndsInDays: 7 },
  { slug: 'ryan-ford', name: 'Ryan Ford', status: 'on_track', programEndsInDays: 7 },
  // Upcoming bookings (lifecycle: carries a session time)
  { slug: 'ethan-smith', name: 'Ethan Smith', status: 'on_track', nextSession: 'Today 6:30 PM' },
  { slug: 'alexander-thompson', name: 'Alexander Thompson', status: 'on_track', nextSession: 'Today 6:45 PM' },
  { slug: 'penelope-brooks', name: 'Penelope Brooks', status: 'on_track', nextSession: 'Sep 1 • 8:00 AM' },
  { slug: 'gabriella-clark', name: 'Gabriella Clark', status: 'on_track', nextSession: 'Sep 1 • 11:00 AM' },
  { slug: 'malcom-reed', name: 'Malcom Reed', status: 'on_track', nextSession: 'Sep 1 • 2:00 PM' },
  { slug: 'sam-rivera', name: 'Sam Rivera', status: 'on_track', nextSession: 'Sep 3 • 9:00 AM' },
  // Other clients referenced by to-dos
  { slug: 'sidney-goyette-kihn', name: 'Sidney Goyette-Kihn', status: 'on_track' },
  { slug: 'glen-johnson', name: 'Glen Johnson', status: 'on_track' },
  { slug: 'wendy-kurtz', name: 'Wendy Kurtz', status: 'on_track' },
  { slug: 'darrell-steward', name: 'Darrell Steward', status: 'on_track' },
  { slug: 'cody-fisher', name: 'Cody Fisher', status: 'on_track' },
  { slug: 'jenny-wilson', name: 'Jenny Wilson', status: 'on_track' },
];

export const clients: Client[] = seeds.map(({ slug, ...rest }) => ({
  ...rest,
  id: slug,
  firstName: rest.name.split(' ')[0],
  avatar: avatar(slug),
}));

export const todos: Todo[] = [
  // Suggested (raised by today's generation), in ranked order
  { id: 't1', clientId: 'wilma-flintstone', type: 'adjust', action: 'Adjust the plan for', reason: 'Wilma is back from pause today — she paused for health or injury.', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't2', clientId: 'sidney-goyette-kihn', type: 'respond', action: 'Reply to', reason: 'Her check-in form has been waiting 3 days.', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't3', clientId: 'clint-jacobi', type: 'checkin', action: 'Check in with', reason: buildCheckinView(todoDetails.t3, DEMO_TODAY).rowReason, raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't4', clientId: 'glen-johnson', type: 'build', action: 'Assign a new program to', reason: 'Glen has had nothing assigned for 3 days.', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't5', clientId: 'wendy-kurtz', type: 'unblock', action: 'Issue credit for', reason: '4 Pilates credits expiring in 3 days.', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't6', clientId: 'malcom-reed', type: 'prepare', action: 'Prepare for the session with', reason: 'PT session tomorrow at 2:00pm, in person.', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't7', clientId: 'darrell-steward', type: 'congratulate', action: 'Congratulate', reason: 'Hit the +300 kcal surplus 6 days running after three weeks short', raisedOn: DEMO_TODAY, state: 'open' },
  // Previous (carried forward, newest first)
  // Aima rather than the design's Wilma: Wilma already has today's to-do, and a client is never in both sections.
  { id: 'p1', clientId: 'aima-ansari', type: 'checkin', action: 'Check in with', reason: 'No app activity, no workouts and no reply in 15 days.', raisedOn: '2026-08-30', state: 'open' },
  { id: 'p2', clientId: 'cody-fisher', type: 'kudos', action: 'Kudos to', reason: 'Cody was at risk for two weeks and is back on track.', raisedOn: '2026-08-27', state: 'open' },
  { id: 'p3', clientId: 'jenny-wilson', type: 'respond', action: 'Reply to', reason: 'Her check-in form has been waiting 3 days.', raisedOn: '2026-08-26', state: 'open' },
];

const hl = (id: string, category: Highlight['category'], clientName: string, text: string): Highlight => ({
  id,
  category,
  clientName,
  text,
  image: figmaImage(`hl-${id}`),
});

export const highlights: Highlight[] = [
  hl('leo-midgett', 'anniversary', 'Leo Midgett', 'just reached his 6-month coaching anniversary'),
  hl('daniel-lee', 'anniversary', 'Daniel Lee', 'just reached his 1-year coaching anniversary'),
  hl('kevin-williams', 'anniversary', 'Kevin Williams', 'logged his 50th workout'),
  hl('anna-taylor', 'anniversary', 'Anna Taylor', 'just reached his 1-year coaching anniversary'),
  hl('rachel-kim', 'milestone', 'Rachel Kim', 'hit her goal - target weight 65 kg'),
  hl('kevin-williams-2', 'milestone', 'Kevin Williams', 'logged his 50th workout'),
  hl('ryan-miller', 'milestone', 'Ryan Miller', 'finished 30-Day Fat Loss Challenge'),
  hl('michael-brown', 'milestone', 'Michael Brown', 'kept his streak 12 weeks in a row'),
  hl('erika-harris', 'birthday', 'Erika Harris', 'turns 29 today.'),
  hl('mia-young', 'birthday', 'Mia Young', 'turned 23 three days ago.'),
];
