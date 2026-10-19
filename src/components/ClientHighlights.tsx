import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import anniversaryBadge from '../assets/figma/badge-anniversary.png';
import milestoneBadge from '../assets/figma/badge-milestone.svg';
import thumbsUp from '../assets/figma/emoji-thumbs-up.png';
import chatBubbles from '../assets/figma/icon-chat-bubbles.svg';
import checkOne from '../assets/figma/icon-check-one-brand.svg';
import closeStroke from '../assets/figma/icon-close-stroke.svg';
import confetti from '../assets/figma/icon-confetti.svg';
import iconPencilAi from '../assets/figma/icon-pencil-ai.svg';
import { highlights } from '../data/mock';
import type { Highlight, HighlightCategory } from '../data/types';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { ConfirmDialog } from './ConfirmDialog';
import { CountChip } from './CountChip';
import { Tooltip } from './Tooltip';

type Tab = 'all' | HighlightCategory;
type View = 'attention' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'milestone', label: 'Milestones' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'anniversary', label: 'Anniversaries' },
];

/**
 * The list is as tall as 10 one-line highlights (10 × 55 px rows + 10 px top padding). More scroll inside it;
 * fewer leave white space below, so switching tabs or views never moves the layout.
 */
const LIST_HEIGHT = 10 * 55 + 10;


/** Milestones get the blue badge; birthdays and anniversaries share the orange one, as drawn. */
function CatchUpBadge({ category }: { category: HighlightCategory }) {
  if (category === 'milestone') {
    return (
      <span className="relative size-4 rounded-full">
        <span className="absolute inset-[-1.42%_-1.43%_-1.42%_-1.41%]">
          <img src={milestoneBadge} alt="" className="block size-full max-w-none" />
        </span>
      </span>
    );
  }
  return (
    <span className="relative size-4 overflow-hidden rounded-full">
      <img src={anniversaryBadge} alt="" className="absolute left-0 top-[-1.13px] block h-[17.985px] w-[16.003px] max-w-none" />
    </span>
  );
}

/** The 👍 reaction is hidden for now (the user's call; the brief puts reactions in Phase 2). */
const SHOW_REACTION = false;

const ACTION = 'group/tip relative flex size-8 items-center justify-center rounded-[10px] bg-white hover:bg-surface-secondary';

/**
 * The actions a Need attention row shows on hover (Figma 5795:175100): React 👍 (hidden, `SHOW_REACTION`) · Draft with
 * AI · Send message · Dismiss, in a white bar over the row's right end. Draft with AI and Send message open the middle
 * column at the right edge, as from a client-list row, scoped to the highlight: a message sent from either completes
 * it. `tipBelow`: the first row's tooltips hang under the bar, since the list clips the space above it.
 */
function HighlightActions({ h, reacted, tipBelow, onReact, onDismiss }: { h: Highlight; reacted: boolean; tipBelow: boolean; onReact: () => void; onDismiss: () => void }) {
  const { openOlly, openInbox } = useStore();
  return (
    <div className="absolute right-1 top-1/2 hidden -translate-y-1/2 items-center rounded-lg bg-white p-1 drop-shadow-[0_4px_10px_rgba(0,0,0,0.06)] group-focus-within/row:flex group-hover/row:flex">
      {SHOW_REACTION && (
        <button type="button" aria-label={reacted ? 'Remove reaction' : 'React'} aria-pressed={reacted} onClick={onReact} className={`${ACTION} ${reacted ? 'bg-brand/10 hover:bg-brand/15' : ''}`}>
          <img src={thumbsUp} alt="" width={20} height={20} />
          <Tooltip label={reacted ? 'Remove reaction' : 'React'} below={tipBelow} />
        </button>
      )}
      {/* The AI button clips its own light sweep, so its tooltip hangs off a wrapper. */}
      <span className="group/tip relative">
        <button
          type="button"
          aria-label="Draft with AI"
          onClick={() => openOlly(h.clientId, { mode: 'draft', highlightId: h.id })}
          className="ai-btn flex size-8 items-center justify-center rounded-lg bg-white"
        >
          <img src={iconPencilAi} alt="" width={18} height={18} />
        </button>
        <Tooltip label="Draft with AI" below={tipBelow} />
      </span>
      <button type="button" aria-label="Send message" onClick={() => openInbox(h.clientId, h.id)} className={ACTION}>
        <ChatIcon />
        <Tooltip label="Send message" below={tipBelow} />
      </button>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className={ACTION}>
        <img src={closeStroke} alt="" width={18} height={18} />
        <Tooltip label="Dismiss" below={tipBelow} />
      </button>
    </div>
  );
}

/** The chat bubbles in Figma's inset/bleed wrappers, shared by the Send message button and Open chat. */
function ChatIcon() {
  return (
    <span className="relative size-[18px] shrink-0">
      <span className="absolute inset-[14.59%_12.54%_10.42%_12.46%]">
        <span className="absolute inset-[-4.82%_-4.82%_-4.81%_-4.82%]">
          <img src={chatBubbles} alt="" className="block size-full max-w-none" />
        </span>
      </span>
    </span>
  );
}

