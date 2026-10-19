import { useState } from 'react';
import anniversaryBadge from '../assets/figma/badge-anniversary.png';
import milestoneBadge from '../assets/figma/badge-milestone.svg';
import thumbsUp from '../assets/figma/emoji-thumbs-up.png';
import chatBubbles from '../assets/figma/icon-chat-bubbles.svg';
import closeStroke from '../assets/figma/icon-close-stroke.svg';
import confetti from '../assets/figma/icon-confetti.svg';
import iconPencilAi from '../assets/figma/icon-pencil-ai.svg';
import { highlights } from '../data/mock';
import type { Highlight, HighlightCategory } from '../data/types';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { CountChip } from './CountChip';
import { Tooltip } from './Tooltip';

type Tab = 'all' | HighlightCategory;

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'milestone', label: 'Milestones' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'anniversary', label: 'Anniversaries' },
];

/**
 * The list is as tall as 10 one-line highlights (10 × 55 px rows + 10 px top padding). More scroll inside it;
 * fewer leave white space below, so switching tabs never moves the layout.
 */
const LIST_HEIGHT = 10 * 55 + 10;


/** Milestones get the blue badge; birthdays and anniversaries share the orange one, as drawn. */
function CatchUpBadge({ category }: { category: HighlightCategory }) {
  if (category === 'milestone') {
    return (
      <span className="relative size-4 rounded-full">
        <span className="absolute inset-[-1.42%_-1.43%_-1.42%_-1.41%]">
          <img src={milestoneBadge} alt="" className="block size-full max-w-none" />
        </span>
      </span>
    );
  }
  return (
    <span className="relative size-4 overflow-hidden rounded-full">
      <img src={anniversaryBadge} alt="" className="absolute left-0 top-[-1.13px] block h-[17.985px] w-[16.003px] max-w-none" />
    </span>
  );
}

/** The 👍 reaction is hidden for now (the user's call; the brief puts reactions in Phase 2). */
const SHOW_REACTION = false;

const ACTION = 'group/tip relative flex size-8 items-center justify-center rounded-[10px] bg-white hover:bg-surface-secondary';

/**
 * The actions a highlight row shows on hover (Figma 5795:175100): React 👍 (hidden, `SHOW_REACTION`) · Draft with AI ·
 * Send message · Dismiss,
 * in a white bar over the row's right end. Draft with AI and Send message open the middle column at the right edge,
 * as from a client-list row; the draft is about the highlight (`highlightDraft`). `tipBelow`: the first row's
 * tooltips hang under the bar, since the list clips the space above it.
 */
function HighlightActions({ h, reacted, tipBelow, onReact, onDismiss }: { h: Highlight; reacted: boolean; tipBelow: boolean; onReact: () => void; onDismiss: () => void }) {
  const { openOlly, openInbox } = useStore();
  return (
    <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center rounded-lg bg-white p-1 drop-shadow-[0_4px_10px_rgba(0,0,0,0.06)] group-focus-within/row:flex group-hover/row:flex">
      {SHOW_REACTION && (
        <button type="button" aria-label={reacted ? 'Remove reaction' : 'React'} aria-pressed={reacted} onClick={onReact} className={`${ACTION} ${reacted ? 'bg-brand/10 hover:bg-brand/15' : ''}`}>
          <img src={thumbsUp} alt="" width={20} height={20} />
          <Tooltip label={reacted ? 'Remove reaction' : 'React'} below={tipBelow} />
        </button>
      )}
      {/* The AI button clips its own light sweep, so its tooltip hangs off a wrapper. */}
      <span className="group/tip relative">
        <button
          type="button"
          aria-label="Draft with AI"
          onClick={() => openOlly(h.clientId, { mode: 'draft', highlightId: h.id })}
          className="ai-btn flex size-8 items-center justify-center rounded-lg bg-white"
        >
          <img src={iconPencilAi} alt="" width={18} height={18} />
        </button>
        <Tooltip label="Draft with AI" below={tipBelow} />
      </span>
      <button type="button" aria-label="Send message" onClick={() => openInbox(h.clientId)} className={ACTION}>
        <span className="relative size-[18px]">
          <span className="absolute inset-[14.59%_12.54%_10.42%_12.46%]">
            <span className="absolute inset-[-4.82%_-4.82%_-4.81%_-4.82%]">
              <img src={chatBubbles} alt="" className="block size-full max-w-none" />
            </span>
          </span>
        </span>
        <Tooltip label="Send message" below={tipBelow} />
      </button>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className={ACTION}>
        <img src={closeStroke} alt="" width={18} height={18} />
        <Tooltip label="Dismiss" below={tipBelow} />
      </button>
    </div>
  );
}

