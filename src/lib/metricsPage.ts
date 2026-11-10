import { useSyncExternalStore } from 'react';

/**
 * The client's Metrics page (Metrics & Photos trial, the user's call): "View all metrics" on the tab opens it in the
 * page's place, the way Everfit's client profile shows All Metrics. Session only; the Check-in Dashboard nav item
 * brings the dashboard back.
 */
let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function openMetricsPage(clientId: string) {
  current = clientId;
  emit();
}

export function closeMetricsPage() {
  if (current === null) return;
  current = null;
  emit();
}

export const useMetricsPage = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
