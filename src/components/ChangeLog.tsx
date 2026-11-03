import { ArrowRightLeft, ArrowUpRight, ChevronDown, ChevronUp, LayoutDashboard, LayoutGrid, ListTree, NotebookPen } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NOTES_LAYOUTS, RELATED_OPTIONS, setNotesLayout, setRelatedOption, useNotesLayout, useRelatedOption } from '../lib/notesTrial';
import { useStore } from '../state/store';

/** The client every shortcut lands on when it needs one: notes, meeting notes and an at-risk assessment all at once. */
const SHOWCASE = 'clint-jacobi';
const KEY = 'cid-changelog-open';

/** Waits for an element the next screen draws (a panel slides in first), up to ~2 s. */
function whenReady<T extends Element>(find: () => T | null, then: (el: T) => void, tries = 25) {
  const el = find();
  if (el) return then(el);
  if (tries > 0) window.setTimeout(() => whenReady(find, then, tries - 1), 80);
}

/** Scrolls an element into view inside its own column only (scrollIntoView would also slide the views' track). */
function reveal(el: HTMLElement) {
  const col = el.parentElement?.closest<HTMLElement>('.overflow-y-auto');
  if (col) {
    const top = el.getBoundingClientRect().top - col.getBoundingClientRect().top;
    col.scrollTo({ top: col.scrollTop + top - 80, behavior: 'smooth' });
  }
  // A brand ring that fades, so the eye finds what the entry points at.
  el.animate(
    [
      { boxShadow: '0 0 0 0 rgba(24,78,255,0)', borderRadius: '12px' },
      { boxShadow: '0 0 0 4px rgba(24,78,255,0.35)', borderRadius: '12px', offset: 0.2 },
      { boxShadow: '0 0 0 4px rgba(24,78,255,0.35)', borderRadius: '12px', offset: 0.7 },
      { boxShadow: '0 0 0 0 rgba(24,78,255,0)', borderRadius: '12px' },
    ],
    { duration: 2200, delay: 300, easing: 'ease-out' },
  );
}

const readOpen = () => {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
};

