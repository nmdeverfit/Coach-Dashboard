import { Lock } from 'lucide-react';
import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import iconDrag from '../assets/figma/icon-drag-indicator.svg';
import iconMinus from '../assets/figma/icon-circle-minus-fill.svg';
import iconPlusSm from '../assets/figma/icon-circle-plus-fill-sm.svg';
import iconPlus from '../assets/figma/icon-circle-plus-fill.svg';
import type { CardKey, MetricKey } from '../data/types';
import { useStore, type CustomizeTab } from '../state/store';
import { GroupIcon } from './CategoryGroup';
import { Glyph } from './Glyph';
import { ALL_GROUPS, DEFAULT_ORDER, EXTRA_GROUPS, MAX_GROUPS, isCore } from './groups';
import { DEFAULT_METRICS, MAX_METRICS, METRICS, METRIC_ORDER } from './metrics';
import { Modal } from './Modal';
import { Tooltip } from './Tooltip';

const TABS: { key: CustomizeTab; label: string }[] = [
  { key: 'brief', label: 'Today’s Brief' },
  { key: 'dashboard', label: 'Dashboard' },
];

type Key = CardKey | MetricKey;
type Drag = { key: Key; from: 'shown' | 'library' } | null;

interface Item {
  key: Key;
  title: string;
  description: string;
  icon: ReactNode;
  /** Where else the group shows, from the other tab's draft; only library rows say it. */
  alsoOn?: string;
  locked?: boolean;
}

/** One card in either column (Figma 5749:521640 "stat block"): drag handle, icon, name, then − / + or a lock. */
function Row({
  item,
  shown,
  dragging,
  marker,
  disabled,
  lockNote,
  onAction,
  onDragStart,
  onDragOver,
  onDragEnd,
  onKeyDown,
}: {
  item: Item;
  shown: boolean;
  dragging: boolean;
  /** Where a card dragged in from the library will land. */
  marker?: boolean;
  disabled?: boolean;
  lockNote: string;
  onAction: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDragEnd: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}) {
  return (
    <li
      draggable
      tabIndex={shown ? 0 : undefined}
      title={item.description}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      className={`relative flex cursor-grab items-center gap-1 rounded-lg border border-line py-3 pl-2 pr-3 outline-none focus-visible:border-brand ${
        shown ? 'bg-white' : 'bg-white/0 hover:bg-white'
      } ${dragging ? 'opacity-40 ring-2 ring-brand/30' : 'hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)]'}`}
    >
      {marker && <span aria-hidden className="absolute -top-[6px] left-0 right-0 h-0.5 rounded bg-brand" />}
      <img src={iconDrag} alt="" width={16} height={16} className="shrink-0" />
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {item.icon}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold leading-[1.5] tracking-[-0.28px] text-ink">{item.title}</span>
          {!shown && item.alsoOn && <span className="text-[11px] leading-[1.4] text-ink-muted">Also on {item.alsoOn}</span>}
        </span>
      </span>
      {item.locked ? (
        <span className="group/tip relative flex size-4 shrink-0 items-center justify-center text-ink-muted" aria-label={lockNote}>
          <Lock size={13} strokeWidth={2.25} aria-hidden />
          <Tooltip wide label={lockNote} />
        </span>
      ) : (
        <button
          type="button"
          aria-label={`${shown ? 'Remove' : 'Add'} ${item.title}`}
          disabled={disabled}
          onClick={onAction}
          className="shrink-0 rounded-full hover:brightness-75 disabled:cursor-default disabled:opacity-30 disabled:hover:brightness-100"
        >
          <img src={shown ? iconMinus : iconPlus} alt="" width={16} height={16} />
        </button>
      )}
    </li>
  );
}

/**
 * Customize cards (Figma 5749:521640, with a Today's Brief tab added): one popup for the rail's group cards and the
 * client list's metric cards, from one library of groups. Each tab has its own order and limit; a library row says
 * when the group already shows on the other surface. It opens on the tab of the view it was opened from (Dashboard
 * Settings › Customize, or a group card's ⋯). The brief's four group cards are locked: their to-dos open from them
 * (AC5). Nothing changes until Save; Cancel or × throws both drafts away; Reset to default resets the open tab.
 */
