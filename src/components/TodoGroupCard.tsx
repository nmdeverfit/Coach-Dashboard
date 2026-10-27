import type { ReactNode } from 'react';
import type { Todo } from '../data/types';
import { getClient } from '../state/store';

export type CardRole = 'main' | 'related';

/**
 * Grouped to-dos (the user's call; no frame): a client's main to-do, the highest by `TYPE_PRIORITY`, as a full row
 * (action, client, reason), then up to four related to-dos under it, each its short action only, no reason. No card
 * or tint of its own: the group sits on the list like single rows, one divider under it, and a connect line, as in
 * Linear's sub-issues, runs down from the main row's checkbox past the related rows (the user's call). Every row keeps
 * its own checkbox, Dismiss and panel. A ticked row dims in place; the group moves to the bottom of its section only
 * once every row in it is done (`TodayBrief`).
 */
export function TodoGroupCard({
  groupKey,
  todos,
  renderRow,
}: {
  groupKey: string;
  todos: Todo[];
  renderRow: (t: Todo, role: CardRole) => ReactNode;
}) {
  const [main, ...related] = todos;
  const client = getClient(main.clientId);
  return (
    <li data-todo-id={groupKey} className="border-b border-line">
      <ul aria-label={`${todos.length} to-dos for ${client.name}`} className="relative pb-1.5">
        {/* From under the main row's checkbox (x 20, its bottom 36 px down) to the last related row's middle. */}
        {related.length > 0 && <span aria-hidden className="pointer-events-none absolute bottom-6 left-5 top-[38px] z-[1] w-px -translate-x-1/2 bg-line-light" />}
        {renderRow(main, 'main')}
        {related.map((t) => renderRow(t, 'related'))}
      </ul>
    </li>
  );
}
