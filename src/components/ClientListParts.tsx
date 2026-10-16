import { useEffect, useRef, type HTMLAttributes } from 'react';
import iconExpand from '../assets/figma/icon-row-expanded.svg';
import type { Client, ClientStatus } from '../data/types';
import { Avatar } from './Avatar';

/** Pieces shared by the client list's tables (Need Review / Review Completed and the Booking tab). */

export const HEAD = 'text-[13px] font-semibold leading-[1.5] text-ink/50';

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DOT: Record<ClientStatus, string> = {
  at_risk: 'bg-status-risk-dot',
  needs_attention: 'bg-status-attention-dot',
  on_track: 'bg-status-track-dot',
  no_activities: 'bg-ink-muted',
};

/** A client row: the whole row opens the client detail drawer (click, Enter or Space). */
export function rowProps(client: Client, selected: boolean, open: (id: string) => void): HTMLAttributes<HTMLDivElement> & { 'data-client-row': true } {
  return {
    role: 'button',
    tabIndex: 0,
    'data-client-row': true,
    'aria-current': selected ? 'true' : undefined,
    onClick: () => open(client.id),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(client.id);
      }
    },
    className: `flex cursor-pointer items-center border-b border-line outline-none focus-visible:bg-surface-secondary ${
      selected ? 'bg-surface-secondary' : 'hover:bg-elevated'
    }`,
  };
}

/** Status dot, 40 px avatar, name, and "Program ends Nd" when the program ends within the week. */
export function ClientCell({ client, className }: { client: Client; className: string }) {
  const ends = client.programEndsInDays;
  return (
    <div className={`${className} flex items-center gap-3 p-3`}>
      <span className={`size-2 shrink-0 rounded-full ${DOT[client.status]}`} />
      <Avatar name={client.name} src={client.avatar} size={40} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[14px] font-bold leading-[1.5] text-ink">{client.name}</span>
        {ends !== undefined && ends >= 0 && (
          <span className="text-[12px] font-semibold leading-[1.5] text-ink-secondary">{ends === 0 ? 'Program ends today' : `Program ends ${ends}d`}</span>
        )}
      </span>
    </div>
  );
}

/** 48 px section header with a chevron and a count chip that bumps when the count changes. */
export function SectionHeader({ title, count, open, onToggle }: { title: string; count: number; open: boolean; onToggle: () => void }) {
  const chip = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!reducedMotion()) chip.current?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
  }, [count]);
  return (
    <button type="button" aria-expanded={open} onClick={onToggle} className="flex h-12 w-full items-center gap-2 rounded-lg bg-surface-secondary p-3 text-left">
      <img src={iconExpand} alt="" width={16} height={16} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      <span className="text-[16px] font-semibold leading-[1.5] text-ink">{title}</span>
      <span
        ref={chip}
        className="min-w-[19px] rounded-[4px] border border-line-chip bg-white px-[3px] py-0.5 text-center text-[11px] font-semibold leading-normal text-ink/80 tabular-nums"
      >
        {count}
      </span>
    </button>
  );
}
