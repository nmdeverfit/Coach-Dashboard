import { useSyncExternalStore } from 'react';

/**
 * Notes timeline trial: which way New note works, picked on the trial bar (`NotesTrialBar`) so the three can be
 * compared on one page (the user's call). Remembered in this browser only.
 * - A: one New note; attaching a transcript file turns it into meeting notes.
 * - B: New note ▾ asks first: Note or Meeting notes.
 * - C: Note | Meeting notes toggle in the popup, which the coach flips.
 * Nothing detects a pasted transcript (the team can't yet, the user's call).
 */
export type NotesVariant = 'A' | 'B' | 'C';

export const NOTES_VARIANTS: { key: NotesVariant; label: string; hint: string }[] = [
  { key: 'A', label: 'A · One button', hint: 'One New note; attaching a transcript file makes it meeting notes' },
  { key: 'B', label: 'B · Choose first', hint: 'New note ▾ asks Note or Meeting notes' },
  { key: 'C', label: 'C · Type toggle', hint: 'Note | Meeting notes in the popup; the coach flips it' },
];

const KEY = 'cid-notes-variant';
const read = (): NotesVariant => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'B' || v === 'C' ? v : 'A';
  } catch {
    return 'A';
  }
};

let current: NotesVariant = read();
const listeners = new Set<() => void>();

export function setNotesVariant(v: NotesVariant) {
  current = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Private windows: the pick lasts for the page only.
  }
  listeners.forEach((l) => l());
}

export const useNotesVariant = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
