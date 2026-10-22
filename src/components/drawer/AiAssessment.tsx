import iconSparkle from '../../assets/figma/icon-ai-sparkle.svg';
import quoteLine from '../../assets/figma/ai-quote-line.svg';
import iconTellMeMore from '../../assets/figma/icon-tell-me-more.svg';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { Client } from '../../data/types';
import type { Assessment } from '../../lib/checkin';
import { useStore } from '../../state/store';
import { AddContextButton, ContextAddedChip, ContextForm, contextSummary } from './AiContext';

/** Gradient used on the "AI Assessment" label in Figma. */
export const AI_GRADIENT =
  'radial-gradient(120% 260% at 0% 0%, #f2617d 0%, #c159aa 22%, #8f51d6 44%, #6c59e0 58%, #4861e9 72%, #2469f3 86%, #0071fd 100%)';

interface Props {
  client: Client;
  assessment: Assessment;
  onTellMeMore: () => void;
}

const LINK = 'font-semibold text-ink-tertiary underline hover:text-brand';

function Label({ title = 'AI Assessment' }: { title?: string }) {
  return (
    <div className="flex items-center gap-2">
      <img src={iconSparkle} alt="" width={16} height={16} />
      <h3 className="bg-clip-text text-[14px] font-semibold leading-[1.5] text-transparent" style={{ backgroundImage: AI_GRADIENT }}>
        {title}
      </h3>
    </div>
  );
}

/** The summary and facts beside the design's vertical quote line. */
function Quote({ assessment, compact, onToggle }: { assessment: Assessment; compact?: boolean; onToggle?: () => void }) {
  const { headline, bullets } = assessment;
  // Collapsed, the summary ends in "… View more" in place of its full stop (Figma 5747:520276).
  const trim = (s: string) => (compact ? s.replace(/\.\s*$/, '') : s);
  const after = headline.after && trim(headline.after);
  const before = headline.after ? headline.before : trim(headline.before);
  return (
    <div className="flex items-stretch gap-3 px-1">
      <div className="flex w-0 shrink-0 items-center justify-center [container-type:size]" aria-hidden>
        <div className="w-[100cqh] flex-none rotate-90">
          <div className="relative h-0 w-full">
            <div className="absolute inset-[-2px_-1.85%]">
              <img src={quoteLine} alt="" className="block size-full max-w-none" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className={`text-[14px] font-semibold leading-[1.5] text-ink ${compact ? 'line-clamp-3' : ''}`}>
          {before}
          {headline.signal && (
            <>
              {' '}
              <span className="rounded-[4px] bg-brand/10 px-1 text-[#2160ff]">{headline.signal}</span>
            </>
          )}
          {after && ` ${after}`}
          {compact && (
            <>
              …{' '}
              <button type="button" onClick={onToggle} className={LINK}>
                View more
              </button>
            </>
          )}
        </p>
        {!compact && (
          <ul className="list-disc text-[14px] leading-[1.5] text-ink-tertiary">
            {bullets.map((b, i) => (
              <li key={b} className="ms-[21px]">
                {b}
                {onToggle && i === bullets.length - 1 && (
                  <>
                    {'  '}
                    <button type="button" onClick={onToggle} className={LINK}>
                      Show less
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Pins the card under the panel's header once it has scrolled out of `scroller`. Returns whether it is pinned.
 * The pinned copy is drawn into the scroller's parent, so it overlays the data area without moving it.
 */
function usePinned(card: RefObject<HTMLElement>) {
  const [pinned, setPinned] = useState(false);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const root = card.current?.closest<HTMLElement>('[data-panel-scroll]');
    if (!card.current || !root) return;
    setScroller(root);
    const watch = new IntersectionObserver(
      ([e]) => setPinned(!e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0)),
      // Pins once less than 100 px of the card shows: the pinned copy (at least ~110 px tall) covers what is left.
      { root, rootMargin: '-100px 0px 0px 0px' },
    );
    watch.observe(card.current);
    return () => watch.disconnect();
  }, [card]);
  return { pinned, scroller };
}

/**
 * The AI Assessment card. Its bottom row holds Add context (or "Context added · Edit" once saved, Figma 5746:519756)
 * and Tell me more; Add context opens the questionnaire under the row, and the left button hides while it is open
 * (5744:519377). The context is per client, so every panel showing this client's assessment shares it.
 *
 * Scrolled past, the card pins under the panel's header (Figma 5747:520276): label and summary, clamped to three
 * lines, with "View more" (5747:520431). View more opens the facts and the bottom row over the data area
 * (5747:520587); Show less folds it back. Add context from the pinned card scrolls back to the card and opens the
 * questionnaire there, so there is only ever one form.
 */
export function AiAssessment({ client, assessment, onTellMeMore }: Props) {
  const { state, setAiContext } = useStore();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const card = useRef<HTMLElement>(null);
  const { pinned, scroller } = usePinned(card);
  const saved = state.aiContext[client.id];

  useEffect(() => {
    if (!pinned) setExpanded(false);
  }, [pinned]);

  const edit = (fromPin: boolean) => {
    setEditing(true);
    if (fromPin) {
      setExpanded(false);
      card.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  };

  const actions = (fromPin: boolean) => (
    <div className="flex items-center justify-between gap-3">
      {editing ? (
        <span />
      ) : saved ? (
        <ContextAddedChip summary={contextSummary(saved)} onEdit={() => edit(fromPin)} />
      ) : (
        <AddContextButton firstName={client.firstName} onClick={() => edit(fromPin)} />
      )}
      <button
        type="button"
        onClick={onTellMeMore}
        className="ai-btn flex h-9 items-center gap-2 rounded-[4px] border border-black/15 bg-white px-[11px] text-[13px] font-semibold text-ink shadow-ai-button"
      >
        <img src={iconTellMeMore} alt="" width={20} height={20} />
        Tell me more
      </button>
    </div>
  );

  return (
    <>
      <section ref={card} className="relative flex scroll-mt-2.5 flex-col gap-4 rounded-lg border border-ai-line bg-white p-4 shadow-ai-card">
        <div className="flex flex-col gap-3">
          <Label />
          <Quote assessment={assessment} />
        </div>
        {actions(false)}
        {editing && (
          <ContextForm
            client={client}
            initial={saved}
            onCancel={() => setEditing(false)}
            onSave={(ctx) => {
              setAiContext(client.id, ctx);
              setEditing(false);
            }}
          />
        )}
      </section>
      {pinned &&
        scroller?.parentElement &&
        createPortal(
          // White strip under the header, 10 px round the card, with the header's drop shadow (5747:520715).
          <div
            data-pinned-assessment
            className="absolute left-0 z-20 animate-pin-in bg-white p-2.5 shadow-[0_5px_18px_rgba(0,0,0,0.09)]"
            style={{ top: scroller.offsetTop, right: scroller.offsetWidth - scroller.clientWidth }}
          >
            <section
              aria-label="AI Assessment"
              className={`flex flex-col gap-3 rounded-lg border border-ai-line bg-white px-4 pt-3 shadow-ai-card ${expanded ? 'pb-4' : 'pb-3'}`}
            >
              <div className="flex flex-col gap-3">
                <Label />
                <Quote assessment={assessment} compact={!expanded} onToggle={() => setExpanded((x) => !x)} />
              </div>
              {expanded && actions(true)}
            </section>
          </div>,
          scroller.parentElement,
        )}
    </>
  );
}
