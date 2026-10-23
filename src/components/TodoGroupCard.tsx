import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { Todo } from '../data/types';
import { getClient } from '../state/store';
import { Avatar } from './Avatar';
import { SHORT_ACTION } from './TodoRow';

/**
 * Grouped to-dos, card layout (option B, a trial beside the dashed-line groups; no frame): a white card in the list
 * with a client header (avatar, name, "3 to-dos" or "1 of 3 done", collapse chevron) over the client's to-dos, which
 * keep their own checkbox, Dismiss and panel. Collapsed, the header keeps a one-line list of what is left.
 */
export function TodoGroupCard({ groupKey, todos, children }: { groupKey: string; todos: Todo[]; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const client = getClient(todos[0].clientId);
  const done = todos.filter((t) => t.state === 'completed').length;
  const open = todos.filter((t) => t.state !== 'completed');
  return (
    <li data-todo-id={groupKey} className="py-1.5">
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_1px_2px_rgba(24,78,255,0.06)]">
        <button
          type="button"
          data-keep-open
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-2 px-2 py-2.5 text-left hover:bg-surface-secondary/60"
        >
          <Avatar name={client.name} src={client.avatar} />
          <span className="min-w-0 truncate text-[13px] font-semibold leading-[1.5] text-ink">{client.name}</span>
          <span className="shrink-0 rounded-full bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold leading-4 text-ink-secondary">
            {done ? `${done} of ${todos.length} done` : `${todos.length} to-dos`}
          </span>
          {collapsed && open.length > 0 && (
            <span className="min-w-0 flex-1 truncate text-[12px] leading-normal text-ink-tertiary">{open.map((t) => SHORT_ACTION[t.type]).join(' · ')}</span>
          )}
          <ChevronDown size={16} aria-hidden className={`ml-auto shrink-0 text-ink-secondary transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        {!collapsed && (
          <ul aria-label={`${todos.length} to-dos for ${client.name}`} className="divide-y divide-line border-t border-line">
            {children}
          </ul>
        )}
      </div>
    </li>
  );
}
