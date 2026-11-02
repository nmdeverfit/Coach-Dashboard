import type { ReactNode } from 'react';
import iconCheck from '../assets/figma/icon-check.svg';
import iconCheckWhite from '../assets/figma/icon-check-white.svg';
import type { Todo } from '../data/types';
import { plural } from '../lib/todos';
import { getClient } from '../state/store';
import { Avatar } from './Avatar';
import { Tooltip } from './Tooltip';

export type CardRole = 'main' | 'related';

/**
 * Grouped to-dos (the user's call; no frame), laid out as the user's reference "One-line Grouped To-dos": a header
 * row names the client once ("Aisha Doyle has 2 to-dos to look at today", "… is all done for today"), its checkbox
 * completing every open to-do of the group at once (or reopening them all once all are done); under it each to-do,
 * the highest by `TYPE_PRIORITY` first, reads its one-line `short` title with no client. No card or tint: a
 * Linear-style connect line runs from the header's checkbox down past the rows. Every row keeps its own checkbox,
 * Dismiss and panel; a ticked row dims in place, and the group moves to the bottom of its section only once every
 * row in it is done (`TodayBrief`).
 */
export function TodoGroupCard({
  groupKey,
  todos,
  renderRow,
  onToggleAll,
}: {
  groupKey: string;
  todos: Todo[];
  renderRow: (t: Todo, role: CardRole) => ReactNode;
  onToggleAll: () => void;
}) {
  const client = getClient(todos[0].clientId);
  const done = todos.every((t) => t.state === 'completed');
  const open = todos.filter((t) => t.state !== 'completed').length;
  const summary = done ? 'is all done for today' : `has ${plural(open, 'to-do')} to look at today`;
  return (
    <li data-todo-id={groupKey} className="border-b border-line">
      <ul aria-label={`${todos.length} to-dos for ${client.name}`} className="relative pb-1.5">
        {/* From under the header's checkbox (x 20, its bottom 36 px down) to the last row's middle. */}
        <span aria-hidden className="pointer-events-none absolute bottom-6 left-5 top-[38px] z-[1] w-px -translate-x-1/2 bg-line-light" />
        <li className="flex items-center gap-2 px-2 pb-1.5 pt-[10px]">
          <div className="relative h-8 w-6 shrink-0">
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              aria-label={done ? `Reopen all to-dos for ${client.name}` : `Complete all to-dos for ${client.name}`}
              onClick={onToggleAll}
              className={`group/tip absolute left-1/2 top-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[0.938px] border-black/15 ${
                done ? 'bg-checked' : 'bg-white hover:border-brand'
              }`}
            >
              <span className="relative size-[10px]">
                <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
                  <img src={done ? iconCheckWhite : iconCheck} alt="" className="block size-full max-w-none" />
                </span>
              </span>
              <Tooltip label={done ? 'Reopen all' : 'Complete all'} />
            </button>
          </div>
          <div className={`flex min-w-0 flex-1 items-center gap-1.5 text-[13px] leading-[1.5] ${done ? 'opacity-60' : ''}`}>
            <span className="flex shrink-0 items-center gap-1.5 py-0.5 pl-0.5">
              <Avatar name={client.name} src={client.avatar} />
              <span className="whitespace-nowrap font-semibold text-ink">{client.name}</span>
            </span>
            <span className="min-w-0 truncate font-semibold text-ink">{summary}</span>
          </div>
        </li>
        {todos.map((t) => renderRow(t, 'related'))}
      </ul>
    </li>
  );
}
