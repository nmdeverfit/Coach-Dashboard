import { buildPrepareView, rowReasonFor } from '../lib/todos';
import { summarizeTraining } from '../lib/training';
import { todoDetails } from './details';
import type { CheckinDetail, Client, Highlight, PrepareDetail, Todo } from './types';

/** Demo "today": the design's brief is dated Monday Aug 31. */
export const DEMO_TODAY = '2026-08-31';
export const COACH_FIRST_NAME = 'Long';
export const GENERATED_AT = '06:00 AM';

const figmaFiles = import.meta.glob<string>('../assets/figma/*.png', { eager: true, import: 'default' });
const figmaImage = (name: string): string | undefined => figmaFiles[`../assets/figma/${name}.png`];

const photoFiles = import.meta.glob<string>('../assets/avatars/*.jpg', { eager: true, import: 'default' });
const photo = (file: string) => photoFiles[`../assets/avatars/${file}.jpg`];

/**
 * Client photos (20 female `f01`–`f20`, 20 male `m01`–`m20`). Listed most visible first: rows in Today's Brief,
 * the first four of each group card, then Client highlights. There are more people than photos, so the last few,
 * who only show when a card is scrolled, reuse a photo from Client highlights.
 */
const FEMALE = [
  'wilma-flintstone', 'sidney-goyette-kihn', 'wendy-kurtz', 'jenny-wilson', 'aima-ansari', 'anabella-potts', 'aisha-doyle',
  'zoey-wright', 'grace-adams', 'emma-williams', 'layla-mitchell', 'evelyn-moore', 'penelope-brooks', 'gabriella-clark',
  'rachel-kim', 'anna-taylor', 'erika-harris', 'mia-young', 'priya-nair', 'sofia-rossi',
];
const FEMALE_REUSE: Record<string, string> = {
  'nora-fields': 'rachel-kim', 'hana-sato': 'anna-taylor', 'chloe-martin': 'erika-harris',
  'ava-turner': 'mia-young', 'isla-brown': 'priya-nair', 'mila-cruz': 'sofia-rossi',
};
const MALE = [
  'clint-jacobi', 'glen-johnson', 'malcom-reed', 'darrell-steward', 'cody-fisher', 'ali-chapman', 'james-lee',
  'andrew-scott', 'elijah-wright', 'ethan-smith', 'alexander-thompson', 'leo-midgett', 'daniel-lee', 'kevin-williams',
  'ryan-miller', 'michael-brown', 'marcus-hale', 'tom-becker', 'wade-warren', 'owen-price',
];
const MALE_REUSE: Record<string, string> = {
  'ben-carter': 'leo-midgett', 'noah-kim': 'daniel-lee', 'leo-park': 'ryan-miller', 'ryan-ford': 'michael-brown', 'sam-rivera': 'marcus-hale',
};

const num2 = (i: number) => String(i + 1).padStart(2, '0');
const PHOTO_BY_SLUG: Record<string, string> = Object.fromEntries([
  ...FEMALE.map((slug, i) => [slug, `f${num2(i)}`]),
  ...MALE.map((slug, i) => [slug, `m${num2(i)}`]),
]);
for (const [slug, twin] of Object.entries({ ...FEMALE_REUSE, ...MALE_REUSE })) PHOTO_BY_SLUG[slug] = PHOTO_BY_SLUG[twin];

const avatar = (slug: string) => (PHOTO_BY_SLUG[slug] ? photo(PHOTO_BY_SLUG[slug]) : undefined);
const slugOf = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

export const coachAvatar = figmaImage('avatar-coach');

type Seed = Omit<Client, 'id' | 'firstName' | 'avatar'> & { slug: string };

const seeds: Seed[] = [
  // At risk
  { slug: 'aima-ansari', name: 'Aima Ansari', status: 'at_risk' },
  { slug: 'ali-chapman', name: 'Ali Chapman', status: 'at_risk' },
  { slug: 'anabella-potts', name: 'Anabella Potts', status: 'at_risk' },
  { slug: 'aisha-doyle', name: 'Aisha Doyle', status: 'at_risk' },
  // Clint's program end comes from his training data, so the Program ending card and his panel agree (AC3, AC4).
  {
    slug: 'clint-jacobi',
    name: 'Clint Jacobi',
    status: 'at_risk',
    programEndsInDays: summarizeTraining((todoDetails.t3 as CheckinDetail).training, DEMO_TODAY).program.endsInDays,
  },
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
  { slug: 'ryan-ford', name: 'Ryan Ford', status: 'on_track' },
  // Upcoming bookings (lifecycle: carries a session time)
  { slug: 'ethan-smith', name: 'Ethan Smith', status: 'on_track', nextSession: 'Today 6:30 PM' },
  { slug: 'alexander-thompson', name: 'Alexander Thompson', status: 'on_track', nextSession: 'Today 6:45 PM' },
  { slug: 'penelope-brooks', name: 'Penelope Brooks', status: 'on_track', nextSession: 'Sep 1 • 8:00 AM' },
  { slug: 'gabriella-clark', name: 'Gabriella Clark', status: 'on_track', nextSession: 'Sep 1 • 11:00 AM' },
  // Malcom's next session comes from his bookings, so the card and his Prepare panel agree.
  { slug: 'malcom-reed', name: 'Malcom Reed', status: 'on_track', nextSession: buildPrepareView(todoDetails.t6 as PrepareDetail, DEMO_TODAY).railLabel },
  { slug: 'sam-rivera', name: 'Sam Rivera', status: 'on_track', nextSession: 'Sep 3 • 9:00 AM' },
  // Other clients referenced by to-dos
  { slug: 'sidney-goyette-kihn', name: 'Sidney Goyette-Kihn', status: 'on_track' },
  { slug: 'glen-johnson', name: 'Glen Johnson', status: 'on_track' },
  { slug: 'wendy-kurtz', name: 'Wendy Kurtz', status: 'on_track' },
  { slug: 'darrell-steward', name: 'Darrell Steward', status: 'on_track' },
  { slug: 'cody-fisher', name: 'Cody Fisher', status: 'on_track' },
  { slug: 'jenny-wilson', name: 'Jenny Wilson', status: 'on_track' },
  { slug: 'leo-midgett', name: 'Leo Midgett', status: 'on_track' },
];

