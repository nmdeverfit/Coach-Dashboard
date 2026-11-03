import { ArrowRightLeft, ChevronRight, LayoutDashboard, LayoutGrid, ListTree, NotebookPen, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getClient, useStore } from '../state/store';

/** The client every "show me" lands on when it needs one: notes, meeting notes and an at-risk assessment all at once. */
const SHOWCASE = 'clint-jacobi';

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

interface Entry {
  key: string;
  icon: ReactNode;
  title: string;
  what: string;
  go: () => void;
}

/**
 * Changelog (the user's call, demo tooling like the trial bar it sits on): what this page changes against the
 * original Check-in Dashboard v2 demo, one entry per change, each taking the viewer to that UI. Opens above the trial
 * bar; × , Esc or a click outside closes it.
 */
export function ChangeLog() {
  const { state, setView, resetWeek, selectClient, selectTodo, editCards } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const first = getClient(SHOWCASE).firstName;

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
      what: 'Notes and meeting notes on one timeline. One New note form with Note | Meeting notes tabs; a transcript goes in as a file.',
      go: () => selectClient(SHOWCASE, 'notes'),
    },
    {
      key: 'status',
      icon: <ArrowRightLeft size={16} />,
      title: 'Change client status',
      what: 'A simpler popup from Not quite: why the status looks wrong first, then the status you would choose.',
      go: () => {
        selectClient(SHOWCASE);
        // Not quite sits under the assessment on the client detail page; the popup opens once the panel is in.
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
      what: 'A client’s to-dos sit together under one header that completes them all; each row reads as one sentence with its reason.',
      go: () => {
        toBrief();
        whenReady(() => document.querySelector<HTMLElement>('[data-view-layer="active"] li[data-todo-id^="client:"]'), reveal);
      },
    },
    {
      key: 'cards-brief',
      icon: <LayoutGrid size={16} />,
      title: 'Customize cards · Today’s Brief',
      what: 'Edit the group cards in place from Dashboard Settings: drag to reorder, remove with ⊖, add from the chips.',
      go: () => {
        toBrief();
        editCards('brief');
      },
    },
    {
      key: 'cards-dashboard',
      icon: <LayoutDashboard size={16} />,
      title: 'Customize cards · Dashboard',
      what: 'The same edit mode for the client list’s metric cards, four to a line.',
      go: () => {
        if (state.weekOffset !== 0) resetWeek();
        if (state.view !== 'dashboard') setView('dashboard');
        editCards('dashboard');
      },
    },
  ];

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[12px] font-semibold ${
          open ? 'bg-white text-ink' : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        Changelog
        <span className={`rounded px-1 text-[11px] tabular-nums ${open ? 'bg-ink/10' : 'bg-white/15'}`}>{entries.length}</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Changelog"
          className="absolute bottom-full left-0 mb-4 w-[400px] animate-pop-in rounded-xl bg-white text-ink shadow-[0_0_2px_rgba(176,186,200,0.9),0_12px_40px_rgba(32,35,83,0.25)]"
        >
          <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-bold leading-[1.4]">What’s changed</h2>
              <p className="mt-0.5 text-[12px] leading-[1.5] text-ink-secondary">
                Against the original Check-in Dashboard v2. Pick one to see it ({first}’s profile where a client is needed).
              </p>
            </div>
            <button type="button" aria-label="Close changelog" onClick={() => setOpen(false)} className="-mr-1 -mt-0.5 flex size-7 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-secondary hover:text-ink">
              <X size={16} />
            </button>
          </header>
          <ol className="flex flex-col p-2">
            {entries.map((e) => (
              <li key={e.key}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    e.go();
                  }}
                  className="group flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-surface-secondary"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">{e.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-[1.5] text-ink group-hover:text-brand">{e.title}</span>
                    <span className="block text-[12px] leading-[1.5] text-ink-secondary">{e.what}</span>
                  </span>
                  <ChevronRight size={16} className="mt-2 shrink-0 text-ink-muted group-hover:text-brand" aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
