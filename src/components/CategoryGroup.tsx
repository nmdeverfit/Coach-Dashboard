import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import chevronSmall from '../assets/figma/icon-chevron-right-small.svg';
import iconMore from '../assets/figma/icon-more.svg';
import { cardMembers } from '../lib/groups';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { CountChip } from './CountChip';
import { isCore, type GroupMeta } from './groups';

/** The card's 20 px icon, inside Figma's inset/bleed wrappers. */
export function GroupIcon({ group }: { group: GroupMeta }) {
  return (
    <span className="relative size-5 shrink-0 overflow-hidden" aria-hidden>
      <span className={`absolute ${group.iconInset}`}>
        <span className={`absolute ${group.iconBleed}`}>
          <img src={group.icon} alt="" className="block size-full max-w-none" />
        </span>
      </span>
    </span>
  );
}

/** The ⋯ menu at a card's top-right (layout test): Collapse / Expand, Remove (added groups only), Customize groups. */
function CardMenu({ group, collapsed, onCustomize }: { group: GroupMeta; collapsed: boolean; onCustomize: () => void }) {
  const { state, setRail, toggleCollapsed } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const item = 'flex w-full items-center px-3 py-2 text-left text-[13px] leading-[1.5] text-ink hover:bg-surface-secondary';
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`${group.title} options`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex size-7 items-center justify-center rounded-md hover:bg-surface-secondary ${open ? 'bg-surface-secondary' : ''}`}
      >
        <img src={iconMore} alt="" width={16} height={16} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-8 z-20 w-[190px] animate-fade-in rounded-lg border border-[#e0e0e0] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <button type="button" role="menuitem" onClick={run(() => toggleCollapsed(group.key))} className={item}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          {!isCore(group.key) && (
            <button
              type="button"
              role="menuitem"
              onClick={run(() => setRail({ order: state.rail.order.filter((k) => k !== group.key), collapsed: state.rail.collapsed.filter((k) => k !== group.key) }))}
              className={`${item} text-danger`}
            >
              Remove group
            </button>
          )}
          <div className="my-1 border-t border-line" />
          <button type="button" role="menuitem" onClick={run(onCustomize)} className={item}>
            Customize groups…
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A rail group card. `collapsed` keeps only the header (icon, title, count, View all), so its count and full list stay
 * one click away (AC5) while the rail gets shorter. `narrow`: the three-part layout's stacked rail, where the list
 * stops partway into the fourth client to keep it short.
 */
export function CategoryGroup({
  group,
  wide = false,
  narrow = false,
  onCustomize,
}: {
  group: GroupMeta;
  wide?: boolean;
  narrow?: boolean;
  onCustomize: () => void;
}) {
  const { state, openGroup, selectClient, toggleCollapsed, reviewedNow } = useStore();
  // Cards follow the week selector: a past week shows that Monday's groups.
  const members = cardMembers(group.key, state.weekOffset, { todos: state.todos, reviewed: reviewedNow });
  const collapsed = state.rail.collapsed.includes(group.key);

  return (
    // In the two-column grid (past weeks) a collapsed card spans both columns as one slim bar, so it leaves no hole.
    <article className={`flex flex-col rounded-xl bg-white ${collapsed && !narrow ? 'col-span-2' : ''}`}>
      <header className={`flex flex-col gap-1.5 px-4 ${collapsed ? 'py-3' : 'pb-1 pt-4'}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => toggleCollapsed(group.key)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <GroupIcon group={group} />
            <h3 className="truncate text-[14px] font-bold leading-[1.5] text-ink">{group.title}</h3>
            <CountChip value={members.length} />
            <ChevronDown size={14} className={`shrink-0 text-ink-secondary transition-transform ${collapsed ? '-rotate-90' : ''}`} aria-hidden />
          </button>
          {collapsed && (
            <button
              type="button"
              onClick={() => openGroup(group.key)}
              className="flex shrink-0 items-center gap-1 text-[12px] font-semibold leading-normal text-ink-secondary hover:text-ink"
            >
              View all
              <img src={chevronSmall} alt="" width={14} height={14} />
            </button>
          )}
          <CardMenu group={group} collapsed={collapsed} onCustomize={onCustomize} />
        </div>
        {/* Half width, two-line descriptions keep the paired cards aligned; at full width each fits one line. */}
        {!collapsed && <p className={`${wide ? '' : 'min-h-[36px]'} text-[12px] leading-[1.5] text-ink-secondary`}>{group.description}</p>}
      </header>
      {!collapsed && (
        <>
          {/* Rows are 53 px: 210 shows four; 186 shows three and half of the fourth, a hint that the list scrolls. */}
          <ul className={`scroll-thin ${narrow ? 'max-h-[186px]' : 'h-[210px]'} overflow-y-auto px-3`}>
            {members.length === 0 && <li className="px-1 py-3 text-[13px] leading-[1.5] text-ink-muted">No clients here right now.</li>}
            {members.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  data-client-row
                  aria-current={state.selectedClientId === client.id ? 'true' : undefined}
                  onClick={() => selectClient(client.id)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-line/80 px-1 py-3 text-left hover:bg-surface-secondary/60 ${
                    state.selectedClientId === client.id ? 'bg-surface-secondary' : ''
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={client.name} src={client.avatar} />
                    <span className="truncate text-[13px] font-semibold leading-[1.5] text-ink">{client.name}</span>
                  </span>
                  {group.suffix && <span className="whitespace-nowrap text-[12px] text-ink-secondary tabular-nums">{group.suffix(client)}</span>}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => openGroup(group.key)}
            className="relative flex items-center gap-1 rounded-b-xl bg-white px-4 py-3 text-[12px] font-semibold leading-normal text-ink-secondary shadow-see-all hover:text-ink"
          >
            View all
            <img src={chevronSmall} alt="" width={14} height={14} />
          </button>
        </>
      )}
    </article>
  );
}
