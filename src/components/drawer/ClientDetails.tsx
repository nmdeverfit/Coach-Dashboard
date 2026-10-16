import { useCallback } from 'react';
import iconClose from '../../assets/figma/icon-close.svg';
import iconMarkDoneChecked from '../../assets/figma/icon-markdone-checked.svg';
import iconMarkDone from '../../assets/figma/icon-markdone.svg';
import iconMessage from '../../assets/figma/icon-message-dots.svg';
import iconMore from '../../assets/figma/icon-more.svg';
import iconPencilAi from '../../assets/figma/icon-pencil-ai.svg';
import { DEMO_TODAY } from '../../data/mock';
import { getProfile } from '../../data/profiles';
import type { Client } from '../../data/types';
import { buildClientAssessment } from '../../lib/client';
import { formatDayMonth, parseDay } from '../../lib/dates';
import { getClient, useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { StatusChip } from '../StatusChip';
import { Tooltip } from '../Tooltip';
import { AiAssessment } from './AiAssessment';
import { ClientTabs } from './ClientTabs';
import { DrawerAside, useCloseOnOutside, useDrawerPresence } from './DrawerShell';
import { StatusFeedback } from './StatusFeedback';

const ICON_BASE = 'group/tip relative flex size-8 items-center justify-center rounded-md border border-black/15';
const ICON_BUTTON = `${ICON_BASE} bg-white hover:bg-surface-secondary`;

/** Avatar, name, status and the four quick actions of the client detail page (Figma 5671:141948). */
function ClientTitle({ client }: { client: Client }) {
  const { state, showToast, reviewClient } = useStore();
  const reviewed = Boolean(state.reviewed[client.id]);
  return (
    <div className="flex items-center gap-4 px-[30px] py-5">
      <Avatar name={client.name} src={client.avatar} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="truncate text-[18px] font-bold leading-[1.5] text-ink">{client.name}</h2>
        <p className="flex items-center gap-1 text-[13px] leading-normal text-ink-tertiary">
          Status: <StatusChip status={client.status} />
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {/* The AI button clips its own light sweep, so its tooltip hangs off a wrapper. */}
        <span className="group/tip relative">
          <button
            type="button"
            aria-label="Draft with AI"
            onClick={() => showToast(`Draft with AI opens beside this panel with a message for ${client.firstName}`)}
            className="ai-btn flex size-8 items-center justify-center rounded-[4px] border border-black/15 bg-white shadow-[inset_0_0_8px_rgba(222,172,231,0.6)]"
          >
            <img src={iconPencilAi} alt="" width={20} height={20} />
          </button>
          <Tooltip label="Draft with AI" />
        </span>
        <button type="button" aria-label="Send message" onClick={() => showToast('The message composer opens beside this panel, empty')} className={ICON_BUTTON}>
          <img src={iconMessage} alt="" width={16.2} height={16.2} />
          <Tooltip label="Send message" />
        </button>
        <button
          type="button"
          aria-label={reviewed ? 'Reviewed' : 'Mark as reviewed'}
          disabled={reviewed}
          onClick={() => reviewClient(client.id)}
          className={reviewed ? `${ICON_BASE} cursor-default bg-checked` : ICON_BUTTON}
        >
          <span className="relative size-4">
            <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
              <img src={reviewed ? iconMarkDoneChecked : iconMarkDone} alt="" className="block size-full max-w-none" />
            </span>
          </span>
          <Tooltip label={reviewed ? 'Reviewed this week' : 'Mark as reviewed'} />
        </button>
        <button type="button" aria-label="More" onClick={() => showToast('More client actions (pause, archive…) open here')} className={ICON_BUTTON}>
          <img src={iconMore} alt="" width={16} height={16} />
          <Tooltip label="More" />
        </button>
      </div>
    </div>
  );
}

/**
 * The client detail page in the panel's slot: the Check-in panel's layout with a CLIENT DETAILS title and no
 * footer. Opened from a group card, or from a to-do panel's name link (then ‹ returns to the to-do, AC1.11).
 */
export function ClientDetailsPanel({ client, onClose, onBack }: { client: Client; onClose: () => void; onBack?: () => void }) {
  const { showToast } = useStore();
  const profile = getProfile(client.id);
  const assessment = buildClientAssessment(client, profile, DEMO_TODAY);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5 pb-2.5 pt-[15px]">
        {onBack ? (
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-[13px] font-semibold leading-[1.5] text-ink-secondary hover:text-ink">
            <span aria-hidden className="text-[16px] leading-none">
              ‹
            </span>
            CLIENT DETAILS
          </button>
        ) : (
          <p className="text-[13px] font-semibold leading-[1.5] text-ink-secondary">CLIENT DETAILS</p>
        )}
        <button type="button" aria-label="Close client details" onClick={onClose} className="relative size-5 overflow-hidden rounded hover:opacity-70">
          <img src={iconClose} alt="" className="absolute left-1/2 top-1/2 size-6 max-w-none -translate-x-1/2 -translate-y-1/2" />
        </button>
      </header>
      <div key={client.id} className="flex-1 overflow-y-auto">
        <ClientTitle client={client} />
        <div className="flex flex-col gap-2 px-[30px] pb-[30px]">
          <AiAssessment
            assessment={assessment}
            onTellMeMore={() =>
              showToast(`Olly BI opens beside this panel: “Tell me more about ${client.firstName}’s status on ${formatDayMonth(parseDay(DEMO_TODAY))}”`)
            }
          />
          <StatusFeedback client={client} />
        </div>
        <ClientTabs client={client} profile={profile} />
      </div>
    </div>
  );
}

/** The client detail panel opened from a group card in the right rail. */
export function ClientDrawer() {
  const { state, selectClient } = useStore();
  const { shown, closing } = useDrawerPresence(state.selectedClientId);
  const close = useCallback(() => selectClient(null), [selectClient]);
  useCloseOnOutside(Boolean(state.selectedClientId), close);
  if (!shown) return null;
  return (
    <DrawerAside label="Client details" closing={closing}>
      <ClientDetailsPanel client={getClient(shown)} onClose={close} />
    </DrawerAside>
  );
}
