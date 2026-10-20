import { ASSESSMENT, CONSULT, PILATES, PT, todoDetails } from './details';
import type { Booking, CreditPool, PrepareDetail, SessionType, UnblockDetail } from './types';

/**
 * 1:1 bookings and session credits, by client: the raw data behind the Upcoming bookings card, the Booking tab of
 * the client list and the Prepare / Unblock panels. Malcom's bookings are his Prepare panel's and Wendy's credits her
 * Unblock panel's, so every surface agrees (AC4). Session labels, balances and expiry lines are computed from these.
 */
export interface ClientSessions {
  sessions: Booking[];
  credits: CreditPool[];
}

const booked = (type: Booking['type'], date: string, start: string): Booking => ({ type, date, start, status: 'booked' });
const done = (type: Booking['type'], date: string, start: string): Booking => ({ type, date, start, status: 'completed' });

export const clientSessions: Record<string, ClientSessions> = {
  'ethan-smith': {
    sessions: [done(PT, '2026-08-24', '18:30'), done(PT, '2026-08-27', '18:30'), booked(PT, '2026-08-31', '18:30')],
    credits: [{ type: PT, batches: [{ count: 2, expiresOn: '2026-09-04' }, { count: 8 }] }],
  },
  'alexander-thompson': {
    sessions: [done(CONSULT, '2026-08-17', '18:45'), booked(CONSULT, '2026-08-31', '18:45')],
    credits: [{ type: CONSULT, batches: [{ count: 6 }] }],
  },
  'penelope-brooks': {
    sessions: [done(PILATES, '2026-08-25', '08:00'), booked(PILATES, '2026-09-01', '08:00')],
    credits: [{ type: PILATES, batches: [{ count: 3, expiresOn: '2026-09-03' }, { count: 5 }] }],
  },
  'gabriella-clark': {
    sessions: [done(ASSESSMENT, '2026-08-04', '11:00'), booked(ASSESSMENT, '2026-09-01', '11:00')],
    credits: [
      { type: ASSESSMENT, batches: [{ count: 4 }] },
      { type: CONSULT, batches: [{ count: 2 }] },
    ],
  },
  'malcom-reed': {
    sessions: (todoDetails.t6 as PrepareDetail).sessions,
    credits: [
      { type: PT, batches: [{ count: 6 }] },
      { type: CONSULT, batches: [{ count: 3 }] },
    ],
  },
  'sam-rivera': {
    sessions: [done(PT, '2026-08-27', '09:00'), booked(PT, '2026-09-03', '09:00')],
    credits: [{ type: PT, batches: [{ count: 12 }] }],
  },
  // Credits running out and nothing booked: her Unblock to-do.
  'wendy-kurtz': {
    sessions: [done(PILATES, '2026-08-12', '17:00'), done(PT, '2026-08-19', '17:00')],
    credits: (todoDetails.t5 as UnblockDetail).credits,
  },
  'wade-warren': {
    sessions: [done(PT, '2026-08-10', '07:30'), done(PT, '2026-08-17', '07:30')],
    credits: [{ type: PT, batches: [{ count: 1 }] }],
  },
  // Booked before, no credits left on any session type.
  'grace-adams': {
    sessions: [done(CONSULT, '2026-07-28', '12:00')],
    credits: [],
  },
};

export const getSessions = (clientId: string): ClientSessions | undefined => clientSessions[clientId];

/** A small-group class: one session on the calendar, many clients in it (the user's call; Phase 1 bookings are 1:1). */
export interface GroupSession extends Booking {
  /** The occurrence, e.g. "hiit-2026-09-01". */
  id: string;
  capacity: number;
  address: string;
  directions: string;
  description: string;
  creditsPerSpot: number;
  enrolled: string[];
  canceled: string[];
}

export const HIIT: SessionType = { name: 'Small group HIIT', color: '#3975ff', minutes: 60, location: 'in_person' };

const HIIT_ROSTER = [
  'ethan-smith', 'sam-rivera', 'penelope-brooks', 'ryan-ford', 'jenny-wilson', 'cody-fisher', 'leo-midgett',
  'darrell-steward', 'glen-johnson', 'sidney-goyette-kihn', 'andrew-scott', 'layla-mitchell', 'evelyn-moore',
  'noah-kim', 'isla-brown', 'zoey-wright', 'chloe-martin',
];

/** Every Tuesday at 5:30 PM since the logs start (4 Aug); the ones before today are done. */
export const groupSessions: GroupSession[] = ['2026-08-04', '2026-08-11', '2026-08-18', '2026-08-25', '2026-09-01'].map((date) => ({
  id: `hiit-${date}`,
  type: HIIT,
  date,
  start: '17:30',
  status: date < '2026-08-31' ? 'completed' : 'booked',
  capacity: 23,
  address: '123 Main St, Boston, MA 02110',
  directions: 'Go through the front door',
  description: 'Strength and cardio intervals in a small group, each move scaled to the level of the person doing it.',
  creditsPerSpot: 1,
  enrolled: HIIT_ROSTER,
  canceled: ['emma-williams'],
}));

export const getGroupSession = (id: string) => groupSessions.find((s) => s.id === id);
