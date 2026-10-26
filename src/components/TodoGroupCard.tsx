import { ChevronDown } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { SENTENCE_HEADERS } from '../data/groupedTodos';
import type { Todo } from '../data/types';
import { getClient } from '../state/store';
import { Avatar } from './Avatar';
import { reducedMotion } from './ClientListParts';
import { SHORT_ACTION } from './TodoRow';

/** A ticked row shows its tick this long before it drops to the bottom of its card (the list's own sink is 470 ms). */
const SINK_MS = 450;

const isDone = (t: Todo) => t.state === 'completed';

/**
 * A ticked to-do drops below the open ones in its card once its tick has shown; an unticked one goes straight back to
 * its BL3 place. The sort is stable, so each part keeps its order.
 */
function useDoneLast(todos: Todo[], on: boolean): Todo[] {
  const key = todos.filter(isDone).map((t) => t.id).join();
  const [sunk, setSunk] = useState(() => new Set(key ? key.split(',') : []));
  useEffect(() => {
    if (!on) return;
    const now = new Set(key ? key.split(',') : []);
    setSunk((s) => new Set([...s].filter((id) => now.has(id))));
    const timer = window.setTimeout(() => setSunk(now), reducedMotion() ? 0 : SINK_MS);
    return () => window.clearTimeout(timer);
  }, [key, on]);
  return on ? [...todos].sort((a, b) => Number(sunk.has(a.id)) - Number(sunk.has(b.id))) : todos;
}

/**
 * Grouped to-dos, the card layout (option B, the user's pick; no frame): a bordered card in the list with a client
 * header over the client's to-dos, which keep their own checkbox, Dismiss and panel. The card has its own faint brand
 * tint, so a group reads apart from the single rows on the list's grey, and turns white on hover, or while one of its
 * to-dos is open in the panel (the user's call). Collapsed, the header
 * keeps a one-line list of what is left.
 *
 * Two headers, side by side for comparison (the user's call). The name-and-pill one: avatar, name, "3 to-dos" or
 * "1 of 3 done", chevron at the right. The sentence one (SENTENCE_HEADERS): the chevron sits in the rows' checkbox
 * column so the sentence starts on the rows' text edge; the whole sentence is one style, 13 px semibold `ink`, the
 * rows' own action style (the user's call); it counts what is left ("All done with"
 * once nothing is); ticked rows drop to the bottom of the card. Open, the header carries no avatar, since each row
 * keeps its full action with the client's avatar and name; collapsed, the rows are gone, so the avatar comes back
 * before the name (the user's call).
 */
export function TodoGroupCard({
  groupKey,
  todos,
  renderRow,
}: {
  groupKey: string;
  todos: Todo[];
  /** `fullAction`: the row keeps its full action and client chip (the sentence header names no avatar). */
  renderRow: (t: Todo, fullAction: boolean) => ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const client = getClient(todos[0].clientId);
  const sentence = SENTENCE_HEADERS.has(client.id);
  const rows = useDoneLast(todos, sentence);
  const done = todos.filter(isDone).length;
  const open = todos.filter((t) => !isDone(t));
  const chevron = <ChevronDown size={16} aria-hidden className={`shrink-0 text-ink-secondary transition-transform ${collapsed ? '-rotate-90' : ''}`} />;
  const who = (
    <>
      <Avatar name={client.name} src={client.avatar} />
      <span className="min-w-0 truncate text-[13px] font-semibold leading-[1.5] text-ink">{client.name}</span>
    </>
  );
  return (
    <li data-todo-id={groupKey} className="py-1.5">
      <div className="overflow-hidden rounded-lg border border-line bg-brand/[0.04] transition-colors duration-150 hover:bg-white hover:shadow-row has-[[aria-current=true]]:bg-white">
        <button
          type="button"
          data-keep-open
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${client.name}’s to-dos`}
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center gap-2 px-2 py-2.5 text-left hover:bg-surface-secondary/60"
        >
          {sentence ? (
            <>
              {/* The chevron takes the rows' 24 px checkbox column, so the sentence lines up with their text. */}
              <span className="flex w-6 shrink-0 justify-center">{chevron}</span>
              <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold leading-[1.5] text-ink">
                <span className="whitespace-nowrap">{open.length ? `${open.length} to-do${open.length === 1 ? '' : 's'} left with` : 'All done with'}</span>
                {collapsed && <Avatar name={client.name} src={client.avatar} />}
                <span className="min-w-0 truncate">{client.name}</span>
              </span>
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
          {!sentence && <span className="ml-auto">{chevron}</span>}
        </button>
        {!collapsed && (
          <ul aria-label={`${todos.length} to-dos for ${client.name}`} className="divide-y divide-line border-t border-line">
            {rows.map((t) => renderRow(t, sentence))}
          </ul>
        )}
      </div>
    </li>
  );
}
