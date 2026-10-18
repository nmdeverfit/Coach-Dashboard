import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import iconDrag from '../assets/figma/icon-drag-indicator.svg';
import iconMinus from '../assets/figma/icon-circle-minus-fill.svg';
import iconPlusSm from '../assets/figma/icon-circle-plus-fill-sm.svg';
import iconPlus from '../assets/figma/icon-circle-plus-fill.svg';
import type { CardKey, MetricKey } from '../data/types';
import { useStore, type CustomizeTab } from '../state/store';
import { GroupIcon } from './CategoryGroup';
import { Glyph } from './Glyph';
import { ALL_GROUPS, DEFAULT_ORDER, MAX_CARDS } from './groups';
import { DEFAULT_METRICS, METRICS, METRIC_ORDER } from './metrics';
import { Modal } from './Modal';

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
}

/** The 3 px brand line drawn in the gap where a dragged card will land (the user's reference). */
function DropLine({ at }: { at: 'top' | 'bottom' }) {
  return <span aria-hidden className={`pointer-events-none absolute inset-x-0 h-[3px] rounded-full bg-brand ${at === 'top' ? '-top-[5.5px]' : '-bottom-[5.5px]'}`} />;
}

/**
 * One card in either column (Figma 5749:521640 "stat block"): drag handle, icon, name, then − / +. While it is being
 * dragged its slot stays behind as an empty grey box.
 */
function Row({
  item,
  shown,
  placeholder,
  line,
  disabled,
  onAction,
  onDragStart,
  onDragEnd,
  onKeyDown,
}: {
  item: Item;
  shown: boolean;
  placeholder: boolean;
  line?: 'top' | 'bottom';
  disabled?: boolean;
  onAction: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
}) {
  return (
    <li
      data-row
      draggable
      tabIndex={shown ? 0 : undefined}
      title={item.description}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      className={`relative flex cursor-grab items-center gap-1 rounded-lg border py-3 pl-2 pr-3 outline-none focus-visible:border-brand ${
        placeholder ? 'border-transparent bg-surface-secondary' : 'border-line bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
      }`}
    >
      {line && <DropLine at={line} />}
      <span className={`flex min-w-0 flex-1 items-center gap-1 ${placeholder ? 'invisible' : ''}`}>
        <img src={iconDrag} alt="" width={16} height={16} className="shrink-0" />
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {item.icon}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[14px] font-semibold leading-[1.5] tracking-[-0.28px] text-ink">{item.title}</span>
            {!shown && item.alsoOn && <span className="text-[11px] leading-[1.4] text-ink-muted">Also on {item.alsoOn}</span>}
          </span>
        </span>
        <button
          type="button"
          aria-label={`${shown ? 'Remove' : 'Add'} ${item.title}`}
          disabled={disabled}
          onClick={onAction}
          className="shrink-0 rounded-full hover:brightness-75 disabled:cursor-default disabled:opacity-30 disabled:hover:brightness-100"
        >
          <img src={shown ? iconMinus : iconPlus} alt="" width={16} height={16} />
        </button>
      </span>
    </li>
  );
}

/** Which gap (0 = above the first row, n = below the last) the pointer is closest to, from the rows' midpoints. */
function gapAt(list: HTMLElement, y: number) {
  const rows = [...list.querySelectorAll<HTMLElement>('[data-row]')];
  const i = rows.findIndex((r) => {
    const box = r.getBoundingClientRect();
    return y < box.top + box.height / 2;
  });
  return i === -1 ? rows.length : i;
}

/**
 * Customize cards (Figma 5749:521640; both tabs drawn the same): one popup for the rail's group cards and the client
 * list's metric cards, from one library of groups. Each tab has its own order and limit; a library row says when the
 * group already shows on the other surface. It opens on the tab of the view it was opened from (Dashboard Settings ›
 * Customize, or a group card's ⋯). Dragging, a brand line marks the closest gap the card will drop into. Nothing
 * changes until Save; Cancel or × throws both drafts away; Reset to default resets the open tab.
 */
