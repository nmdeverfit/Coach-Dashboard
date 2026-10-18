import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../state/store';
import { CategoryGroup } from './CategoryGroup';
import { ClientHighlights } from './ClientHighlights';
import { ALL_GROUPS } from './groups';
import { RailCustomizer } from './RailCustomizer';

/**
 * `wide`: a past week, where the rail takes the full width and every card description fits on one line.
 * `narrow`: the three-part layout test, where the rail is a third of the page: the group cards stack in one column
 * and Client highlights put their category tabs in a row above the list.
 * The cards follow the coach's layout (`state.rail`); Customize (above the cards, or a card's ⋯ menu) edits it.
 */
export function RightRail({ wide = false, narrow = false }: { wide?: boolean; narrow?: boolean }) {
  const { state } = useStore();
  const [customizing, setCustomizing] = useState(false);
  const open = () => setCustomizing(true);

  return (
    <aside className="flex min-w-0 flex-col bg-surface-secondary">
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-[13px] font-semibold uppercase leading-[1.5] tracking-[0.2px] text-ink-muted">Client groups</h2>
        {!customizing && (
          <button type="button" onClick={open} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-semibold text-ink-secondary hover:bg-white hover:text-ink">
            <SlidersHorizontal size={14} aria-hidden />
            Customize
          </button>
        )}
      </div>
      <div className="px-5 pt-2">
        {customizing ? (
          <RailCustomizer onClose={() => setCustomizing(false)} />
        ) : (
          <div className={`grid ${narrow ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-5'} items-start`}>
            {state.rail.order.map((key) => (
              <CategoryGroup key={key} group={ALL_GROUPS[key]} wide={wide || narrow} narrow={narrow} onCustomize={open} />
            ))}
          </div>
        )}
      </div>
      <ClientHighlights narrow={narrow} />
    </aside>
  );
}
