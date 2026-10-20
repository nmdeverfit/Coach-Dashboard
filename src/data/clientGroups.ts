import { clients } from './mock';

/**
 * The coach's client groups (Everfit's Client Groups, as in the client list's "Group" filter). The demo invents four
 * and puts every dashboard client in one, from a hash of their id, so membership is the same on every load.
 */
export interface ClientGroup {
  id: string;
  name: string;
  members: string[];
}

const GROUPS = [
  { id: 'online', name: 'Online coaching', share: 4 },
  { id: 'in_person', name: 'In-person PT', share: 3 },
  { id: 'hybrid', name: 'Hybrid', share: 2 },
  { id: 'comp_prep', name: 'Competition prep', share: 1 },
];

function slot(id: string) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % GROUPS.reduce((n, g) => n + g.share, 0);
}

function groupIndex(id: string) {
  let s = slot(id);
  return GROUPS.findIndex((g) => (s -= g.share) < 0);
}

export const clientGroups: ClientGroup[] = GROUPS.map((g, i) => ({
  id: g.id,
  name: g.name,
  members: clients.filter((c) => groupIndex(c.id) === i).map((c) => c.id),
}));
