import { CalendarClock, CalendarDays, MessageSquareWarning, ScanFace, type LucideIcon } from 'lucide-react';
import type { Client, GroupKey } from '../data/types';

export interface GroupMeta {
  key: GroupKey;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  /** Only the two lifecycle cards carry row meta; the risk cards carry none (brief, AC4). */
  suffix?: (client: Client) => string;
}

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

export const GROUPS: GroupMeta[] = [
  {
    key: 'at_risk',
    title: 'At risk',
    description: 'Clients who have been slipping for a while. Worth reaching out this week.',
    icon: ScanFace,
    iconClass: 'text-danger',
  },
  {
    key: 'needs_attention',
    title: 'Needs attention',
    description: 'Clients who have just started slipping. Worth taking a look.',
    icon: MessageSquareWarning,
    iconClass: 'text-orange',
  },
  {
    key: 'program_ending',
    title: 'Program ending',
    description: 'Clients whose program ends within the next 7 days.',
    icon: CalendarClock,
    iconClass: 'text-warning',
    suffix: (c) => days(c.programEndsInDays ?? 0),
  },
  {
    key: 'upcoming_bookings',
    title: 'Upcoming bookings',
    description: 'Clients with a session in the next few days.',
    icon: CalendarDays,
    iconClass: 'text-brand',
    suffix: (c) => c.nextSession ?? '',
  },
];
