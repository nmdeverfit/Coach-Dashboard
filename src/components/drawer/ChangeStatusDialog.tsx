import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Client, ClientStatus } from '../../data/types';
import { useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { Modal } from '../Modal';
import { STATUS_LABEL } from '../StatusChip';

export const STATUS_DOT: Record<ClientStatus, string> = {
  at_risk: 'bg-status-risk-dot',
  needs_attention: 'bg-status-attention-dot',
  on_track: 'bg-status-track-dot',
  no_activities: 'bg-ink-muted',
};

/** No activities is deterministic (every source empty), so a coach can only move between the three classified ones. */
const CHOICES: ClientStatus[] = ['at_risk', 'needs_attention', 'on_track'];

const Dot = ({ status }: { status: ClientStatus }) => <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} />;

/** The New status select (Figma 5829:551995): 40 px box, brand border while open, a 4 px-rounded menu under it. */
function StatusSelect({ options, value, onChange }: { options: ClientStatus[]; value: ClientStatus | null; onChange: (s: ClientStatus) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Escape' && open && (e.stopPropagation(), setOpen(false))}
        className={`flex h-10 w-full items-center justify-between rounded-[5px] border bg-[#fafbfc] pl-2.5 pr-1.5 text-left text-[13px] text-black ${
          open ? 'border-brand' : 'border-line-light hover:border-ink-muted'
        }`}
      >
        {value ? (
          <span className="flex items-center gap-1.5">
            <Dot status={value} />
            {STATUS_LABEL[value]}
          </span>
        ) : (
          <span className="opacity-60">Choose new status</span>
        )}
        <span className="flex size-6 items-center justify-center">
          <ChevronDown size={16} className={`text-ink-secondary transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      {open && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-[4px] border border-[#dadfea] bg-white">
          {options.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="option"
                aria-selected={value === s}
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={`group flex w-full items-center gap-1.5 px-3 py-2.5 text-left text-[12px] leading-[1.5] hover:bg-surface-secondary hover:font-semibold hover:text-brand ${
                  value === s ? 'font-semibold text-brand' : 'text-black'
                }`}
              >
                <Dot status={s} />
                {STATUS_LABEL[s]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Change Client Status (Figma 5829:551881 / 551995 / 552126), opened by Not quite under the AI assessment. The new
 * status is required, the reason optional; Update Status sets it as the client's status for this week everywhere.
 */
export function ChangeStatusDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const { changeStatus } = useStore();
  const [to, setTo] = useState<ClientStatus | null>(null);
  const [reason, setReason] = useState('');

  const submit = () => {
    if (!to) return;
    changeStatus(client.id, to, reason);
    onClose();
  };

  return (
    <Modal
      title="Change Client Status"
      width={480}
      headerBorder={false}
      footerBorder={false}
      onClose={onClose}
      subtitle={
        <span className="flex items-center gap-2 text-[12px] leading-4 tracking-[0.12px] text-[#1a1a1a]">
          <Avatar name={client.name} src={client.avatar} size={20} />
          {client.name}
        </span>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-[30px] w-[66px] rounded-[6px] border border-[#e0e0e0] bg-white text-[13px] font-semibold leading-[1.5] text-[#4d4d4d] hover:bg-surface-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!to}
            onClick={submit}
            className="h-[30px] rounded-[6px] bg-brand px-4 text-[13px] font-semibold leading-[1.5] text-white hover:bg-brand/90 disabled:bg-[#eeedec] disabled:text-ink-muted"
          >
            Update Status
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 px-[30px] pb-4 pt-2 text-[12px] font-semibold leading-[18px] text-[#1a1a1a]">
        <div className="flex items-center gap-2">
          Current status:
          <span className="flex items-center gap-1.5 rounded-[4px] border border-line-light bg-white px-2 py-0.5">
            <Dot status={client.status} />
            {STATUS_LABEL[client.status]}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          New status
          <StatusSelect options={CHOICES.filter((s) => s !== client.status)} value={to} onChange={setTo} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            Reason
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why you're changing this client's status..."
              className="h-[108px] resize-none rounded-lg border border-[#e0e0e0] px-3 py-2.5 text-[14px] font-normal leading-[22px] text-[#1a1a1a] outline-none placeholder:text-[#8c8c8c] focus:border-brand"
            />
          </label>
          <p className="text-[12px] font-normal leading-[1.5] tracking-[0.12px] text-ink-tertiary">
            Note: Status can only be changed for the current week. Past weeks are read-only to preserve historical accuracy.
          </p>
        </div>
      </div>
    </Modal>
  );
}
