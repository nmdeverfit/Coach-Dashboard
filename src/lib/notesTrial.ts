import { useSyncExternalStore } from 'react';

/**
 * Notes timeline trial: where a note opens, picked on the switch over the Notes card (`NotesOptionSwitch` in `NotesTimeline`) so the two can be compared on
 * one page (the user's call). Remembered in this browser only.
 * - popup: New note, Note details and the meeting notes open in a popup over the panel.
 * - inline: they open in the Notes card itself; its header turns into ‹ Back (details) or Cancel · Save (the form).
 */
export type NotesLayout = 'popup' | 'inline';

export const NOTES_LAYOUTS: { key: NotesLayout; label: string; hint: string }[] = [
  { key: 'popup', label: 'A · Popup', hint: 'New note and the details open in a popup' },
  { key: 'inline', label: 'B · In the section', hint: 'They open in the Notes card: ‹ Back on details, Cancel · Save on the form' },
];

const KEY = 'cid-notes-layout';
const read = (): NotesLayout => {
  try {
    return localStorage.getItem(KEY) === 'inline' ? 'inline' : 'popup';
  } catch {
    return 'popup';
  }
};

let current: NotesLayout = read();
const listeners = new Set<() => void>();

export function setNotesLayout(v: NotesLayout) {
  current = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Private windows: the pick lasts for the page only.
  }
  listeners.forEach((l) => l());
}

export const useNotesLayout = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );

/**
 * Whether the Notes option switch shows over the Notes card. Hidden with its ×, so screenshots show the product only;
 * the Changelog brings it back (the user's call). Remembered in this browser only.
 */
const HIDE_KEY = 'cid-notes-switch-hidden';
let switchHidden = (() => {
  try {
    return localStorage.getItem(HIDE_KEY) === '1';
  } catch {
    return false;
  }
})();
const hideListeners = new Set<() => void>();

export function setNotesSwitchHidden(v: boolean) {
  switchHidden = v;
  try {
    localStorage.setItem(HIDE_KEY, v ? '1' : '0');
  } catch {
    // Private windows: the choice lasts for the page only.
  }
  hideListeners.forEach((l) => l());
}

export const useNotesSwitchHidden = () =>
  useSyncExternalStore(
    (l) => {
      hideListeners.add(l);
      return () => hideListeners.delete(l);
    },
    () => switchHidden,
  );
