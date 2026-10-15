import { CategoryGroup } from './CategoryGroup';
import { ClientHighlights } from './ClientHighlights';
import { GROUPS } from './groups';

export function RightRail() {
  return (
    <aside className="flex flex-col bg-surface-secondary">
      <div className="grid grid-cols-2 items-start gap-5 px-5 pt-5">
        {GROUPS.map((group) => (
          <CategoryGroup key={group.key} group={group} />
        ))}
      </div>
      <ClientHighlights />
    </aside>
  );
}
