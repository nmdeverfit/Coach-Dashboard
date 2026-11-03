import { useSyncExternalStore } from 'react';

/**
 * Notes timeline trial: where a note opens, picked in the Changelog (`ChangeLog`) so the two can be compared on
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
 * Grouped to-dos trial: whether a to-do's panel lists the client's other to-dos (Related to-dos), picked in the
 * Changelog so both can be compared (the user's call). Remembered in this browser only.
 */
export type RelatedOption = 'show' | 'hide';
export const RELATED_OPTIONS: { key: RelatedOption; label: string }[] = [
  { key: 'show', label: 'Show' },
  { key: 'hide', label: 'Hide' },
];
const RELATED_KEY = 'cid-related-todos';
let related: RelatedOption = (() => {
  try {
    return localStorage.getItem(RELATED_KEY) === 'hide' ? 'hide' : 'show';
  } catch {
    return 'show';
  }
})();
const relatedListeners = new Set<() => void>();

export function setRelatedOption(v: RelatedOption) {
  related = v;
  try {
    localStorage.setItem(RELATED_KEY, v);
  } catch {
    // Private windows: the pick lasts for the page only.
  }
  relatedListeners.forEach((l) => l());
}

export const useRelatedOption = () =>
  useSyncExternalStore(
    (l) => {
      relatedListeners.add(l);
      return () => relatedListeners.delete(l);
    },
    () => related,
  );
