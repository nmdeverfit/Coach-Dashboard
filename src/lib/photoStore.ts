import { useMemo, useSyncExternalStore } from 'react';
import { progressPhotos, type ProgressPhoto } from '../data/bodyMetrics';

/**
 * Progress photos the coach uploads in the demo (Upload Progress Photo, the user's call): kept for the session only,
 * merged with the client's own set, newest day first (an upload goes before a photo of the same day).
 */
const added: Record<string, ProgressPhoto[]> = {};
let version = 0;
const listeners = new Set<() => void>();

export function addPhotos(clientId: string, photos: ProgressPhoto[]) {
  added[clientId] = [...photos, ...(added[clientId] ?? [])];
  version++;
  listeners.forEach((l) => l());
}

export function usePhotos(clientId: string): ProgressPhoto[] {
  const v = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
  return useMemo(() => {
    const mine = added[clientId] ?? [];
    return [...mine, ...progressPhotos(clientId)].sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, v]);
}
