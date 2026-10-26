import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import chevronSmall from '../assets/figma/icon-chevron-right-small.svg';
import dotTiny from '../assets/figma/dot-tiny.svg';
import iconMore from '../assets/figma/icon-more.svg';
import { oneToOneId } from '../data/sessions';
import { formatMonthDay, parseDay } from '../lib/dates';
import { cardMembers } from '../lib/groups';
import { timeSpan } from '../lib/todos';
import { sessionsInWeek, weekAsOf } from '../lib/week';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { CountChip } from './CountChip';
import { GroupSessionRow } from './GroupSession';
import { Swatch } from './drawer/SessionsBodies';
import type { GroupMeta } from './groups';

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

/** The ⋯ menu at a card's top-right (trial): Collapse / Expand, Remove group, Customize cards. */
function CardMenu({ group, collapsed }: { group: GroupMeta; collapsed: boolean }) {
  const { state, setRail, toggleCollapsed, openCustomize } = useStore();
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
          {/* Any card can go, as in Customize, as long as one stays. */}
          {state.rail.order.length > 1 && (
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
          <button type="button" role="menuitem" onClick={run(() => openCustomize('brief'))} className={item}>
            Customize cards…
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
/** The collapse chevron (and the title's collapse click) is hidden for now, the code kept (the user's call). The ⋯ menu
 * still collapses and expands the card. */
const SHOW_COLLAPSE = false;

/** Rows a group card shows; the rest are one click away on View all. */
const CARD_ROWS = 4;

export function CategoryGroup({
  group,
  wide = false,
  narrow = false,
}: {
  group: GroupMeta;
  wide?: boolean;
  narrow?: boolean;
}) {
  const { state, openGroup, selectClient, selectSession, toggleCollapsed, reviewedNow } = useStore();
  // Cards follow the week selector: a past week shows that Monday's groups.
  const members = cardMembers(group.key, state.weekOffset, { todos: state.todos, reviewed: reviewedNow });
  const collapsed = state.rail.collapsed.includes(group.key);
  // Upcoming bookings lists sessions, not clients (the user's call, tried on the three-part layout first): its count is theirs.
  const sessions = group.key === 'upcoming_bookings' ? sessionsInWeek(state.weekOffset) : undefined;
  const today = weekAsOf(state.weekOffset);
  // The link names what it opens (option A, the user's pick): the header's count and its unit ("View all 10 clients",
  // sessions on Upcoming bookings); a card already showing everything just reads "View list".
  const total = sessions?.length ?? members.length;
  const unit = sessions ? 'session' : 'client';
  const viewAll = total > CARD_ROWS ? `View all ${total} ${unit}s` : 'View list';

  return (
    // In the two-column grid (past weeks) a collapsed card spans both columns as one slim bar, so it leaves no hole.
    <article className={`flex flex-col rounded-xl bg-white ${collapsed && !narrow ? 'col-span-2' : ''}`}>
      <header className={`flex flex-col gap-1.5 px-4 ${collapsed ? 'py-3' : 'pb-1 pt-4'}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={SHOW_COLLAPSE ? !collapsed : undefined}
            onClick={SHOW_COLLAPSE ? () => toggleCollapsed(group.key) : undefined}
            className={`flex min-w-0 flex-1 items-center gap-2 text-left ${SHOW_COLLAPSE ? '' : 'cursor-default'}`}
          >
            <GroupIcon group={group} />
            <h3 className="truncate text-[14px] font-bold leading-[1.5] text-ink">{group.title}</h3>
            <CountChip value={sessions?.length ?? members.length} />
            {SHOW_COLLAPSE && (
              <ChevronDown size={14} className={`shrink-0 text-ink-secondary transition-transform ${collapsed ? '-rotate-90' : ''}`} aria-hidden />
            )}
          </button>
          {collapsed && (
            <button
              type="button"
              onClick={() => openGroup(group.key)}
              className="shrink-0 text-[12px] font-semibold leading-normal text-ink-secondary hover:text-ink"
            >
              {/* No arrow here: the header already ends in the collapse chevron (the user's call). */}
              {viewAll}
            </button>
          )}
          <CardMenu group={group} collapsed={collapsed} />
        </div>
        {/* Half width, two-line descriptions keep the paired cards aligned; at full width each fits one line. */}
        {!collapsed && <p className={`${wide ? '' : 'min-h-[36px]'} text-[12px] leading-[1.5] text-ink-secondary`}>{group.description}</p>}
      </header>
      {!collapsed && (
        <>
          {/* At most CARD_ROWS rows and no scroll inside the card; View all opens the full list (the user's call). In
              the two-column grid the list keeps four rows' height (53 px each), so paired cards stay aligned. */}
          <ul className={`${narrow ? '' : 'min-h-[212px]'} px-3`}>
            {(sessions ?? members).length === 0 && (
              <li className="px-1 py-3 text-[13px] leading-[1.5] text-ink-muted">{sessions ? 'No sessions booked right now.' : 'No clients here right now.'}</li>
            )}
            {/* A session row: type colour · session name, then date and time · a 16 px avatar · client name on the line
                below. It opens the session's details panel (Figma 5940:151048), as a group session's row does; a group
                session shows its roster instead of one client (GroupSessionRow). */}
            {sessions?.slice(0, CARD_ROWS).map(({ client, booking, group: session }) => session ? (
              <li key={session.id}>
                <GroupSessionRow session={session} today={today} />
              </li>
            ) : (
              <li key={oneToOneId(client.id, booking)}>
                <button
                  type="button"
                  data-client-row
                  aria-current={state.selectedSessionId === oneToOneId(client.id, booking) ? 'true' : undefined}
                  onClick={() => selectSession(oneToOneId(client.id, booking))}
                  className={`flex w-full flex-col gap-1.5 border-b border-line/80 px-1 py-2.5 text-left hover:bg-surface-secondary/60 ${
                    state.selectedSessionId === oneToOneId(client.id, booking) ? 'bg-surface-secondary' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Swatch color={booking.type.color} />
                    <span className="truncate text-[14px] font-semibold leading-[1.5] text-ink">{booking.type.name}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 text-[12px] leading-[1.5]">
                    <span className="whitespace-nowrap text-ink-secondary tabular-nums">
                      {booking.date === today ? 'Today' : formatMonthDay(parseDay(booking.date))} • {timeSpan(booking)}
                    </span>
                    <img src={dotTiny} alt="" width={2} height={2} className="shrink-0" />
                    <Avatar name={client.name} src={client.avatar} size={16} />
                    <span className="truncate font-medium text-ink">{client.name}</span>
                  </span>
                </button>
              </li>
            ))}
            {!sessions && members.slice(0, CARD_ROWS).map((client) => (
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
            className="flex items-center gap-1 rounded-b-xl bg-white px-4 py-3 text-[12px] font-semibold leading-normal text-ink-secondary hover:text-ink"
          >
            {viewAll}
            <img src={chevronSmall} alt="" width={14} height={14} />
          </button>
        </>
      )}
    </article>
  );
}
