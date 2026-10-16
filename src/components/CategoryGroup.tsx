import chevronSmall from '../assets/figma/icon-chevron-right-small.svg';
import { groupsInWeek } from '../lib/week';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { CountChip } from './CountChip';
import type { GroupMeta } from './groups';

export function CategoryGroup({ group, wide = false }: { group: GroupMeta; wide?: boolean }) {
  const { state, openGroup, selectClient } = useStore();
  // Cards follow the week selector: a past week shows that Monday's groups.
  const members = groupsInWeek(state.weekOffset)[group.key];

  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white">
      <header className="flex flex-col gap-1.5 px-4 pb-1 pt-4">
        <div className="flex items-center gap-2">
          <span className="relative size-5 shrink-0 overflow-hidden" aria-hidden>
            <span className={`absolute ${group.iconInset}`}>
              <span className={`absolute ${group.iconBleed}`}>
                <img src={group.icon} alt="" className="block size-full max-w-none" />
              </span>
            </span>
          </span>
          <h3 className="text-[14px] font-bold leading-[1.5] text-ink">{group.title}</h3>
          <CountChip value={members.length} />
        </div>
        {/* Half width, two-line descriptions keep the paired cards aligned; at full width each fits one line. */}
        <p className={`${wide ? '' : 'min-h-[36px]'} text-[12px] leading-[1.5] text-ink-secondary`}>{group.description}</p>
      </header>
      <ul className="scroll-thin h-[210px] overflow-y-auto px-3">
        {members.map((client) => (
          <li key={client.id}>
            <button
              type="button"
              data-client-row
              aria-current={state.selectedClientId === client.id ? 'true' : undefined}
              onClick={() => selectClient(client.id)}
              className={`flex w-full items-center justify-between gap-2 border-b border-line/80 px-1 py-3 text-left hover:bg-surface-secondary/60 ${
                state.selectedClientId === client.id ? 'bg-surface-secondary' : ''
              }`}
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
        <img src={chevronSmall} alt="" width={14} height={14} />
      </button>
    </article>
  );
}