/** The v1 Catch-up tab, moved into the right rail. `narrow` (a third of the page): the tabs sit in a row above the list. */
export function ClientHighlights({ narrow = false }: { narrow?: boolean }) {
  const { showToast } = useStore();
  const [tab, setTab] = useState<Tab>('all');
  // Session only: a dismissed highlight leaves the list (and its counts); a reaction marks the 👍.
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [reacted, setReacted] = useState<string[]>([]);
  const shown = highlights.filter((h) => !dismissed.includes(h.id));
  const items = tab === 'all' ? shown : shown.filter((h) => h.category === tab);
  const countFor = (t: Tab) => (t === 'all' ? shown.length : shown.filter((h) => h.category === t).length);

  return (
    <section className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 pt-3">
        <img src={confetti} alt="" width={20} height={20} />
        <h3 className="text-[14px] font-bold leading-[1.5] text-ink">Client highlights</h3>
        <CountChip value={shown.length} />
      </div>
      <div className={`flex ${narrow ? 'flex-col' : 'items-start'} gap-2.5 rounded-lg bg-white px-2.5 pb-2.5 pt-2`}>
        <div
          role="tablist"
          aria-orientation={narrow ? 'horizontal' : 'vertical'}
          className={narrow ? 'scroll-none flex gap-1 overflow-x-auto pt-1' : 'flex w-[191px] shrink-0 flex-col gap-1 pt-2.5'}
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] p-2 text-left text-[13px] font-semibold ${
                  active ? 'bg-brand/[0.08] text-brand' : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
                }`}
              >
                {t.label} ({countFor(t.key)})
              </button>
            );
          })}
        </div>
        {/* Stacked under the tabs (narrow), flex-1 would let the list grow to every row, so it keeps a fixed height. */}
        <ul className={`scroll-thin flex min-w-0 flex-col overflow-y-auto pt-2.5 ${narrow ? 'shrink-0' : 'flex-1'}`} style={{ height: LIST_HEIGHT }}>
          {items.map((h, i) => (
            <li
              key={h.id}
              className={`group/row relative flex min-h-[55px] shrink-0 items-center gap-4 pb-3 pl-3 pr-2 pt-2.5 hover:bg-surface-secondary ${
                i < items.length - 1 ? 'border-b border-line' : ''
              }`}
            >
              <span className="flex shrink-0 items-end">
                <span className="-mr-4">
                  <Avatar name={h.clientName} src={h.image} size={32} />
                </span>
                <CatchUpBadge category={h.category} />
              </span>
              <p className="min-w-0 flex-1 text-[13px] leading-[1.5] text-ink">
                <span className="font-semibold">{h.clientName}</span> {h.text}
              </p>
              <HighlightActions
                h={h}
                reacted={reacted.includes(h.id)}
                tipBelow={i === 0}
                onReact={() => {
                  const on = !reacted.includes(h.id);
                  setReacted((r) => (on ? [...r, h.id] : r.filter((id) => id !== h.id)));
                  if (on) showToast(`Reaction sent to ${h.clientName.split(' ')[0]}`);
                }}
                onDismiss={() => {
                  setDismissed((d) => [...d, h.id]);
                  showToast('Highlight dismissed');
                }}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
