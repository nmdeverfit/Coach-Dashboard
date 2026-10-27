import type { ReactNode } from 'react';
import type { Todo } from '../data/types';
import { getClient } from '../state/store';

export type CardRole = 'main' | 'related';

/**
 * Grouped to-dos, the card layout (the user's call; no frame): a bordered card in the list holding a client's main
 * to-do, the highest by `TYPE_PRIORITY`, as a full row (action, client, reason), then up to four related to-dos
 * under it, each its short action only, no reason. Every row keeps its own checkbox, Dismiss and panel. A ticked row
 * dims in place; the card moves to the bottom of its section only once every row in it is done (`TodayBrief`). The
 * card has its own faint brand tint, so a group reads apart from the single rows on the list's grey, and turns white
 * on hover, or while one of its to-dos is open in the panel (the user's call).
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
    <li data-todo-id={groupKey} className="py-1.5">
      <div className="overflow-hidden rounded-lg border border-line bg-brand/[0.04] transition-colors duration-150 hover:bg-white hover:shadow-row has-[[aria-current=true]]:bg-white">
        <ul aria-label={`${todos.length} to-dos for ${client.name}`} className="pb-1.5">
          {renderRow(main, 'main')}
          {related.map((t) => renderRow(t, 'related'))}
        </ul>
      </div>
    </li>
  );
}
