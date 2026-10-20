import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dotTiny from '../assets/figma/dot-tiny.svg';
import { findPerson } from '../data/mock';
import type { GroupSession } from '../data/sessions';
import type { Client } from '../data/types';
import { formatMonthDay, parseDay } from '../lib/dates';
import { timeSpan } from '../lib/todos';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { Swatch } from './drawer/SessionsBodies';

/** The session's people, in roster order. Every id is a dashboard client. */
export const peopleIn = (ids: string[]) => ids.map(findPerson).filter((c): c is Client => Boolean(c));

const POPOVER_W = 240;
const POPOVER_MAX_H = 264;

/**
 * "17 clients": a link button that shows the session's full roster on hover or focus. The list is drawn into <body>
 * at a fixed position, since the card's list scrolls and would clip it, and it stays while the pointer moves onto it
 * (to scroll a long roster).
 */
function RosterLink({ people }: { people: Client[] }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<number>();
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);

  const show = () => {
    window.clearTimeout(hideTimer.current);
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - POPOVER_W - 8));
    // Below the link when the roster fits there, otherwise above it.
    setPos(window.innerHeight - r.bottom > POPOVER_MAX_H + 16 ? { left, top: r.bottom + 6 } : { left, bottom: window.innerHeight - r.top + 6 });
  };
  const hide = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setPos(null), 120);
  };
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  return (
    <>
      <span
        ref={anchor}
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="shrink-0 whitespace-nowrap font-semibold text-brand hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {people.length} clients
      </span>
      {pos &&
        createPortal(
          <div
            data-keep-open
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: POPOVER_W }}
            className="fixed z-[60] flex flex-col rounded-lg border border-line bg-white py-2 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
          >
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase leading-[1.5] tracking-[0.4px] text-ink-secondary">
              Enrolled · {people.length}
            </p>
            <ul className="scroll-thin overflow-y-auto px-1.5" style={{ maxHeight: POPOVER_MAX_H - 40 }}>
              {people.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-md px-1.5 py-1">
                  <Avatar name={c.name} src={c.avatar} size={20} />
                  <span className="truncate text-[13px] leading-[1.5] text-ink">{c.name}</span>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * A group session on the Upcoming bookings card: the 1:1 row's shape, except line 2 ends in a stack of the first three
 * clients' avatars and the roster link instead of one client. A click opens the session's details panel.
 */
export function GroupSessionRow({ session, today }: { session: GroupSession; today: string }) {
  const { state, selectSession } = useStore();
  const people = peopleIn(session.enrolled);
  const open = () => selectSession(session.id);
  const current = state.selectedSessionId === session.id;

  return (
    <div
      role="button"
      tabIndex={0}
      data-client-row
      aria-current={current ? 'true' : undefined}
      onClick={open}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), open())}
      className={`flex w-full cursor-pointer flex-col gap-1.5 border-b border-line/80 px-1 py-2.5 text-left hover:bg-surface-secondary/60 ${
        current ? 'bg-surface-secondary' : ''
      }`}
    >
      <span className="flex items-center gap-2">
        <Swatch color={session.type.color} />
        <span className="truncate text-[14px] font-semibold leading-[1.5] text-ink">{session.type.name}</span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5 text-[12px] leading-[1.5]">
        <span className="whitespace-nowrap text-ink-secondary tabular-nums">
          {session.date === today ? 'Today' : formatMonthDay(parseDay(session.date))} • {timeSpan(session)}
        </span>
        <img src={dotTiny} alt="" width={2} height={2} className="shrink-0" />
        <span className="flex shrink-0 items-center">
          {people.slice(0, 3).map((c, i) => (
            <span key={c.id} className={`rounded-full ring-1 ring-white ${i ? '-ml-1' : ''}`}>
              <Avatar name={c.name} src={c.avatar} size={16} />
            </span>
          ))}
        </span>
        <RosterLink people={people} />
      </span>
    </div>
  );
}
