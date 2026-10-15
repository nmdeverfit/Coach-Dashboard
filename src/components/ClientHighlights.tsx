import { PartyPopper } from 'lucide-react';
import { useState } from 'react';
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

const countFor = (tab: Tab) => (tab === 'all' ? highlights.length : highlights.filter((h) => h.category === tab).length);

/** The v1 Catch-up tab, moved into the right rail. */
export function ClientHighlights() {
  const [tab, setTab] = useState<Tab>('all');
  const items = tab === 'all' ? highlights : highlights.filter((h) => h.category === tab);

  return (
    <section className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 pt-3">
        <PartyPopper size={20} className="text-ink-tertiary" />
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
        <ul className="flex min-w-0 flex-1 flex-col pt-2.5">
          {items.map((h, i) => (
            <li
              key={h.id}
              className={`flex min-h-[55px] items-center gap-4 px-3 pb-3 pt-2.5 ${i < items.length - 1 ? 'border-b border-line' : ''}`}
            >
              {h.image ? (
                <img src={h.image} alt="" width={32} height={32} className="shrink-0" />
              ) : (
                <Avatar name={h.clientName} size={32} />
              )}
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
