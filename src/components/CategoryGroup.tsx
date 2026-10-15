import { ChevronRight } from 'lucide-react';
import { groupClients, useStore } from '../state/store';
import { Avatar } from './Avatar';
import { CountChip } from './CountChip';
import type { GroupMeta } from './groups';

export function CategoryGroup({ group }: { group: GroupMeta }) {
  const { openGroup } = useStore();
  const members = groupClients[group.key];
  const Icon = group.icon;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white">
      <header className="flex flex-col gap-1.5 px-4 pb-1 pt-4">
        <div className="flex items-center gap-2">
          <Icon size={20} className={group.iconClass} strokeWidth={2} />
          <h3 className="text-[14px] font-bold leading-[1.5] text-ink">{group.title}</h3>
          <CountChip value={members.length} />
        </div>
        <p className="min-h-[36px] text-[12px] leading-[1.5] text-ink-secondary">{group.description}</p>
      </header>
      <ul className="scroll-thin h-[210px] overflow-y-auto px-3">
        {members.map((client) => (
          <li key={client.id}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 border-b border-line/80 px-1 py-3 text-left hover:bg-surface-secondary/60"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Avatar name={client.name} src={client.avatar} />
                <span className="truncate text-[13px] font-semibold leading-[1.5] text-ink">{client.name}</span>
              </span>
              {group.suffix && (
                <span className="whitespace-nowrap text-[12px] text-ink-secondary tabular-nums">{group.suffix(client)}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => openGroup(group.key)}
        className="relative flex items-center gap-1 bg-white px-4 py-3 text-[12px] font-semibold leading-normal text-ink-secondary shadow-see-all hover:text-ink"
      >
        View all
        <ChevronRight size={14} />
      </button>
    </article>
  );
}
