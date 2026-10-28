import { statusLine } from '../lib/dashboard';
import { GROUPED_TODOS } from '../lib/flags';
import { checkinTitle } from '../lib/client';
import { rowReasonFor, rowTitleFor } from '../lib/todos';
import { todoDetails } from './details';
import { DEMO_TODAY, findPerson, todos as baseTodos } from './mock';
import { getProfile } from './profiles';
import { getSessions } from './sessions';
import type { RowTitle, Todo, TodoDetail, TodoType } from './types';

/**
 * Grouped to-dos, a trial outside the brief (the user's call): a client can have several to-dos on one day, shown as a
 * group on Today's Brief and as Related to-dos in the panel. Built only with `VITE_GROUPED_TODOS=1`
 * (`npm run build:artifact:grouped`, its own artifact); every other build keeps one to-do per client.
 */
export { GROUPED_TODOS };

/**
 * The type priority that orders a client's to-dos: the first is the group's main to-do. Check-in ranks first in this
 * trial (the user's call); Spec 4 BL3 puts Respond above it.
 */
export const TYPE_PRIORITY: TodoType[] = ['checkin', 'respond', 'build', 'remind', 'unblock', 'prepare', 'acknowledge', 'congratulate', 'kudos', 'adjust'];
export const byPriority = (a: Todo, b: Todo) => TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type);

/** Unblock and Prepare panels read the client's own bookings and credits, so every surface agrees (AC4). */
const unblock = (clientId: string): TodoDetail => ({ kind: 'unblock', credits: getSessions(clientId)!.credits });
const prepare = (clientId: string): TodoDetail => ({ kind: 'prepare', sessions: getSessions(clientId)!.sessions });

/**
 * The extra to-dos: clients whose own data raises more than one to-do under BL7. Ethan and Penelope have credits
 * expiring within 7 days and a session today or tomorrow (Unblock + Prepare). Wade, the three-to-do case, needs
 * attention (Check-in), has one PT credit left (Unblock) and, in this trial only, a PT session tomorrow (Prepare;
 * `sessions.ts`). Aisha, at risk, sent a form that waits for review (Check-in + Respond). Each group sits where its
 * client should rank in the list.
 */
const EXTRA: { after: string; todos: (Omit<Todo, 'reason' | 'raisedOn' | 'state'> & { detail?: TodoDetail })[] }[] = [
  // Aisha, near the top: at risk (Check-in) with her Weekly Check-in sent Sun 30 Aug and not reviewed (Respond, `g9`).
  {
    after: 't2',
    todos: [
      { id: 'g8', clientId: 'aisha-doyle', type: 'checkin', action: 'Check in with' },
      { id: 'g9', clientId: 'aisha-doyle', type: 'respond', action: 'Reply to' },
    ],
  },
  { after: 't3', todos: [{ id: 'g1', clientId: 'wade-warren', type: 'checkin', action: 'Check in with' }] },
  {
    after: 't5',
    todos: [
      { id: 'g2', clientId: 'wade-warren', type: 'unblock', action: 'Issue credit for', detail: unblock('wade-warren') },
      { id: 'g7', clientId: 'wade-warren', type: 'prepare', action: 'Prepare for the session with', detail: prepare('wade-warren') },
      { id: 'g3', clientId: 'ethan-smith', type: 'unblock', action: 'Issue credit for', detail: unblock('ethan-smith') },
      { id: 'g4', clientId: 'ethan-smith', type: 'prepare', action: 'Prepare for the session with', detail: prepare('ethan-smith') },
      { id: 'g5', clientId: 'penelope-brooks', type: 'unblock', action: 'Issue credit for', detail: unblock('penelope-brooks') },
      { id: 'g6', clientId: 'penelope-brooks', type: 'prepare', action: 'Prepare for the session with', detail: prepare('penelope-brooks') },
    ],
  },
];

/** Titles for the carried rows with no panel data, in the same sentence form (their reasons are the design's copy). */
const TITLES: Record<string, RowTitle> = {
  p1: { lead: 'Check in with', tail: 'after 15 days with no activity or reply', short: 'Check in after 15 days with no activity or reply' },
  p2: { lead: 'Send kudos to', tail: 'for getting back on track after two weeks at risk', short: 'Send kudos for getting back on track' },
};

/** Every row's title: the action and its reason in one sentence (`RowTitle`), the reason line no longer shown. */
function titleOf(t: Todo): RowTitle | undefined {
  const d = todoDetails[t.id];
  const client = findPerson(t.clientId)!;
  if (d) return rowTitleFor(d, client.firstName, DEMO_TODAY);
  if (t.type === 'checkin' && !TITLES[t.id]) return checkinTitle(getProfile(client.id), DEMO_TODAY);
  return TITLES[t.id];
}

function withGroups(base: Todo[]): Todo[] {
  const out = [...base];
  for (const { after, todos } of EXTRA) {
    const made = todos.map(({ detail, ...t }): Todo => {
      const client = findPerson(t.clientId)!;
      if (detail) todoDetails[t.id] = detail;
      const d = todoDetails[t.id];
      // A Check-in with no hand-written panel data reads the client detail page's assessment, as the list does.
      const reason = d ? rowReasonFor(d, client.firstName, DEMO_TODAY) : statusLine(client, getProfile(client.id), DEMO_TODAY);
      return { ...t, reason, raisedOn: DEMO_TODAY, state: 'open' };
    });
    out.splice(out.findIndex((t) => t.id === after) + 1, 0, ...made);
  }
  return out.map((t) => ({ ...t, title: titleOf(t) }));
}

export const seedTodos: Todo[] = GROUPED_TODOS ? withGroups(baseTodos) : baseTodos;

/** A group is one main to-do and at most this many related ones (the user's call). */
export const MAX_RELATED = 4;

/**
 * A section's to-dos as client groups: in the order each client first appears, each sorted by `TYPE_PRIORITY`, the
 * first its main to-do, then up to `MAX_RELATED` related ones (no client in the demo has more than three to-dos).
 */
export function groupByClient(todos: Todo[]): { key: string; todos: Todo[] }[] {
  const groups = new Map<string, Todo[]>();
  for (const t of todos) groups.set(t.clientId, [...(groups.get(t.clientId) ?? []), t]);
  return [...groups].map(([clientId, list]) => ({ key: `client:${clientId}`, todos: list.sort(byPriority).slice(0, 1 + MAX_RELATED) }));
}
