import { useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import dot from '../assets/figma/dot.svg';
import iconDrag from '../assets/figma/icon-drag-indicator.svg';
import iconMinus from '../assets/figma/icon-circle-minus-fill.svg';
import iconPlus from '../assets/figma/icon-circle-plus-fill-sm.svg';
import type { CardKey } from '../data/types';
import { MAX_CARDS } from './groups';
import { METRIC_ORDER } from './metrics';

/**
 * Customize cards, in place (the user's call, no frame; replaces the popup as the way in): Dashboard Settings'
 * Customize cards (or a group card's ⋯ menu) puts the view on screen into edit mode. The page dims (`EditOverlay`) and only the cards' section stays
 * lit, raised over the dim (`z-[47]`, the view's slide transform lifted so it can). The cards collapse to their
 * header with a drag handle before the icon and name (no count) and a ⊖ at the right; Cancel and Save sit at the
 * top; the cards not on the view sit under them as chips: icon, name, then a ⊕. Nothing changes until Save; Cancel or Esc throws the draft away.
 */

export interface EditItem {
  title: string;
  icon: ReactNode;
  description: string;
}

/** The dim over the whole page while a view's cards are being edited. Clicks on it do nothing, so no draft is lost. */
export function EditOverlay() {
  return createPortal(<div aria-hidden className="fixed inset-0 z-[46] animate-fade-in bg-[#0c0f2e]/60" />, document.body);
}

type Drag = { key: CardKey; from: 'shown' | 'chips' } | null;

/**
 * Which gap (0 = before the first card, n = after the last) the pointer is closest to, from the cards' midpoints. In
 * the metric grid (`row`), the line of cards nearest the pointer first, then the midpoints along it.
 */
function gapAt(list: HTMLElement, x: number, y: number, row: boolean) {
  const boxes = [...list.querySelectorAll<HTMLElement>('[data-edit-card]')].map((c) => c.getBoundingClientRect());
  if (!row) {
    const i = boxes.findIndex((b) => y < b.top + b.height / 2);
    return i === -1 ? boxes.length : i;
  }
  const dist = (b: DOMRect) => Math.abs(y - (b.top + b.height / 2));
  const near = Math.min(...boxes.map(dist));
  const line = boxes.map((b, i) => ({ b, i })).filter(({ b }) => dist(b) === near);
  const hit = line.find(({ b }) => x < b.left + b.width / 2);
  return hit ? hit.i : line[line.length - 1].i + 1;
}

/** The 3 px brand line in the gap a dragged card will drop into (8 px gaps, so it sits 5.5 px outside the card). */
function DropLine({ at, row }: { at: 'before' | 'after'; row: boolean }) {
  const place = row
    ? `inset-y-0 w-[3px] ${at === 'before' ? '-left-[5.5px]' : '-right-[5.5px]'}`
    : `inset-x-0 h-[3px] ${at === 'before' ? '-top-[5.5px]' : '-bottom-[5.5px]'}`;
  return <span aria-hidden className={`pointer-events-none absolute rounded-full bg-brand ${place}`} />;
}

/**
 * The lit section in edit mode. `row`: the client list's metric row, its cards four to a line (eight in one line
 * would cut every name short); otherwise the rail's group cards, one under another. `label` names the view in the header ("Today’s Brief" / "Dashboard").
 */
export function CardsEditor({
  initial,
  item,
  row = false,
  label,
  onSave,
  onCancel,
}: {
  initial: CardKey[];
  item: (key: CardKey) => EditItem;
  row?: boolean;
  label: string;
  onSave: (keys: CardKey[]) => void;
  onCancel: () => void;
}) {
  const [keys, setKeys] = useState<CardKey[]>(initial);
  const [drag, setDrag] = useState<Drag>(null);
  const [gap, setGap] = useState<number | null>(null);
  // A shown card held over the chips: they light up, since letting go there removes it.
  const [overChips, setOverChips] = useState(false);
  const box = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    // Bring the section into view in its own column only: scrollIntoView would also scroll the views' clipped slide
    // track sideways.
    const el = box.current;
    const col = el?.parentElement?.closest<HTMLElement>('.overflow-y-auto');
    if (el && col) {
      const top = el.getBoundingClientRect().top - col.getBoundingClientRect().top;
      if (top < 0) col.scrollTo({ top: col.scrollTop + top - 4 });
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const full = keys.length >= MAX_CARDS;
  const canRemove = keys.length > 1;
  const chips = METRIC_ORDER.filter((k) => !keys.includes(k));
  const changed = keys.join() !== initial.join();

  const add = (key: CardKey, index = keys.length) => {
    if (full) return;
    const next = keys.filter((k) => k !== key);
    next.splice(index, 0, key);
    setKeys(next);
  };
  const remove = (key: CardKey) => canRemove && setKeys(keys.filter((k) => k !== key));
  const endDrag = () => {
    setDrag(null);
    setGap(null);
    setOverChips(false);
  };
  // A card's own two gaps would not move it, so they draw no line.
  const from = drag?.from === 'shown' ? keys.indexOf(drag.key) : -1;
  const lineGap = gap === null || (from >= 0 && (gap === from || gap === from + 1)) ? null : gap;
  const drop = () => {
    if (!drag || lineGap === null) return;
    if (drag.from === 'chips') return add(drag.key, lineGap);
    const next = keys.filter((k) => k !== drag.key);
    next.splice(lineGap > from ? lineGap - 1 : lineGap, 0, drag.key);
    setKeys(next);
  };
  const move = (key: CardKey, by: number) => {
    const i = keys.indexOf(key);
    const to = i + by;
    if (to < 0 || to >= keys.length) return;
    const next = keys.filter((k) => k !== key);
    next.splice(to, 0, key);
    setKeys(next);
  };

  return (
    <section
      ref={box}
      aria-label={`Customize cards on ${label}`}
      data-cards-editor
      className="relative z-[47] flex animate-fade-in flex-col gap-4 rounded-2xl bg-surface-secondary p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.6),0_12px_40px_rgba(0,0,0,0.25)]"
    >
      <header className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold leading-[1.4] text-ink">Customize cards</h2>
          {/* The view first, a touch stronger, then the hint (the user's call). */}
          <p className="mt-1 flex items-center gap-2 whitespace-nowrap text-[13px] leading-[1.5]">
            <span className="font-semibold text-ink">{label}</span>
            {/* The brief's "Updated at … • Refreshes daily" dot. */}
            <img src={dot} alt="" width={4} height={4} />
            <span className="text-ink-secondary">Drag to reorder</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 shrink-0 rounded-[5px] border border-black/10 bg-white px-4 text-[13px] font-semibold leading-[1.5] text-ink hover:bg-surface-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!changed}
          onClick={() => onSave(keys)}
          className="h-8 shrink-0 rounded-[5px] bg-brand px-4 text-[13px] font-semibold leading-[1.5] text-white hover:bg-brand/90 disabled:bg-[#e4e6ee] disabled:text-ink-muted"
        >
          Save
        </button>
      </header>

      <ul
        ref={list}
        aria-label={`Shown on ${label}`}
        onDragOver={(e) => {
          if (!drag || (drag.from === 'chips' && full)) return;
          e.preventDefault();
          if (list.current) setGap(gapAt(list.current, e.clientX, e.clientY, row));
        }}
        onDrop={(e) => {
          e.preventDefault();
          drop();
          endDrag();
        }}
        className={row ? 'grid grid-cols-4 gap-2' : 'flex flex-col gap-2'}
      >
        {keys.map((key, i) => {
          const it = item(key);
          const held = drag?.key === key;
          const line = lineGap === i ? 'before' : lineGap === keys.length && i === keys.length - 1 ? 'after' : undefined;
          return (
            <li
              key={key}
              data-edit-card
              draggable
              tabIndex={0}
              title={it.description}
              aria-label={`${it.title}, ${i + 1} of ${keys.length}`}
              onDragStart={(e: DragEvent) => {
                e.dataTransfer.effectAllowed = 'move';
                // After the browser has taken its drag image, so the image is the card and not the empty slot.
                window.setTimeout(() => setDrag({ key, from: 'shown' }));
              }}
              onDragEnd={endDrag}
              onKeyDown={(e) => {
                // Alt + arrow keys move the focused card, for anyone not dragging.
                const back = row ? 'ArrowLeft' : 'ArrowUp';
                const fwd = row ? 'ArrowRight' : 'ArrowDown';
                if (!e.altKey || (e.key !== back && e.key !== fwd)) return;
                e.preventDefault();
                move(key, e.key === back ? -1 : 1);
              }}
              className={`relative flex min-w-0 cursor-grab items-center rounded-xl border outline-none transition-shadow focus-visible:border-brand active:cursor-grabbing ${
                'gap-2 py-3 pl-2 pr-3'
              } ${held ? 'border-dashed border-line-light bg-transparent' : 'border-transparent bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]'}`}
            >
              {line && <DropLine at={line} row={row} />}
              <span className={`flex min-w-0 flex-1 items-center gap-2 ${held ? 'invisible' : ''}`}>
                <img src={iconDrag} alt="" width={16} height={16} className="shrink-0" />
                {it.icon}
                <span className="min-w-0 truncate text-[14px] font-bold leading-[1.5] text-ink">{it.title}</span>
                <span className="flex-1" />
                <button
                  type="button"
                  aria-label={`Remove ${it.title}`}
                  disabled={!canRemove}
                  title={canRemove ? `Remove ${it.title}` : 'At least one card stays'}
                  onClick={() => remove(key)}
                  className="shrink-0 rounded-full hover:brightness-75 disabled:cursor-default disabled:opacity-30 disabled:hover:brightness-100"
                >
                  <img src={iconMinus} alt="" width={16} height={16} className="block" />
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div
        onDragOver={(e) => {
          if (drag?.from !== 'shown' || !canRemove) return;
          e.preventDefault();
          setGap(null);
          setOverChips(true);
        }}
        onDragLeave={(e) => {
          // Chromium leaves relatedTarget empty on drag events, so test the pointer against the area instead.
          const r = e.currentTarget.getBoundingClientRect();
          if (!(e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom)) setOverChips(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (drag?.from === 'shown') remove(drag.key);
          endDrag();
        }}
        className={`flex flex-col gap-2 rounded-xl border-2 border-dashed p-3 transition-colors duration-150 ${
          overChips ? 'border-brand bg-brand/5' : 'border-line-light'
        }`}
      >
        <p className={`text-[12px] leading-[1.5] ${overChips ? 'font-semibold text-brand' : 'text-ink-tertiary'}`}>
          {overChips && drag
            ? `Release to remove ${item(drag.key).title}`
            : chips.length === 0
              ? 'Every card is shown.'
              : full
                ? `Up to ${MAX_CARDS} cards. Remove one to add another.`
                : 'Add a card'}
        </p>
        {chips.length > 0 && (
          <ul aria-label="Cards to add" className="flex flex-wrap gap-2">
            {chips.map((key) => {
              const it = item(key);
              return (
                <li key={key}>
                  <button
                    type="button"
                    draggable={!full}
                    disabled={full}
                    title={it.description}
                    onClick={() => add(key)}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      window.setTimeout(() => setDrag({ key, from: 'chips' }));
                    }}
                    onDragEnd={endDrag}
                    className={`flex h-8 items-center gap-1.5 rounded-full border bg-white pl-2 pr-2 text-[13px] font-semibold leading-[1.5] text-ink hover:border-brand hover:text-brand disabled:cursor-default disabled:opacity-40 disabled:hover:border-line-light disabled:hover:text-ink ${
                      drag?.key === key ? 'border-dashed border-line-light opacity-40' : 'border-line-light'
                    }`}
                  >
                    {it.icon}
                    {it.title}
                    <img src={iconPlus} alt="" width={14} height={14} className="ml-0.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
