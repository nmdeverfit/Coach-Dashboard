import { CategoryGroup } from './CategoryGroup';
import { ClientHighlights } from './ClientHighlights';
import { GROUPS } from './groups';

/** `wide`: a past week, where the rail takes the full width and every card description fits on one line. */
export function RightRail({ wide = false }: { wide?: boolean }) {
  return (
    <aside className="flex flex-col bg-surface-secondary">
      <div className="grid grid-cols-2 items-start gap-5 px-5 pt-5">
        {GROUPS.map((group) => (
          <CategoryGroup key={group.key} group={group} wide={wide} />
        ))}
      </div>
      <ClientHighlights />
    </aside>
  );
}
