import { X } from 'lucide-react';
import { clients } from '../data/mock';
import { groupClients, useStore } from '../state/store';
import { Avatar } from './Avatar';
import { GROUPS } from './groups';
import { StatusChip } from './StatusChip';

/**
 * Placeholder for the client-list view (metric row, AI assessment column, vertical detail expand).
 * It already honours group-card click-through so "View all" lands on a filtered list.
 */
export function DashboardView() {
  const { state, openGroup } = useStore();
  const group = GROUPS.find((g) => g.key === state.dashboardFilter);
  const rows = group ? groupClients[group.key] : clients;

  return (
    <div className="flex min-h-full flex-col gap-4 bg-surface-secondary p-5">
      <div className="rounded-xl border border-dashed border-line-light bg-white px-5 py-4 text-[13px] leading-[1.5] text-ink-secondary">
        <span className="font-semibold text-ink">Dashboard view is next.</span> The seven-card metric row, the AI assessment column and the
        client detail expand will be built from its Figma frame. For now this list shows who each group card opens.
      </div>
      <div className="flex items-center gap-2">
        {group ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-[12px] font-semibold text-white">
            {group.title} ({rows.length})
            <button type="button" aria-label="Clear filter" onClick={() => openGroup(null)} className="rounded-full hover:bg-white/20">
              <X size={14} />
            </button>
          </span>
        ) : (
          GROUPS.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => openGroup(g.key)}
              className="rounded-full border border-line-light bg-white px-3 py-1 text-[12px] font-semibold text-ink-tertiary hover:text-ink"
            >
              {g.title} ({groupClients[g.key].length})
            </button>
          ))
        )}
      </div>
      <div className="overflow-hidden rounded-xl bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-line text-[12px] font-semibold text-ink-secondary">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Client</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold">Program ends</th>
              <th className="px-4 py-2.5 font-semibold">Next session</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <Avatar name={c.name} src={c.avatar} />
                    {c.name}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <StatusChip status={c.status} />
                </td>
                <td className="px-4 py-2.5 text-ink-tertiary tabular-nums">
                  {c.programEndsInDays !== undefined ? `In ${c.programEndsInDays} day${c.programEndsInDays === 1 ? '' : 's'}` : '—'}
                </td>
                <td className="px-4 py-2.5 text-ink-tertiary">{c.nextSession ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