/** A History row's status tag: blue "Message sent" (Figma 4341:459184) or grey "Dismissed" (the demo's). */
function OutcomeTag({ completed }: { completed: boolean }) {
  return (
    <span
      // "Message sent" is drawn 116 px wide, its words leaving about 10 px each side; "Dismissed" hugs its words with the
      // same 10 px, so the shorter tag does not look padded out.
      className={`flex shrink-0 items-center justify-center gap-1.5 self-stretch rounded-lg py-2 ${
        completed ? 'w-[116px] bg-[rgba(227,236,255,0.8)] px-6' : 'bg-surface-secondary px-2.5'
      }`}
    >
      {completed ? (
        <span className="relative size-3 shrink-0 overflow-hidden">
          <span className="absolute inset-[8.82%_8.83%_8.83%_8.81%]">
            <span className="absolute inset-[-6.67%]">
              <img src={checkOne} alt="" className="block size-full max-w-none" />
            </span>
          </span>
        </span>
      ) : (
        <img src={closeStroke} alt="" width={12} height={12} />
      )}
      <span className={`whitespace-nowrap text-[12px] font-semibold leading-[1.5] ${completed ? 'text-brand' : 'text-ink-secondary'}`}>
        {completed ? 'Message sent' : 'Dismissed'}
      </span>
    </span>
  );
}

/** Avatar with its category badge (milestones blue, birthdays and anniversaries orange). */
function Who({ h, muted = false }: { h: Highlight; muted?: boolean }) {
  return (
    <span className={`flex shrink-0 items-end ${muted ? 'opacity-50 grayscale' : ''}`}>
      <span className="-mr-4">
        <Avatar name={h.clientName} src={h.image} size={32} />
      </span>
      <CatchUpBadge category={h.category} />
    </span>
  );
}

/**
 * A History row: the highlight, then its outcome. Completed (messaged): Figma 4341:459184's light row with "Message
 * sent" and Open chat. Dismissed (no frame): greyed avatar and text, a grey "Dismissed" tag and Restore, which puts it
 * back in Need attention.
 */
function HistoryRow({ h, completed, last }: { h: Highlight; completed: boolean; last: boolean }) {
  const { openInbox, restoreHighlight, showToast } = useStore();
  return (
    <li className={`flex shrink-0 flex-col gap-3 pb-3 pl-3 pr-2 pt-2.5 ${completed ? 'bg-[rgba(244,246,251,0.8)]' : ''} ${last ? '' : 'border-b border-line'}`}>
      <div className="flex min-w-0 items-center gap-4">
        <Who h={h} muted={!completed} />
        <p className={`min-w-0 flex-1 text-[13px] leading-[1.5] ${completed ? 'text-ink' : 'text-ink-secondary'}`}>
          <span className="font-semibold">{h.clientName}</span> {h.text}
        </p>
      </div>
      <div className="flex items-center gap-3 pr-[18px]">
        <OutcomeTag completed={completed} />
        {completed ? (
          <button type="button" onClick={() => openInbox(h.clientId, h.id)} className="flex items-center gap-1 text-[12px] font-semibold leading-[1.5] text-ink hover:underline">
            <ChatIcon />
            Open chat
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              restoreHighlight(h.id);
              showToast('Highlight moved back to Need attention');
            }}
            className="flex items-center gap-1 text-[12px] font-semibold leading-[1.5] text-ink hover:underline"
          >
            <RotateCcw size={14} className="text-ink-secondary" aria-hidden />
            Restore
          </button>
        )}
      </div>
    </li>
  );
}

const VIEWS: { key: View; label: string }[] = [
  { key: 'attention', label: 'Need attention' },
  { key: 'history', label: 'History' },
];

/**
 * The v1 Catch-up tab, moved into the right rail, in two views (the user's call): Need attention (highlights not yet
 * acted on) and History (messaged = completed, or dismissed; newest first). Both keep the category tabs. Outcomes live
 * in the store (`highlightLog`, session only). `narrow` (a third of the page): the category tabs sit in a row above
 * the list.
 */