export const clients: Client[] = seeds.map(({ slug, ...rest }) => ({
  ...rest,
  id: slug,
  firstName: rest.name.split(' ')[0],
  avatar: avatar(slug),
}));

type TodoSeed = Omit<Todo, 'reason'> & { reason?: string };

const todoSeeds: TodoSeed[] = [
  // Suggested (raised by today's generation), in ranked order
  { id: 't2', clientId: 'sidney-goyette-kihn', type: 'respond', action: 'Reply to', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't3', clientId: 'clint-jacobi', type: 'checkin', action: 'Check in with', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't4', clientId: 'glen-johnson', type: 'build', action: 'Assign a new program to', raisedOn: DEMO_TODAY, state: 'open' },
  // Remind ranks below Build and above Unblock (Spec 4 BL3).
  { id: 't8', clientId: 'leo-midgett', type: 'remind', action: 'Remind', actionAfter: 'to submit a check-in form', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't5', clientId: 'wendy-kurtz', type: 'unblock', action: 'Issue credit for', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't6', clientId: 'malcom-reed', type: 'prepare', action: 'Prepare for the session with', raisedOn: DEMO_TODAY, state: 'open' },
  { id: 't7', clientId: 'darrell-steward', type: 'congratulate', action: 'Congratulate', reason: 'Hit the +300 kcal surplus 6 days running after three weeks short', raisedOn: DEMO_TODAY, state: 'open' },
  // Previous (carried forward, newest first)
  // Aima rather than the design's Wilma: Wilma already has today's to-do, and a client is never in both sections.
  { id: 'p1', clientId: 'aima-ansari', type: 'checkin', action: 'Check in with', reason: 'No app activity, no workouts and no reply in 15 days.', raisedOn: '2026-08-30', state: 'open' },
  { id: 'p2', clientId: 'cody-fisher', type: 'kudos', action: 'Kudos to', reason: 'Cody was at risk for two weeks and is back on track.', raisedOn: '2026-08-27', state: 'open' },
  { id: 'p3', clientId: 'jenny-wilson', type: 'respond', action: 'Reply to', raisedOn: '2026-08-26', state: 'open' },
];

const firstNameOf = (id: string) => clients.find((c) => c.id === id)!.firstName;

/** Rows with panel data take their reason from the same builder as the panel (AC4); the rest are design copy. */
export const todos: Todo[] = todoSeeds.map((t) => {
  const detail = todoDetails[t.id];
  return { ...t, reason: detail ? rowReasonFor(detail, firstNameOf(t.clientId), DEMO_TODAY) : t.reason! };
});

const hl = (id: string, category: Highlight['category'], clientName: string, text: string): Highlight => ({
  id,
  category,
  clientName,
  text,
  image: avatar(slugOf(clientName)),
});

export const highlights: Highlight[] = [
  hl('leo-midgett', 'anniversary', 'Leo Midgett', 'just reached his 6-month coaching anniversary'),
  hl('daniel-lee', 'anniversary', 'Daniel Lee', 'just reached his 1-year coaching anniversary'),
  hl('kevin-williams', 'anniversary', 'Kevin Williams', 'logged his 50th workout'),
  hl('anna-taylor', 'anniversary', 'Anna Taylor', 'just reached her 1-year coaching anniversary'),
  hl('rachel-kim', 'milestone', 'Rachel Kim', 'hit her goal - target weight 65 kg'),
  hl('kevin-williams-2', 'milestone', 'Kevin Williams', 'logged his 50th workout'),
  hl('ryan-miller', 'milestone', 'Ryan Miller', 'finished 30-Day Fat Loss Challenge'),
  hl('michael-brown', 'milestone', 'Michael Brown', 'kept his streak 12 weeks in a row'),
  hl('erika-harris', 'birthday', 'Erika Harris', 'turns 29 today.'),
  hl('mia-young', 'birthday', 'Mia Young', 'turned 23 three days ago.'),
  // Ten more, about clients already on the dashboard so each keeps the same photo everywhere.
  hl('ethan-smith', 'milestone', 'Ethan Smith', 'logged his 100th workout'),
  hl('penelope-brooks', 'milestone', 'Penelope Brooks', 'set a new deadlift PR of 120 kg'),
  hl('andrew-scott', 'milestone', 'Andrew Scott', 'finished the 12-week Strength Foundations program'),
  hl('layla-mitchell', 'milestone', 'Layla Mitchell', 'logged her meals 30 days in a row'),
  hl('gabriella-clark', 'birthday', 'Gabriella Clark', 'turns 34 today.'),
  hl('elijah-wright', 'birthday', 'Elijah Wright', 'turns 41 tomorrow.'),
  hl('evelyn-moore', 'birthday', 'Evelyn Moore', 'turned 27 yesterday.'),
  hl('alexander-thompson', 'anniversary', 'Alexander Thompson', 'just reached his 2-year coaching anniversary'),
  hl('grace-adams', 'anniversary', 'Grace Adams', 'just reached her 1-year coaching anniversary'),
  hl('owen-price', 'anniversary', 'Owen Price', 'just reached his 6-month coaching anniversary'),
];