export function CustomizeCards({ initialTab }: { initialTab: CustomizeTab }) {
  const { state, setRail, setMetrics, openCustomize, showToast } = useStore();
  const [tab, setTab] = useState<CustomizeTab>(initialTab);
  const [brief, setBrief] = useState<CardKey[]>(state.rail.order);
  const [dash, setDash] = useState<MetricKey[]>(state.metrics);
  const [drag, setDrag] = useState<Drag>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const close = () => openCustomize(null);

  const isBrief = tab === 'brief';
  const shownKeys: Key[] = isBrief ? brief : dash;
  const max = isBrief ? MAX_GROUPS : MAX_METRICS;
  const full = shownKeys.length >= max;
  const setShown = (keys: Key[]) => (isBrief ? setBrief(keys as CardKey[]) : setDash(keys as MetricKey[]));

  const item = (key: Key): Item =>
    isBrief
      ? {
          key,
          title: ALL_GROUPS[key as CardKey].title,
          description: ALL_GROUPS[key as CardKey].description,
          icon: <GroupIcon group={ALL_GROUPS[key as CardKey]} />,
          alsoOn: dash.includes(key as MetricKey) ? 'Dashboard' : undefined,
          locked: isCore(key as CardKey),
        }
      : {
          key,
          title: METRICS[key as MetricKey].label,
          description: METRICS[key as MetricKey].description,
          icon: <Glyph src={METRICS[key as MetricKey].icon.src} size={20} inset={METRICS[key as MetricKey].icon.inset} bleed={METRICS[key as MetricKey].icon.bleed} />,
          alsoOn: brief.includes(key as CardKey) ? 'Today’s Brief' : undefined,
        };
  // The brief's library is the groups that can be a card; No activities and Paused have no group card (brief).
  const library: Key[] = (isBrief ? EXTRA_GROUPS.map((g) => g.key) : METRIC_ORDER).filter((k) => !shownKeys.includes(k));

  const moveTo = (key: Key, index: number) => {
    const keys = shownKeys.filter((k) => k !== key);
    keys.splice(Math.max(0, Math.min(index, keys.length)), 0, key);
    setShown(keys);
  };
  const add = (key: Key, index = shownKeys.length) => {
    if (full) return;
    const keys = [...shownKeys];
    keys.splice(index, 0, key);
    setShown(keys);
  };
  // The Dashboard keeps at least one metric; the brief's four never leave (locked).
  const canRemove = (key: Key) => (isBrief ? !isCore(key as CardKey) : shownKeys.length > 1);
  const remove = (key: Key) => canRemove(key) && setShown(shownKeys.filter((k) => k !== key));
  const endDrag = () => {
    setDrag(null);
    setInsertAt(null);
  };

  const noun = isBrief ? 'card' : 'metric';
  const lockNote = 'Its to-dos open from this card, so it stays on Today’s Brief.';

  return (
    <Modal
      title="Customize cards"
      width={800}
      onClose={close}
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={() => (isBrief ? setBrief(DEFAULT_ORDER) : setDash(DEFAULT_METRICS))}
            className="text-[13px] font-semibold leading-[1.5] text-ink-secondary underline hover:text-ink"
          >
            Reset to default
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={close} className="h-11 rounded-[5px] border border-black/10 px-[30px] text-[14px] font-semibold leading-[1.5] text-black hover:bg-surface-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setRail({ order: brief, collapsed: state.rail.collapsed.filter((k) => brief.includes(k)) });
                setMetrics(dash);
                showToast('Cards updated');
                close();
              }}
              className="h-11 rounded-lg border border-black/10 bg-brand px-[30px] text-[14px] font-semibold leading-5 tracking-[-0.28px] text-white hover:bg-brand/90"
            >
              Save and Continue
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-[30px] pb-5 pt-5">
        {/* The header's view toggle, so each tab reads as the view it changes. */}
        <div role="tablist" aria-label="Cards on" className="flex w-fit items-center rounded-md border border-line-light bg-white">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={
                tab === t.key
                  ? 'flex h-8 items-center rounded-[5px] border border-ink bg-ink px-5 text-[13px] font-semibold leading-[1.4] text-white'
                  : 'flex h-8 items-center rounded-[5px] px-5 text-[13px] font-semibold leading-[1.4] text-ink/80 hover:text-ink'
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-start gap-4">
          <section
            aria-label={isBrief ? 'Shown on Today’s Brief' : 'Shown on Dashboard'}
            onDragOver={(e) => drag?.from === 'library' && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (drag?.from === 'library') add(drag.key, insertAt ?? shownKeys.length);
              endDrag();
            }}
            // Tall enough for eight rows, so switching tabs never changes the popup's height.
            className={`flex min-h-[486px] w-[449px] shrink-0 flex-col gap-3 self-stretch rounded-lg p-4 ${
              drag?.from === 'library' ? 'bg-brand/[0.06] ring-1 ring-inset ring-brand/30' : 'bg-surface-secondary'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2 text-ink-tertiary">
              <p className="flex items-baseline gap-1 whitespace-nowrap">
                <span className="text-[12px] font-semibold uppercase leading-[1.5] tracking-[-0.24px]">{isBrief ? 'Shown on Today’s Brief' : 'Shown on Dashboard'}</span>
                <span className="text-[13px] leading-[1.5]">(Drag to reorder)</span>
              </p>
              <span className={`text-[12px] font-semibold tabular-nums ${full ? 'text-ink' : ''}`}>
                {shownKeys.length}/{max}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {shownKeys.map((key, i) => (
                  <Row
                    key={key}
                    item={item(key)}
                    shown
                    dragging={drag?.key === key}
                    marker={insertAt === i && drag?.from === 'library'}
                    disabled={!canRemove(key)}
                    lockNote={lockNote}
                    onAction={() => remove(key)}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      setDrag({ key, from: 'shown' });
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (drag?.from === 'shown' && drag.key !== key) moveTo(drag.key, i);
                      if (drag?.from === 'library') setInsertAt(i);
                    }}
                    onDragEnd={endDrag}
                    onKeyDown={(e) => {
                      // Alt + ↑ / ↓ moves the focused card, for anyone not dragging.
                      if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
                      e.preventDefault();
                      moveTo(key, i + (e.key === 'ArrowUp' ? -1 : 1));
                    }}
                  />
              ))}
            </ul>
          </section>

          <section
            aria-label={`Add a ${noun}`}
            onDragOver={(e) => drag?.from === 'shown' && canRemove(drag.key) && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (drag?.from === 'shown') remove(drag.key);
              endDrag();
            }}
            className="flex w-[275px] shrink-0 flex-col gap-2 self-stretch rounded-lg pb-px pt-2.5"
          >
            <p className="flex items-center gap-1 text-[13px] leading-[1.5] tracking-[-0.26px] text-ink-tertiary">
              {full ? (
                `Up to ${max} ${noun}s. Remove one to add another.`
              ) : (
                <>
                  Click <img src={iconPlusSm} alt="plus" width={12} height={12} /> or drag to left column to add {noun}
                </>
              )}
            </p>
            {library.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line-light px-3 py-4 text-center text-[13px] text-ink-muted">Every {noun} is shown.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {library.map((key) => (
                  <Row
                    key={key}
                    item={item(key)}
                    shown={false}
                    dragging={drag?.key === key}
                    disabled={full}
                    lockNote={lockNote}
                    onAction={() => add(key)}
                    onDragStart={(e) => {
                      if (full) return e.preventDefault();
                      e.dataTransfer.effectAllowed = 'move';
                      setDrag({ key, from: 'library' });
                    }}
                    onDragEnd={endDrag}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
}
