import { statusLine } from '../lib/dashboard';
import { rowReasonFor } from '../lib/todos';
import { todoDetails } from './details';
import { DEMO_TODAY, findPerson, todos as baseTodos } from './mock';
import { getProfile } from './profiles';
import { getSessions } from './sessions';
import type { Todo, TodoDetail, TodoType } from './types';

/**
 * Grouped to-dos, a trial outside the brief (the user's call): a client can have several to-dos on one day, shown as a
 * group on Today's Brief and as Related to-dos in the panel. Built only with `VITE_GROUPED_TODOS=1`
 * (`npm run build:artifact:grouped`, its own artifact); every other build keeps one to-do per client.
 */
export const GROUPED_TODOS = import.meta.env.VITE_GROUPED_TODOS === '1';

/** Spec 4 BL3's type priority, which orders a client's to-dos and the groups themselves. */
export const TYPE_PRIORITY: TodoType[] = ['respond', 'checkin', 'build', 'remind', 'unblock', 'prepare', 'acknowledge', 'congratulate', 'kudos', 'adjust'];
export const byPriority = (a: Todo, b: Todo) => TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type);

/** Unblock and Prepare panels read the client's own bookings and credits, so every surface agrees (AC4). */
const unblock = (clientId: string): TodoDetail => ({ kind: 'unblock', credits: getSessions(clientId)!.credits });
const prepare = (clientId: string): TodoDetail => ({ kind: 'prepare', sessions: getSessions(clientId)!.sessions });

/**
 * The extra to-dos: clients whose own data already raises a second to-do under BL7. Ethan and Penelope have credits
 * expiring within 7 days and a session today or tomorrow (Unblock + Prepare); Wade needs attention (Check-in) and has
 * one PT credit left (Unblock). Each sits after the to-do it ranks below, so the list keeps BL3's order.
 */
const EXTRA: { after: string; todos: (Omit<Todo, 'reason' | 'raisedOn' | 'state'> & { detail?: TodoDetail })[] }[] = [
  { after: 't3', todos: [{ id: 'g1', clientId: 'wade-warren', type: 'checkin', action: 'Check in with' }] },
  {
    after: 't5',
    todos: [
      { id: 'g2', clientId: 'wade-warren', type: 'unblock', action: 'Issue credit for', detail: unblock('wade-warren') },
      { id: 'g3', clientId: 'ethan-smith', type: 'unblock', action: 'Issue credit for', detail: unblock('ethan-smith') },
      { id: 'g4', clientId: 'ethan-smith', type: 'prepare', action: 'Prepare for the session with', detail: prepare('ethan-smith') },
      { id: 'g5', clientId: 'penelope-brooks', type: 'unblock', action: 'Issue credit for', detail: unblock('penelope-brooks') },
      { id: 'g6', clientId: 'penelope-brooks', type: 'prepare', action: 'Prepare for the session with', detail: prepare('penelope-brooks') },
    ],
  },
];

function withGroups(base: Todo[]): Todo[] {
  const out = [...base];
  for (const { after, todos } of EXTRA) {
    const made = todos.map(({ detail, ...t }): Todo => {
      const client = findPerson(t.clientId)!;
      if (detail) todoDetails[t.id] = detail;
      // A Check-in with no hand-written panel data reads the client detail page's assessment, as the list does.
      const reason = detail ? rowReasonFor(detail, client.firstName, DEMO_TODAY) : statusLine(client, getProfile(client.id), DEMO_TODAY);
      return { ...t, reason, raisedOn: DEMO_TODAY, state: 'open' };
    });
    out.splice(out.findIndex((t) => t.id === after) + 1, 0, ...made);
  }
  return out;
}

export const seedTodos: Todo[] = GROUPED_TODOS ? withGroups(baseTodos) : baseTodos;

/** A section's to-dos as client groups: in the order each client first appears, each group sorted by BL3. */
export function groupByClient(todos: Todo[]): { key: string; todos: Todo[] }[] {
  const groups = new Map<string, Todo[]>();
  for (const t of todos) groups.set(t.clientId, [...(groups.get(t.clientId) ?? []), t]);
  return [...groups].map(([clientId, list]) => ({ key: `client:${clientId}`, todos: list.sort(byPriority) }));
}
