import { useEffect, useState, type ReactNode } from 'react';

const CLOSE_MS = 220;

/** Clicks on these never close a panel: the panels themselves, the middle column beside them and the rows that open them. */
const KEEP_OPEN = '[data-todo-drawer], [data-todo-row], [data-client-row], [data-side-panel]';

/**
 * Keeps the last selected id on screen while the panel slides out, so closing animates instead of vanishing.
 * Returns the id to render and whether the panel is closing.
 */
export function useDrawerPresence(selected: string | null) {
  const [shown, setShown] = useState<string | null>(selected);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (selected) {
      setShown(selected);
      setClosing(false);
      return;
    }
    setClosing(true);
    const timer = window.setTimeout(() => {
      setShown(null);
      setClosing(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [selected]);
  return { shown, closing };
}

/** ×, Esc or a click outside closes the panel without changing anything (Spec 4 AC1.4). Ignored while a dialog is up. */
export function useCloseOnOutside(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const busy = () => document.querySelector('[aria-modal="true"]');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy() && close();
    const onPointer = (e: PointerEvent) => {
      if (busy() || (e.target as Element).closest(KEEP_OPEN)) return;
      close();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, close]);
}

/** The 720 px panel that slides in from the right over the right rail. */
export function DrawerAside({ label, closing, children }: { label: string; closing: boolean; children: ReactNode }) {
  return (
    <aside
      data-todo-drawer
      aria-label={label}
      className={`fixed inset-y-0 right-0 z-40 flex w-[720px] flex-col bg-white shadow-drawer ${closing ? 'animate-drawer-out' : 'animate-drawer-in'}`}
    >
      {children}
    </aside>
  );
}
