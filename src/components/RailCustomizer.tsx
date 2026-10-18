import { ArrowDown, ArrowUp, GripVertical, Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { CardKey } from '../data/types';
import { cardMembers } from '../lib/groups';
import { DEFAULT_RAIL, useStore, type RailLayout } from '../state/store';
import { GroupIcon } from './CategoryGroup';
import { CountChip } from './CountChip';
import { ALL_GROUPS, EXTRA_GROUPS, MAX_GROUPS, isCore } from './groups';

const ICON_BUTTON = 'flex size-7 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-secondary hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent';

/**
 * Customize mode for the rail's group cards (layout test, no Figma frame). The cards turn into a list of compact rows:
 * drag (or ↑ / ↓) to reorder, Collapse / Expand, × to remove a group the coach added, and "+ Add group" opens the
 * groups that can be added. The brief's four cards can be collapsed but not removed, so each to-do type keeps its
 * full-list surface (AC5). Nothing changes until Done; Cancel throws the draft away; Reset goes back to the brief's
 * four, in order.
 */
export function RailCustomizer({ onClose }: { onClose: () => void }) {
  const { state, setRail, showToast, reviewedNow } = useStore();
  const [draft, setDraft] = useState<RailLayout>(state.rail);
  const [adding, setAdding] = useState(false);
  const [dragging, setDragging] = useState<CardKey | null>(null);
  const count = (key: CardKey) => cardMembers(key, state.weekOffset, { todos: state.todos, reviewed: reviewedNow }).length;
  const available = EXTRA_GROUPS.filter((g) => !draft.order.includes(g.key));
  const full = draft.order.length >= MAX_GROUPS;

  const moveTo = (key: CardKey, index: number) =>
    setDraft((d) => {
      const order = d.order.filter((k) => k !== key);
      order.splice(Math.max(0, Math.min(index, order.length)), 0, key);
      return { ...d, order };
    });
  const toggle = (key: CardKey) =>
    setDraft((d) => ({ ...d, collapsed: d.collapsed.includes(key) ? d.collapsed.filter((k) => k !== key) : [...d.collapsed, key] }));
  const remove = (key: CardKey) => setDraft((d) => ({ order: d.order.filter((k) => k !== key), collapsed: d.collapsed.filter((k) => k !== key) }));
  const add = (key: CardKey) => {
    setDraft((d) => ({ ...d, order: [...d.order, key] }));
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-white p-4 shadow-[0_4px_16px_rgba(24,78,255,0.08)]">
        <div className="flex flex-col gap-1">
          <h3 className="text-[14px] font-bold leading-[1.5] text-ink">Customize groups</h3>
          <p className="text-[12px] leading-[1.5] text-ink-secondary">
            Drag to reorder. Collapse a group to keep just its count; groups you add can be removed. Up to {MAX_GROUPS} groups.
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setDraft(DEFAULT_RAIL)} className="text-[13px] font-semibold text-ink-secondary underline hover:text-ink">
            Reset to default
          </button>
          <span className="flex gap-2">
            <button type="button" onClick={onClose} className="h-8 rounded-md border border-[#e0e0e0] bg-white px-4 text-[13px] font-semibold text-ink hover:bg-surface-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setRail(draft);
                showToast('Groups updated');
                onClose();
              }}
              className="h-8 rounded-md bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand/90"
            >
              Done
            </button>
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2" aria-label="Groups on your rail">
        {draft.order.map((key, i) => {
          const group = ALL_GROUPS[key];
          const collapsed = draft.collapsed.includes(key);
          return (
            <li
              key={key}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                setDragging(key);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragging && dragging !== key) moveTo(dragging, i);
              }}
              onDragEnd={() => setDragging(null)}
              className={`flex items-center gap-2 rounded-xl bg-white py-2.5 pl-2 pr-2 transition-shadow ${
                dragging === key ? 'opacity-50 ring-2 ring-brand/40' : 'hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
              }`}
            >
              <GripVertical size={16} className="shrink-0 cursor-grab text-ink-muted" aria-hidden />
              <GroupIcon group={group} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold leading-[1.5] text-ink">{group.title}</span>
              <CountChip value={count(key)} />
              <button
                type="button"
                aria-pressed={collapsed}
                onClick={() => toggle(key)}
                className="w-[64px] shrink-0 rounded-md py-1 text-center text-[12px] font-semibold text-ink-secondary hover:bg-surface-secondary hover:text-ink"
              >
                {collapsed ? 'Expand' : 'Collapse'}
              </button>
              <button type="button" aria-label={`Move ${group.title} up`} disabled={i === 0} onClick={() => moveTo(key, i - 1)} className={ICON_BUTTON}>
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                aria-label={`Move ${group.title} down`}
                disabled={i === draft.order.length - 1}
                onClick={() => moveTo(key, i + 1)}
                className={ICON_BUTTON}
              >
                <ArrowDown size={14} />
              </button>
              {isCore(key) ? (
                // Keeps the rows aligned; the brief's groups have no remove (AC5).
                <span className="size-7 shrink-0" title="Brief groups can be collapsed, not removed" />
              ) : (
                <button type="button" aria-label={`Remove ${group.title}`} onClick={() => remove(key)} className={`${ICON_BUTTON} hover:text-danger`}>
                  <X size={16} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-expanded={adding}
          disabled={full}
          onClick={() => setAdding((a) => !a)}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-brand/40 text-[13px] font-semibold text-brand hover:bg-brand/[0.03] disabled:border-ink/15 disabled:text-ink-muted disabled:hover:bg-transparent"
        >
          <Plus size={16} />
          {full ? `Up to ${MAX_GROUPS} groups` : 'Add group'}
        </button>
        {adding && (
          <div className="flex animate-fade-in flex-col rounded-xl bg-white p-1">
            {available.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-ink-muted">Every group is already on your rail.</p>
            ) : (
              available.map((g) => (
                <div key={g.key} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-surface-secondary/60">
                  <GroupIcon group={g} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2 text-[13px] font-semibold leading-[1.5] text-ink">
                      {g.title} <CountChip value={count(g.key)} />
                    </span>
                    <span className="text-[12px] leading-[1.5] text-ink-secondary">{g.description}</span>
                  </span>
                  <button type="button" onClick={() => add(g.key)} className="h-7 shrink-0 rounded-md border border-brand px-3 text-[12px] font-semibold text-brand hover:bg-brand/[0.05]">
                    Add
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
