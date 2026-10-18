import { CategoryGroup } from './CategoryGroup';
import { ClientHighlights } from './ClientHighlights';
import { GROUPS } from './groups';

/**
 * `wide`: a past week, where the rail takes the full width and every card description fits on one line.
 * `narrow`: the three-part layout test, where the rail is a third of the page: the group cards stack in one column
 * and Client highlights put their category tabs in a row above the list.
 */
export function RightRail({ wide = false, narrow = false }: { wide?: boolean; narrow?: boolean }) {
  return (
    <aside className="flex min-w-0 flex-col bg-surface-secondary">
      <div className={`grid ${narrow ? 'grid-cols-1 gap-4' : 'grid-cols-2 gap-5'} items-start px-5 pt-5`}>
        {GROUPS.map((group) => (
          <CategoryGroup key={group.key} group={group} wide={wide || narrow} />
        ))}
      </div>
      <ClientHighlights narrow={narrow} />
    </aside>
  );
}