export function CustomizeCards({ initialTab }: { initialTab: CustomizeTab }) {
  const { state, setRail, setMetrics, openCustomize, showToast } = useStore();
  const [tab, setTab] = useState<CustomizeTab>(initialTab);
  const [brief, setBrief] = useState<CardKey[]>(state.rail.order);
  const [dash, setDash] = useState<MetricKey[]>(state.metrics);
  const [drag, setDrag] = useState<Drag>(null);
  // The gap in the shown list the dragged card would drop into.
  const [gap, setGap] = useState<number | null>(null);
  const close = () => openCustomize(null);

  const isBrief = tab === 'brief';
  const shownKeys: Key[] = isBrief ? brief : dash;
  const max = MAX_CARDS;
  const full = shownKeys.length >= max;
  const setShown = (keys: Key[]) => (isBrief ? setBrief(keys as CardKey[]) : setDash(keys as MetricKey[]));

  const item = (key: Key): Item => {
    if (isBrief) {
      const g = ALL_GROUPS[key as CardKey];
      return { key, title: g.title, description: g.description, icon: <GroupIcon group={g} />, alsoOn: dash.includes(key as MetricKey) ? 'Dashboard' : undefined };
    }
    const m = METRICS[key as MetricKey];
    return {
      key,
      title: m.label,
      description: m.description,
      icon: <Glyph src={m.icon.src} size={20} inset={m.icon.inset} bleed={m.icon.bleed} />,
      alsoOn: brief.includes(key as CardKey) ? 'Today’s Brief' : undefined,
    };
  };
  // One set of nine cards on both tabs, in one order.
  const library: Key[] = METRIC_ORDER.filter((k) => !shownKeys.includes(k));

  const add = (key: Key, index = shownKeys.length) => {
    if (full) return;
    const keys = [...shownKeys];
    keys.splice(index, 0, key);
    setShown(keys);
  };
  // At least one card stays on each surface.
  const canRemove = shownKeys.length > 1;
  const remove = (key: Key) => canRemove && setShown(shownKeys.filter((k) => k !== key));
  const endDrag = () => {
    setDrag(null);
    setGap(null);
  };
  // A card's own gaps (just above or below it) would not move it, so they draw no line.
  const from = drag?.from === 'shown' ? shownKeys.indexOf(drag.key) : -1;
  const lineGap = gap === null || (from >= 0 && (gap === from || gap === from + 1)) ? null : gap;
  const drop = () => {
    if (!drag || lineGap === null) return;
    if (drag.from === 'library') return add(drag.key, lineGap);
    const keys = shownKeys.filter((k) => k !== drag.key);
    keys.splice(lineGap > from ? lineGap - 1 : lineGap, 0, drag.key);
    setShown(keys);
  };

  const noun = isBrief ? 'card' : 'metric';

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
            onDragOver={(e) => {
              if (!drag || (drag.from === 'library' && full)) return;
              e.preventDefault();
              const list = e.currentTarget.querySelector('ul');
              if (list) setGap(gapAt(list, e.clientY));
            }}
            onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setGap(null)}
            onDrop={(e) => {
              e.preventDefault();
              drop();
              endDrag();
            }}
            // Tall enough for eight rows, so switching tabs never changes the popup's height.
            className="flex min-h-[486px] w-[449px] shrink-0 flex-col gap-3 self-stretch rounded-lg bg-surface-secondary p-4"
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
                  placeholder={drag?.key === key}
                  line={lineGap === i ? 'top' : lineGap === shownKeys.length && i === shownKeys.length - 1 ? 'bottom' : undefined}
                  disabled={!canRemove}
                  onAction={() => remove(key)}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    // After the browser has taken its drag image, so the image is the card and not the empty slot.
                    window.setTimeout(() => setDrag({ key, from: 'shown' }));
                  }}
                  onDragEnd={endDrag}
                  onKeyDown={(e) => {
                    // Alt + ↑ / ↓ moves the focused card, for anyone not dragging.
                    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
                    e.preventDefault();
                    const to = i + (e.key === 'ArrowUp' ? -1 : 1);
                    if (to < 0 || to >= shownKeys.length) return;
                    const keys = shownKeys.filter((k) => k !== key);
                    keys.splice(to, 0, key);
                    setShown(keys);
                  }}
                />
              ))}
            </ul>
          </section>

          <section
            aria-label={`Add a ${noun}`}
            onDragOver={(e) => {
              if (drag?.from !== 'shown' || !canRemove) return;
              e.preventDefault();
              setGap(null);
            }}
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
                    placeholder={drag?.key === key}
                    disabled={full}
                    onAction={() => add(key)}
                    onDragStart={(e) => {
                      if (full) return e.preventDefault();
                      e.dataTransfer.effectAllowed = 'move';
                      window.setTimeout(() => setDrag({ key, from: 'library' }));
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
