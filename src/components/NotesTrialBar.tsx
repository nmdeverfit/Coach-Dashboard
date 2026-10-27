import { NOTES_VARIANTS, setNotesVariant, useNotesVariant } from '../lib/notesTrial';
import { getClient, useStore } from '../state/store';

/** Where the trial bar's shortcut lands: a client with notes and meeting notes both. */
const SHOWCASE = 'clint-jacobi';

/**
 * The Notes timeline trial's switcher (the user's call, not product UI): a dark bar pinned at the bottom left, beside
 * the main sidebar and clear of the panels' footers, that picks how New note works (A, B or C) on every Notes tab and
 * opens a client's Notes tab in one click. It sits above the panels and under every popup, and a click on it never
 * closes a panel.
 */
export function NotesTrialBar() {
  const variant = useNotesVariant();
  const { selectClient } = useStore();
  const active = NOTES_VARIANTS.find((v) => v.key === variant)!;
  return (
    <div data-keep-open className="fixed bottom-4 left-[80px] z-[45] flex flex-col items-start gap-1.5 rounded-xl bg-ink px-3 py-2.5 text-white shadow-[0_8px_24px_rgba(32,35,83,0.28)]">
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/60">New note trial</span>
        <div role="tablist" aria-label="New note option" className="flex rounded-lg bg-white/10 p-0.5">
          {NOTES_VARIANTS.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={variant === v.key}
              onClick={() => setNotesVariant(v.key)}
              className={`h-7 whitespace-nowrap rounded-md px-3 text-[12px] font-semibold ${variant === v.key ? 'bg-white text-ink' : 'text-white/80 hover:text-white'}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <span className="h-5 w-px bg-white/20" />
        <button
          type="button"
          onClick={() => selectClient(SHOWCASE, 'notes')}
          className="h-7 whitespace-nowrap rounded-md px-2 text-[12px] font-semibold text-white/80 hover:bg-white/10 hover:text-white"
        >
          Open {getClient(SHOWCASE).firstName}’s notes
        </button>
      </div>
      <p className="text-[11px] leading-4 text-white/70">{active.hint}</p>
    </div>
  );
}
