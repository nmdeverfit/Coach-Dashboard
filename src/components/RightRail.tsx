import { sideIsSidebar, useStore } from '../state/store';
import { CategoryGroup } from './CategoryGroup';
import { ClientHighlights } from './ClientHighlights';
import { ALL_GROUPS } from './groups';

/**
 * `wide`: a past week, where the rail takes the full width and every card description fits on one line.
 * `narrow`: the three-part layout test, where the rail is a third of the page: the group cards stack in one column
 * and Client highlights put their category tabs in a row above the list. The highlights' sidebar (`sideIsSidebar`)
 * does the same on the two-column brief.
 * The cards follow the coach's layout (`state.rail`), set in Customize cards (a card's ⋯ menu or Dashboard Settings).
 */
export function RightRail({ wide = false, narrow = false }: { wide?: boolean; narrow?: boolean }) {
  const { state } = useStore();
  // With the highlights' sidebar open the rail is too narrow for the 2 × 2 grid, so the cards stack in one column
  // (the user's call), as in the three-part layout.
  const stacked = narrow || (!wide && sideIsSidebar(state));

  return (
    <aside className="flex min-w-0 flex-col bg-surface-secondary">
      {/* The "Client groups · Customize" row above the cards is set aside for now (the user's call). */}
      <div className="px-5 pt-5">
        <div className={stacked ? 'flex flex-col gap-4' : 'grid grid-cols-2 items-start gap-5'}>
          {state.rail.order.map((key) => (
            <CategoryGroup key={key} group={ALL_GROUPS[key]} wide={wide || stacked} narrow={stacked} />
          ))}
        </div>
      </div>
      <ClientHighlights narrow={narrow} />
    </aside>
  );
}
