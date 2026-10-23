import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { SENTENCE_HEADERS } from '../data/groupedTodos';
import type { Todo } from '../data/types';
import { getClient } from '../state/store';
import { Avatar } from './Avatar';
import { SHORT_ACTION } from './TodoRow';

/**
 * Grouped to-dos, the card layout (option B, the user's pick; no frame): a bordered card in the list with a client
 * header (avatar, name, "3 to-dos" or "1 of 3 done", collapse chevron) over the client's to-dos, which keep their own
 * checkbox, Dismiss and panel. The card sits on the list's grey and turns white on hover, or while one of its to-dos
 * is open in the panel (the user's call). Collapsed, the header keeps a one-line list of what is left.
 * For the clients in SENTENCE_HEADERS the header reads like a to-do row instead: "3 to-dos with [avatar] Wade Warren",
 * then "· 1 done" once any is ticked.
 */
export function TodoGroupCard({ groupKey, todos, children }: { groupKey: string; todos: Todo[]; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const client = getClient(todos[0].clientId);
  const done = todos.filter((t) => t.state === 'completed').length;
  const open = todos.filter((t) => t.state !== 'completed');
  const sentence = SENTENCE_HEADERS.has(client.id);
  const who = (
    <>
      <Avatar name={client.name} src={client.avatar} />
      <span className="min-w-0 truncate text-[13px] font-semibold leading-[1.5] text-ink">{client.name}</span>
    </>
  );
  return (
    <li data-todo-id={groupKey} className="py-1.5">
      <div className="overflow-hidden rounded-lg border border-line transition-colors duration-150 hover:bg-white hover:shadow-row has-[[aria-current=true]]:bg-white">
        <button
          type="button"
          data-keep-open
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-2 px-2 py-2.5 text-left hover:bg-surface-secondary/60"
        >
          {sentence ? (
            // The row's sentence shape (Figma 3925:6908's action + client chip): count, "with", avatar, name.
            <>
              <span className="whitespace-nowrap text-[13px] font-semibold leading-[1.5] text-ink">{todos.length} to-dos with</span>
              <span className="flex min-w-0 items-center gap-1.5">{who}</span>
              {done > 0 && <span className="shrink-0 whitespace-nowrap text-[12px] leading-normal text-ink-tertiary">· {done} done</span>}
            </>
          ) : (
            <>
              {who}
              <span className="shrink-0 rounded-full border border-line-light bg-white px-2 py-px text-[11px] font-semibold leading-4 text-ink-secondary">
                {done ? `${done} of ${todos.length} done` : `${todos.length} to-dos`}
              </span>
            </>
          )}
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
