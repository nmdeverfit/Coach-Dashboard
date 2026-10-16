import { useEffect, useState } from 'react';
import iconExternal from '../../assets/figma/icon-external.svg';
import iconClose from '../../assets/figma/icon-olly-close.svg';
import iconTabClose from '../../assets/figma/icon-panel-close-tab.svg';
import { getClient, useStore, type SidePanelState, type SideTab } from '../../state/store';
import { AiPill } from '../AiPill';
import { InboxConversation } from './InboxConversation';
import { OllyConversation } from './OllyConversation';

/**
 * The middle column (Spec 4 AC2.2, AC2.3): Olly or the inbox, 360 px, stacked left of the 720 px panel, which stays
 * open. With both open they share one column under tabs (Figma 5699:138912).
 */

/** "BETA" tag beside Olly's name (Figma Tag Highlight). */
function BetaTag() {
  return (
    <span
      className="flex h-4 items-center rounded border-[0.5px] border-black/[0.07] px-1 text-[10px] font-semibold uppercase leading-[13px] text-white"
      style={{ backgroundImage: 'radial-gradient(160% 100% at 50% 0%, #988fff 0%, #c97ddc 50%, #fa6bba 100%)' }}
    >
      Beta
    </span>
  );
}

function IconButton({ src, label, size, onClick }: { src: string; label: string; size: number; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex size-8 items-center justify-center rounded hover:bg-black/5">
      <img src={src} alt="" width={size} height={size} />
    </button>
  );
}

const OLLY_BG = 'linear-gradient(180deg, #ffffff 0.9%, #f6f8fa 31.3%, #fff9fe 88.4%)';

const CLOSE_MS = 220;

/** Keeps the column on screen while it slides back under the panel, so closing animates instead of vanishing. */
function useSidePresence(current: SidePanelState | null) {
  const [shown, setShown] = useState(current);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (current) {
      setShown(current);
      setClosing(false);
      return;
    }
    setClosing(true);
    const t = window.setTimeout(() => {
      setShown(null);
      setClosing(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [current]);
  return { side: current ?? shown, closing: !current && closing };
}

export function SidePanel() {
  const { state, setSideTab, closeSideTab, showToast } = useStore();
  const { side, closing } = useSidePresence(state.side);
  if (!side) return null;
  const client = getClient(side.clientId);
  const both = side.inbox && side.olly;
  const active: SideTab = both ? side.active : side.olly ? 'olly' : 'inbox';
  const popOut = () => showToast(active === 'olly' ? 'Olly opens full screen in a new tab' : `The Inbox opens on ${client.firstName}’s thread in a new tab`);

  return (
    <aside
      data-side-panel
      aria-label={active === 'olly' ? 'Olly' : `Messages with ${client.name}`}
      className={`fixed inset-y-0 right-[720px] z-[39] flex w-[360px] flex-col border-r border-[#f2f2f2] shadow-[-4px_0_60px_rgba(0,0,0,0.2)] ${
        closing ? 'pointer-events-none animate-side-out' : 'animate-side-in'
      }`}
      style={{ background: active === 'olly' ? OLLY_BG : '#ffffff' }}
    >
      {both ? (
        <div role="tablist" className="flex h-11 shrink-0 items-stretch border-b border-[#f2f2f2]">
          <div className={`flex items-center gap-4 border-r border-line px-3 ${active === 'inbox' ? 'bg-[#fefefe]' : 'bg-[#f0f0f2]'}`}>
            <button type="button" role="tab" aria-selected={active === 'inbox'} onClick={() => setSideTab('inbox')} className="max-w-[150px] truncate text-[14px] font-bold leading-6 text-black/70">
              {client.name}
            </button>
            <button type="button" aria-label="Close messages" onClick={() => closeSideTab('inbox')} className="flex size-5 items-center justify-center rounded hover:bg-black/5">
              <img src={iconTabClose} alt="" width={12.5} height={12.5} />
            </button>
          </div>
          <div className={`flex flex-1 items-center justify-between px-3 ${active === 'olly' ? 'bg-[#fefefe]' : 'bg-[#f0f0f2]'}`}>
            <button type="button" role="tab" aria-selected={active === 'olly'} onClick={() => setSideTab('olly')} className="flex items-center gap-1.5 text-[14px] font-semibold leading-6 text-black/70">
              Olly <AiPill />
            </button>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Open in a new tab" onClick={popOut} className="rounded hover:opacity-70">
                <img src={iconExternal} alt="" width={20} height={20} />
              </button>
              <button type="button" aria-label="Close Olly" onClick={() => closeSideTab('olly')} className="flex size-5 items-center justify-center rounded hover:bg-black/5">
                <img src={iconTabClose} alt="" width={12.5} height={12.5} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <header className={`flex shrink-0 items-center justify-between border-b ${active === 'olly' ? 'h-14 border-[#f2f2f2] p-2 pl-4' : 'h-14 border-[#e8e8e8] bg-white pl-[15px] pr-2.5'}`}>
          {active === 'olly' ? (
            <span className="flex items-center gap-1.5 text-[16px] font-bold leading-6 text-black/70">
              Olly <BetaTag />
            </span>
          ) : (
            <span className="truncate text-[16px] font-bold leading-[1.5] text-ink">{client.name}</span>
          )}
          <span className="flex items-center gap-1">
            <IconButton src={iconExternal} label="Open in a new tab" size={20} onClick={popOut} />
            <IconButton src={iconClose} label="Close" size={20} onClick={() => closeSideTab(active)} />
          </span>
        </header>
      )}
      {/* Both conversations stay mounted, so switching tabs keeps a draft, a reply and the scroll position. */}
      {side.olly && (
        <div className={active === 'olly' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
          <OllyConversation key={side.olly.seq} clientId={client.id} request={side.olly} />
        </div>
      )}
      {side.inbox && (
        <div className={active === 'inbox' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
          <InboxConversation clientId={client.id} />
        </div>
      )}
    </aside>
  );
}
