import { useCallback } from 'react';
import iconClose from '../../assets/figma/icon-close.svg';
import { DEMO_TODAY } from '../../data/mock';
import { getProfile } from '../../data/profiles';
import type { Client } from '../../data/types';
import { buildClientAssessment } from '../../lib/client';
import { getClient, useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { ClientActions } from '../ClientActions';
import { StatusChip } from '../StatusChip';
import { AiAssessment } from './AiAssessment';
import { ClientTabs, type ClientTabKey } from './ClientTabs';
import { DrawerAside, useCloseOnOutside, useDrawerPresence } from './DrawerShell';
import { StatusFeedback } from './StatusFeedback';

/** Avatar, name, status and the four quick actions of the client detail page (Figma 5671:141948). */
function ClientTitle({ client }: { client: Client }) {
  return (
    <div className="flex items-center gap-4 px-[30px] py-5">
      <Avatar name={client.name} src={client.avatar} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="truncate text-[18px] font-bold leading-[1.5] text-ink">{client.name}</h2>
        <p className="flex items-center gap-1 text-[13px] leading-normal text-ink-tertiary">
          Status: <StatusChip status={client.status} />
        </p>
      </div>
      <ClientActions client={client} where="panel" />
    </div>
  );
}

/**
 * The client detail page in the panel's slot: the Check-in panel's layout with a CLIENT DETAILS title and no
 * footer. Opened from a group card, or from a to-do panel's name link (then ‹ returns to the to-do, AC1.11).
 */
export function ClientDetailsPanel({
  client,
  onClose,
  onBack,
  initialTab,
}: {
  client: Client;
  onClose: () => void;
  onBack?: () => void;
  initialTab?: ClientTabKey | null;
}) {
  const { openOlly } = useStore();
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
          client={client}
            assessment={assessment}
            onTellMeMore={() => openOlly(client.id, { mode: 'tell', assessment })}
          />
          <StatusFeedback client={client} />
        </div>
        <ClientTabs client={client} profile={profile} initialTab={initialTab} withTranscript />
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
      <ClientDetailsPanel client={getClient(shown)} onClose={close} initialTab={state.selectedClientTab} />
    </DrawerAside>
  );
}
