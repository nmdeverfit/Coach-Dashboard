import type { ClientStatus } from '../data/types';

const STYLES: Record<ClientStatus, { label: string; className: string }> = {
  at_risk: { label: 'At risk', className: 'bg-danger/10 text-danger' },
  needs_attention: { label: 'Needs attention', className: 'bg-orange/10 text-orange' },
  on_track: { label: 'On track', className: 'bg-emerald-500/10 text-emerald-700' },
  no_activities: { label: 'No activities', className: 'bg-ink-muted/15 text-ink-tertiary' },
};

export function StatusChip({ status }: { status: ClientStatus }) {
  const { label, className } = STYLES[status];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold ${className}`}>{label}</span>;
}
