import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import iconCircleCheck from '../../assets/figma/icon-circle-check-fill.svg';
import iconMore from '../../assets/figma/icon-more.svg';
import iconClose from '../../assets/figma/icon-close.svg';
import iconChevronLeft from '../../assets/figma/icon-chevron-left.svg';
import iconExternal from '../../assets/figma/icon-external.svg';
import { DEMO_TODAY } from '../../data/mock';
import { getProfile } from '../../data/profiles';
import type { Client } from '../../data/types';
import { buildClientAssessment } from '../../lib/client';
import { getClient, useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { ClientActions, MORE_ACTIONS_TOAST } from '../ClientActions';
import { reducedMotion } from '../ClientListParts';
import { StatusChip } from '../StatusChip';
import { Tooltip } from '../Tooltip';
import { AiAssessment } from './AiAssessment';
import { ClientTabs, type ClientTabKey } from './ClientTabs';
import { DrawerAside, useCloseOnOutside, useDrawerPresence } from './DrawerShell';
import { DraftWithAiButton, FooterButton, SendMessageButton } from './PanelParts';
import { StatusFeedback } from './StatusFeedback';

/** The panel's slide-in (`animate-drawer-in`, 280 ms) finishes before the scroll to a tab starts. */
const SLIDE_IN_MS = 300;
/** Room under the header for the pinned assessment, which covers the top of the scroller once it has scrolled past. */
const PINNED_CARD_ROOM = 124;

/** Avatar, name, status and the four quick actions of the client detail page (Figma 5671:141948). */
function ClientTitle({ client, actions }: { client: Client; actions: RefObject<HTMLDivElement> }) {
  const { showToast } = useStore();
  return (
    <div className="flex items-center gap-4 px-[30px] py-5">
      <Avatar name={client.name} src={client.avatar} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="truncate text-[18px] font-bold leading-[1.5] text-ink">{client.name}</h2>
          {/* The client profile is not in the demo, so the icon toasts. */}
          <button
            type="button"
            aria-label="Open client profile"
            onClick={() => showToast(`${client.firstName}’s client profile opens in a new tab`)}
            className="group/tip relative flex size-5 shrink-0 items-center justify-center rounded hover:opacity-70"
          >
            <img src={iconExternal} alt="" width={20} height={20} />
            <Tooltip label="Open client profile" below />
          </button>
        </div>
        <p className="flex items-center gap-1 text-[13px] leading-normal text-ink-tertiary">
          Status: <StatusChip status={client.status} />
        </p>
      </div>
      <div ref={actions}>
        <ClientActions client={client} where="panel" />
      </div>
    </div>
  );
}

/** True once `target` has scrolled up out of its `[data-panel-scroll]` area. */
function useScrolledPast(target: RefObject<HTMLElement>) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const el = target.current;
    const root = el?.closest<HTMLElement>('[data-panel-scroll]');
    if (!el || !root) return;
    const watch = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)), { root });
    watch.observe(el);
    return () => watch.disconnect();
  }, [target]);
  return past;
}

/**
 * The quick actions again, labelled, in a footer pinned to the panel's bottom once the title row's icons have
 * scrolled away (no frame; the to-do panel's footer buttons). Mark as reviewed is the primary, as on Check-in;
 * More stays an icon, last.
 */
function ClientFooter({ client }: { client: Client }) {
  const { state, reviewClient, showToast } = useStore();
  const reviewed = Boolean(state.reviewed[client.id]);
  return (
    <footer className="flex shrink-0 animate-footer-in items-center justify-end gap-2 border-t border-line bg-white px-[30px] pb-5 pt-4 shadow-footer">
      <FooterButton
        variant="primary"
        icon={<img src={iconCircleCheck} alt="" width={16} height={16} />}
        label={reviewed ? 'Reviewed' : 'Mark as reviewed'}
        disabled={reviewed}
        onClick={() => reviewClient(client.id)}
      />
      <DraftWithAiButton clientId={client.id} />
      <SendMessageButton clientId={client.id} />
      {/* More stays an icon: a 40 px square, the footer buttons' height, with the title row's tooltip. */}
      <button
        type="button"
        aria-label="More"
        onClick={() => showToast(MORE_ACTIONS_TOAST)}
        className="group/tip relative flex size-10 shrink-0 items-center justify-center rounded-lg border border-line-light bg-white hover:bg-surface-secondary"
      >
        <img src={iconMore} alt="" width={16} height={16} />
        <Tooltip label="More" />
      </button>
    </footer>
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
  const actions = useRef<HTMLDivElement>(null);
  const footer = useScrolledPast(actions);
  const scroller = useRef<HTMLDivElement>(null);

  // Opened on a tab (an Upcoming bookings row or the list's Booking tab opens Booking): once the panel has slid in,
  // scroll the tabs up to just under the pinned assessment, so the tab's first card (Sessions) is in view.
  useEffect(() => {
    if (!initialTab) return;
    const timer = window.setTimeout(() => {
      const root = scroller.current;
      const tabs = root?.querySelector<HTMLElement>('[role="tablist"][aria-label="Client data"]');
      if (!root || !tabs) return;
      const top = tabs.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
      root.scrollTo({ top: Math.max(0, top - PINNED_CARD_ROOM), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }, SLIDE_IN_MS);
    return () => window.clearTimeout(timer);
  }, [client.id, initialTab]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5 pb-2.5 pt-[15px]">
        {onBack ? (
          <button type="button" onClick={onBack} className="-ml-1.5 flex items-center gap-0.5 text-[13px] font-semibold leading-[1.5] text-ink-secondary hover:text-ink">
            <img src={iconChevronLeft} alt="" width={24} height={24} />
            CLIENT DETAILS
          </button>
        ) : (
          <p className="text-[13px] font-semibold leading-[1.5] text-ink-secondary">CLIENT DETAILS</p>
        )}
        <button type="button" aria-label="Close client details" onClick={onClose} className="relative size-5 overflow-hidden rounded hover:opacity-70">
          <img src={iconClose} alt="" className="absolute left-1/2 top-1/2 size-6 max-w-none -translate-x-1/2 -translate-y-1/2" />
        </button>
      </header>
      <div key={client.id} ref={scroller} data-panel-scroll className="flex-1 overflow-y-auto">
        <ClientTitle client={client} actions={actions} />
        <div className="flex flex-col gap-2 px-[30px] pb-[30px]">
          <AiAssessment
            client={client}
            assessment={assessment}
            onTellMeMore={() => openOlly(client.id, { mode: 'tell', assessment })}
          />
          <StatusFeedback client={client} />
        </div>
        <ClientTabs client={client} profile={profile} initialTab={initialTab} withTranscript withTabActions />
      </div>
      {footer && <ClientFooter client={client} />}
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
