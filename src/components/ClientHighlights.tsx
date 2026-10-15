import { useState } from 'react';
import anniversaryBadge from '../assets/figma/badge-anniversary.png';
import milestoneBadge from '../assets/figma/badge-milestone.svg';
import confetti from '../assets/figma/icon-confetti.svg';
import { highlights } from '../data/mock';
import type { HighlightCategory } from '../data/types';
import { Avatar } from './Avatar';
import { CountChip } from './CountChip';

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

const countFor = (tab: Tab) => (tab === 'all' ? highlights.length : highlights.filter((h) => h.category === tab).length);

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

/** The v1 Catch-up tab, moved into the right rail. */
export function ClientHighlights() {
  const [tab, setTab] = useState<Tab>('all');
  const items = tab === 'all' ? highlights : highlights.filter((h) => h.category === tab);

  return (
    <section className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 pt-3">
        <img src={confetti} alt="" width={20} height={20} />
        <h3 className="text-[14px] font-bold leading-[1.5] text-ink">Client highlights</h3>
        <CountChip value={highlights.length} />
      </div>
      <div className="flex items-start gap-2.5 rounded-lg bg-white px-2.5 pb-2.5 pt-2">
        <div role="tablist" aria-orientation="vertical" className="flex w-[191px] shrink-0 flex-col gap-1 pt-2.5">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1 rounded-[4px] p-2 text-left text-[13px] font-semibold ${
                  active ? 'bg-brand/[0.08] text-brand' : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
                }`}
              >
                {t.label} ({countFor(t.key)})
              </button>
            );
          })}
        </div>
        <ul className="scroll-thin flex min-w-0 flex-1 flex-col overflow-y-auto pt-2.5" style={{ height: LIST_HEIGHT }}>
          {items.map((h, i) => (
            <li
              key={h.id}
              className={`flex min-h-[55px] shrink-0 items-center gap-4 px-3 pb-3 pt-2.5 ${i < items.length - 1 ? 'border-b border-line' : ''}`}
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
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
