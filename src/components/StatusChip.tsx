import type { ClientStatus } from '../data/types';

export const STATUS_LABEL: Record<ClientStatus, string> = {
  at_risk: 'At risk',
  needs_attention: 'Needs attention',
  on_track: 'On track',
  no_activities: 'No activities',
};

const STYLES: Record<ClientStatus, string> = {
  at_risk: 'bg-status-risk-bg text-status-risk-fg',
  needs_attention: 'bg-status-attention-bg text-status-attention-fg',
  on_track: 'bg-status-track-bg text-status-track-fg',
  no_activities: 'bg-status-none-bg text-status-none-fg',
};

/** "Status label" pill from the design (drawn for At risk; the other three follow the same shape). */
export function StatusChip({ status }: { status: ClientStatus }) {
  return (
    <span className={`inline-flex h-[21px] items-center whitespace-nowrap rounded-full px-2 text-[12px] font-semibold leading-[15px] ${STYLES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
