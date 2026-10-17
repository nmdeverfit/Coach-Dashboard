import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import iconChevronLeft from '../../assets/figma/icon-chevron-left.svg';
import iconChevronRight from '../../assets/figma/icon-chevron-right.svg';
import { addDays } from '../../lib/checkin';
import { fieldTime } from '../../lib/meetings';
import { parseDay } from '../../lib/dates';

/**
 * The Add a meeting form's date and time pickers (no Figma frame). The browser's own pickers can't be opened from
 * the published page (it runs in an iframe, where `showPicker()` is blocked), so these are drawn in the page:
 * a dropdown under the field, rendered into <body> so the popup's scrolling body never clips it.
 */

/** A dropdown pinned under `anchor`. Closes on Esc (without closing the popup behind) or a click outside. */
function Dropdown({ anchor, width, onClose, children }: { anchor: RefObject<HTMLElement>; width?: number; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (r) setPos({ left: r.left, top: r.bottom + 4, width: width ?? r.width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, width]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !anchor.current?.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    // Capture, so this Esc runs (and stops) before the popup's own Esc handler on window.
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [anchor, onClose]);

  if (!pos) return null;
  return createPortal(
    <div
      ref={panel}
      className="fixed z-[60] animate-fade-in rounded-lg border border-[#e0e0e0] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      style={{ left: pos.left, top: pos.top, width: pos.width }}
    >
      {children}
    </div>,
    document.body,
  );
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A month calendar; days after `max` are disabled. */
export function DatePicker({ anchor, value, max, onPick, onClose }: { anchor: RefObject<HTMLElement>; value: string; max: string; onPick: (iso: string) => void; onClose: () => void }) {
  const [month, setMonth] = useState(value.slice(0, 7));
  const first = `${month}-01`;
  const start = addDays(first, -parseDay(first).getUTCDay());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const shift = (by: number) => {
    const d = parseDay(first);
    d.setUTCMonth(d.getUTCMonth() + by);
    setMonth(d.toISOString().slice(0, 7));
  };
  const [y, m] = month.split('-').map(Number);
  const canNext = month < max.slice(0, 7);

  return (
    <Dropdown anchor={anchor} width={280} onClose={onClose}>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="flex size-7 items-center justify-center rounded hover:bg-surface-secondary">
            <img src={iconChevronLeft} alt="" width={16} height={16} />
          </button>
          <p className="text-[14px] font-semibold text-ink">
            {MONTHS[m - 1]} {y}
          </p>
          <button
            type="button"
            aria-label="Next month"
            disabled={!canNext}
            onClick={() => shift(1)}
            className="flex size-7 items-center justify-center rounded hover:bg-surface-secondary disabled:opacity-30"
          >
            <img src={iconChevronRight} alt="" width={16} height={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase leading-6 text-ink-muted">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((d) => {
            const inMonth = d.startsWith(month);
            const on = d === value;
            const off = d > max;
            return (
              <button
                key={d}
                type="button"
                disabled={off}
                aria-pressed={on}
                aria-label={d}
                onClick={() => {
                  onPick(d);
                  onClose();
                }}
                className={`mx-auto flex size-8 items-center justify-center rounded-full text-[13px] ${
                  on
                    ? 'bg-brand font-semibold text-white'
                    : off
                      ? 'cursor-default text-ink/20'
                      : `${inMonth ? 'text-ink' : 'text-ink-muted'} hover:bg-surface-secondary ${d === max ? 'font-semibold text-brand' : ''}`
                }`}
              >
                {parseDay(d).getUTCDate()}
              </button>
            );
          })}
        </div>
      </div>
    </Dropdown>
  );
}

/** Times every 15 minutes; times after `latest` (on today, the demo's 06:00) are disabled. */
export function TimePicker({ anchor, value, latest, onPick, onClose }: { anchor: RefObject<HTMLElement>; value: string; latest?: string; onPick: (hhmm: string) => void; onClose: () => void }) {
  const times = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);
  // Open on the chosen time, or around the working day (the latest allowed time on today), once the list mounts.
  const scrolled = useRef(false);
  const list = (el: HTMLDivElement | null) => {
    if (!el || scrolled.current) return;
    scrolled.current = true;
    const item = el.querySelector<HTMLElement>(`[data-time="${value || (latest && latest < '09:00' ? latest : '09:00')}"]`);
    if (item) el.scrollTop = item.offsetTop - el.clientHeight / 2 + item.offsetHeight / 2;
  };

  return (
    <Dropdown anchor={anchor} onClose={onClose}>
      <div ref={list} role="listbox" aria-label="Start time" className="scroll-thin max-h-[240px] overflow-y-auto p-1">
        {times.map((t) => {
          const off = Boolean(latest && t > latest);
          const on = t === value;
          return (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={on}
              data-time={t}
              disabled={off}
              onClick={() => {
                onPick(t);
                onClose();
              }}
              className={`flex h-8 w-full items-center rounded-md px-3 text-left text-[14px] ${
                on ? 'bg-brand-subtle font-semibold text-brand' : off ? 'cursor-default text-ink/25' : 'text-ink hover:bg-surface-secondary'
              }`}
            >
              {fieldTime(t)}
            </button>
          );
        })}
      </div>
    </Dropdown>
  );
}