export function ClientHighlights({ narrow = false }: { narrow?: boolean }) {
  const { state, showToast, dismissHighlight, clearHighlightHistory } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [view, setView] = useState<View>('attention');
  const [tab, setTab] = useState<Tab>('all');
  const [reacted, setReacted] = useState<string[]>([]);
  const log = state.highlightLog;
  const attention = highlights.filter((h) => !log[h.id]);
  const history = highlights.filter((h) => log[h.id] && !log[h.id].cleared).sort((a, b) => log[b.id].seq - log[a.id].seq);
  const pool = view === 'attention' ? attention : history;
  const items = tab === 'all' ? pool : pool.filter((h) => h.category === tab);
  const countFor = (t: Tab) => (t === 'all' ? pool.length : pool.filter((h) => h.category === t).length);

  return (
    <section className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 pt-3">
        <img src={confetti} alt="" width={20} height={20} />
        <h3 className="text-[14px] font-bold leading-[1.5] text-ink">Client highlights</h3>
        <CountChip value={attention.length} />
      </div>
      <div className="flex flex-col rounded-lg bg-white">
        {/* The two views split the width evenly, labels centred. */}
        <div role="tablist" aria-label="Highlights" className="flex items-center border-b border-line px-2.5">
          {VIEWS.map((v) => {
            const on = v.key === view;
            return (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setView(v.key)}
                className={`-mb-px flex-1 whitespace-nowrap border-b-2 px-4 pb-2.5 pt-3 text-center text-[13px] font-semibold leading-normal ${
                  on ? 'border-brand text-brand' : 'border-transparent text-ink-secondary hover:text-ink'
                }`}
              >
                {v.label}
              </button>
            );
          })}
        </div>
        <div className={`flex ${narrow ? 'flex-col' : 'items-start'} gap-2.5 px-2.5 pb-2.5 pt-2`}>
          <div
            role="tablist"
            aria-label="Categories"
            aria-orientation={narrow ? 'horizontal' : 'vertical'}
            className={narrow ? 'scroll-none flex gap-1 overflow-x-auto pt-1' : 'flex w-[191px] shrink-0 flex-col gap-1 pt-2.5'}
          >
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] p-2 text-left text-[13px] font-semibold ${
                    active ? 'bg-brand/[0.08] text-brand' : 'text-ink-secondary hover:bg-surface-secondary hover:text-ink'
                  }`}
                >
                  {t.label} ({countFor(t.key)})
                </button>
              );
            })}
          </div>
          {/* Stacked under the tabs (narrow), flex-1 would let the list grow to every row, so it keeps a fixed height. */}
          <ul className={`scroll-thin flex min-w-0 flex-col overflow-y-auto pt-2.5 ${narrow ? 'shrink-0' : 'flex-1'}`} style={{ height: LIST_HEIGHT }}>
            {/* History opens on the retention note; Clear all empties every category, after a confirm. */}
            {view === 'history' && (
              <li className="shrink-0 px-3 pb-2.5 text-[12px] leading-[1.5] text-ink-secondary">
                Moments older than 30 days are cleared automatically.{' '}
                {history.length > 0 && (
                  <button type="button" onClick={() => setConfirmClear(true)} className="font-semibold text-ink underline hover:text-brand">
                    Clear all
                  </button>
                )}
              </li>
            )}
            {items.length === 0 && (
              <li className="flex flex-1 flex-col items-center justify-center gap-1 px-6 text-center">
                <p className="text-[13px] font-semibold leading-[1.5] text-ink">{view === 'attention' ? 'You’re all caught up.' : 'Nothing here yet.'}</p>
                <p className="text-[12px] leading-[1.5] text-ink-secondary">
                  {view === 'attention' ? 'Highlights you message or dismiss move to History.' : 'Highlights you message or dismiss show up here.'}
                </p>
              </li>
            )}
            {view === 'history' &&
              items.map((h, i) => <HistoryRow key={h.id} h={h} completed={log[h.id].status === 'completed'} last={i === items.length - 1} />)}
            {view === 'attention' &&
              items.map((h, i) => (
                <li
                  key={h.id}
                  className={`group/row relative flex min-h-[55px] shrink-0 items-center gap-4 pb-3 pl-3 pr-2 pt-2.5 hover:bg-surface-secondary ${
                    i < items.length - 1 ? 'border-b border-line' : ''
                  }`}
                >
                  <Who h={h} />
                  <p className="min-w-0 flex-1 text-[13px] leading-[1.5] text-ink">
                    <span className="font-semibold">{h.clientName}</span> {h.text}
                  </p>
                  <HighlightActions
                    h={h}
                    reacted={reacted.includes(h.id)}
                    tipBelow={i === 0}
                    onReact={() => {
                      const on = !reacted.includes(h.id);
                      setReacted((r) => (on ? [...r, h.id] : r.filter((id) => id !== h.id)));
                      if (on) showToast(`Reaction sent to ${h.clientName.split(' ')[0]}`);
                    }}
                    onDismiss={() => {
                      dismissHighlight(h.id);
                      showToast('Highlight dismissed. Find it in History.');
                    }}
                  />
                </li>
              ))}
          </ul>
        </div>
      </div>
      {confirmClear && (
        <ConfirmDialog
          title="Clear all history?"
          body={`This removes ${history.length === 1 ? 'the 1 highlight' : `all ${history.length} highlights`} in History, messaged and dismissed. They won’t come back.`}
          confirmLabel="Clear all"
          onConfirm={() => {
            clearHighlightHistory();
            setConfirmClear(false);
            showToast('History cleared');
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </section>
  );
}