/** A trial option inside an entry: a label, then a small segmented control (selected in `ink`). */
function Segmented<K extends string>({ label, value, options, onChange }: { label: string; value: K; options: { key: K; label: string }[]; onChange: (k: K) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 truncate text-[12px] leading-[1.5] text-ink-secondary">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex shrink-0 rounded-md border border-line-light bg-white p-0.5">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={value === o.key}
            onClick={() => onChange(o.key)}
            className={`h-6 whitespace-nowrap rounded px-2.5 text-[12px] font-semibold ${value === o.key ? 'bg-ink text-white' : 'text-ink-secondary hover:text-ink'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Entry {
  key: string;
  icon: ReactNode;
  title: string;
  /** A trial option this change can be seen in, picked here (the user's call). */
  option?: ReactNode;
  go: () => void;
}

/**
 * Changelog (the user's call, demo tooling, not product UI): pinned at the bottom left, beside the main sidebar, it
 * lists what this page changes against the original Check-in Dashboard v2 demo, by title only (the user's call), and
 * each entry's View takes the viewer to that UI (and folds the log away so the UI shows). The chevron collapses it to a
 * bar; open or collapsed is remembered in this browser. It sits above the panels and under every popup, and a click
 * on it never closes a panel.
 */
export function ChangeLog() {
  const { state, setView, resetWeek, selectClient, selectTodo, editCards } = useStore();
  const [open, setOpenState] = useState(readOpen);
  const notesLayout = useNotesLayout();
  const related = useRelatedOption();
  const setOpen = (v: boolean) => {
    setOpenState(v);
    try {
      localStorage.setItem(KEY, v ? '1' : '0');
    } catch {
      // Private windows: the choice lasts for the page only.
    }
  };

  const toBrief = () => {
    if (state.weekOffset !== 0) resetWeek();
    if (state.view !== 'brief') setView('brief');
    selectTodo(null);
    selectClient(null);
  };

  const entries: Entry[] = [
    {
      key: 'notes',
      icon: <NotebookPen size={16} />,
      title: 'Notes | Meeting notes',
      option: (
        <Segmented
          label="Opens in"
          value={notesLayout}
          options={NOTES_LAYOUTS.map((v) => ({ key: v.key, label: v.label }))}
          onChange={setNotesLayout}
        />
      ),
      go: () => selectClient(SHOWCASE, 'notes'),
    },
    {
      key: 'status',
      icon: <ArrowRightLeft size={16} />,
      title: 'Change client status',
      go: () => {
        selectClient(SHOWCASE);
        // Not quite sits under the assessment on the client page; the popup opens once the panel is in.
        whenReady(
          () => [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Not quite') ?? null,
          (b) => window.setTimeout(() => b.click(), 250),
        );
      },
    },
    {
      key: 'grouped',
      icon: <ListTree size={16} />,
      title: 'Grouped to-dos',
      option: <Segmented label="Related to-dos in the panel" value={related} options={RELATED_OPTIONS} onChange={setRelatedOption} />,
      go: () => {
        toBrief();
        whenReady(() => document.querySelector<HTMLElement>('[data-view-layer="active"] li[data-todo-id^="client:"]'), reveal);
      },
    },
    {
      key: 'cards-brief',
      icon: <LayoutGrid size={16} />,
      title: 'Customize cards · Today’s Brief',
      go: () => {
        toBrief();
        editCards('brief');
      },
    },
    {
      key: 'cards-dashboard',
      icon: <LayoutDashboard size={16} />,
      title: 'Customize cards · Dashboard',
      go: () => {
        if (state.weekOffset !== 0) resetWeek();
        if (state.view !== 'dashboard') setView('dashboard');
        editCards('dashboard');
      },
    },
  ];

  if (!open)
    return (
      <button
        type="button"
        data-keep-open
        aria-expanded={false}
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-[80px] z-[45] flex h-9 items-center gap-2 rounded-xl bg-ink pl-3 pr-2.5 text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(32,35,83,0.28)] hover:bg-ink/90"
      >
        What’s changed
        <span className="rounded bg-white/15 px-1 text-[11px] tabular-nums">{entries.length}</span>
        <ChevronUp size={16} className="text-white/70" aria-hidden />
      </button>
    );

  return (
    <section
      data-keep-open
      aria-label="What’s changed"
      className="fixed bottom-4 left-[80px] z-[45] flex max-h-[calc(100vh-120px)] w-[360px] animate-pop-in flex-col rounded-xl bg-white text-ink shadow-[0_0_2px_rgba(176,186,200,0.9),0_12px_40px_rgba(32,35,83,0.25)]"
    >
      <header className="flex shrink-0 items-start gap-3 border-b border-line px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[16px] font-bold leading-[1.4]">
            What’s changed
            <span className="rounded bg-surface-secondary px-1.5 text-[12px] font-semibold tabular-nums text-ink-tertiary">{entries.length}</span>
          </h2>
          <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-secondary">Against the original Check-in Dashboard v2. View takes you there.</p>
        </div>
        <button
          type="button"
          aria-label="Collapse"
          title="Collapse"
          aria-expanded
          onClick={() => setOpen(false)}
          className="-mr-1 -mt-0.5 flex size-7 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-secondary hover:text-ink"
        >
          <ChevronDown size={18} />
        </button>
      </header>
      <ol className="scroll-thin flex min-h-0 flex-col divide-y divide-line overflow-y-auto px-4">
        {entries.map((e) => (
          <li key={e.key} className="py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">{e.icon}</span>
              <h3 className="min-w-0 flex-1 text-[13px] font-semibold leading-[1.5]">{e.title}</h3>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  e.go();
                }}
                className="flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-brand hover:bg-brand/10"
              >
                View
                <ArrowUpRight size={14} aria-hidden />
              </button>
            </div>
            {e.option && <div className="mt-2 pl-[38px]">{e.option}</div>}
          </li>
        ))}
      </ol>
    </section>
  );
}
