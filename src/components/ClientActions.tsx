import iconMarkDoneChecked from '../assets/figma/icon-markdone-checked.svg';
import iconMarkDone from '../assets/figma/icon-markdone.svg';
import iconMessage from '../assets/figma/icon-message-dots.svg';
import iconMore from '../assets/figma/icon-more.svg';
import iconPencilAi from '../assets/figma/icon-pencil-ai.svg';
import type { Client } from '../data/types';
import { useStore } from '../state/store';
import { Tooltip } from './Tooltip';

const ICON_BASE = 'group/tip relative flex size-8 items-center justify-center rounded-md border border-black/15';
const ICON_BUTTON = `${ICON_BASE} bg-white hover:bg-surface-secondary`;

/**
 * The four 32 px quick actions (Draft with AI · Send message · Mark as reviewed · More), shared by the client detail
 * page (Figma 5671:141948) and the client list's Action column (5676:145292). On the list the ✓ toggles, so a review
 * can be taken back; on the detail page it is one-way, as drawn. `onToggleReview` lets the list animate the row out
 * before the review lands.
 */
export function ClientActions({ client, where, onToggleReview }: { client: Client; where: 'panel' | 'list'; onToggleReview?: () => void }) {
  const { state, showToast, reviewClient, toggleReview, reviewedNow, openOlly, openInbox } = useStore();
  // The list follows the week selector; the detail page is always this week's.
  const reviewed = where === 'list' ? reviewedNow(client.id) : Boolean(state.reviewed[client.id]);
  const canToggle = where === 'list';

  return (
    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {/* The AI button clips its own light sweep, so its tooltip hangs off a wrapper. */}
      <span className="group/tip relative">
        <button
          type="button"
          aria-label="Draft with AI"
          onClick={() => openOlly(client.id, { mode: 'draft' })}
          className="ai-btn flex size-8 items-center justify-center rounded-[4px] border border-black/15 bg-white shadow-[inset_0_0_8px_rgba(222,172,231,0.6)]"
        >
          <img src={iconPencilAi} alt="" width={20} height={20} />
        </button>
        <Tooltip label="Draft with AI" />
      </span>
      <button type="button" aria-label="Send message" onClick={() => openInbox(client.id)} className={ICON_BUTTON}>
        <img src={iconMessage} alt="" width={16.2} height={16.2} />
        <Tooltip label="Send message" />
      </button>
      <button
        type="button"
        aria-label={reviewed ? (canToggle ? 'Undo review' : 'Reviewed') : 'Mark as reviewed'}
        aria-pressed={reviewed}
        disabled={reviewed && !canToggle}
        onClick={() => (canToggle ? (onToggleReview ?? (() => toggleReview(client.id)))() : reviewClient(client.id))}
        className={reviewed ? `${ICON_BASE} bg-checked ${canToggle ? 'hover:brightness-110' : 'cursor-default'}` : ICON_BUTTON}
      >
        <span className="relative size-4">
          <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
            <img src={reviewed ? iconMarkDoneChecked : iconMarkDone} alt="" className="block size-full max-w-none" />
          </span>
        </span>
        <Tooltip label={reviewed ? (canToggle ? 'Undo review' : 'Reviewed this week') : 'Mark as reviewed'} />
      </button>
      <button type="button" aria-label="More" onClick={() => showToast('More client actions (pause, archive…) open here')} className={ICON_BUTTON}>
        <img src={iconMore} alt="" width={16} height={16} />
        <Tooltip label="More" />
      </button>
    </div>
  );
}
