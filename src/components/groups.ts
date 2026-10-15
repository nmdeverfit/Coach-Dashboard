import atRiskIcon from '../assets/figma/group-at-risk.svg';
import needsAttentionIcon from '../assets/figma/group-needs-attention.svg';
import programEndingIcon from '../assets/figma/group-program-ending.svg';
import upcomingBookingsIcon from '../assets/figma/group-upcoming-bookings.svg';
import type { Client, GroupKey } from '../data/types';

export interface GroupMeta {
  key: GroupKey;
  title: string;
  description: string;
  icon: string;
  /** Figma places each status icon's vector inside the 20px frame with these insets. */
  iconInset: string;
  /** Negative inset that lets the vector's stroke bleed past its box, as exported. */
  iconBleed: string;
  /** Only the two lifecycle cards carry row meta; the risk cards carry none (brief, AC4). */
  suffix?: (client: Client) => string;
}

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

export const GROUPS: GroupMeta[] = [
  {
    key: 'at_risk',
    title: 'At risk',
    description: 'Clients who have been slipping for a while. Worth reaching out this week.',
    icon: atRiskIcon,
    iconInset: 'inset-[8.33%_8.33%_8.34%_8.34%]',
    iconBleed: 'inset-[-4.41%]',
  },
  {
    key: 'needs_attention',
    title: 'Needs attention',
    description: 'Clients who have just started slipping. Worth taking a look.',
    icon: needsAttentionIcon,
    iconInset: 'inset-[12.5%]',
    iconBleed: 'inset-[-4.18%]',
  },
  {
    key: 'program_ending',
    title: 'Program ending',
    description: 'Clients whose program ends within the next 7 days.',
    icon: programEndingIcon,
    iconInset: 'inset-[8.33%_12.5%]',
    iconBleed: 'inset-[-3.75%_-4.17%]',
    suffix: (c) => days(c.programEndsInDays ?? 0),
  },
  {
    key: 'upcoming_bookings',
    title: 'Upcoming bookings',
    description: 'Clients with a session in the next few days.',
    icon: upcomingBookingsIcon,
    iconInset: 'inset-[8.32%_12.5%]',
    iconBleed: 'inset-[-3.75%_-4.17%]',
    suffix: (c) => c.nextSession ?? '',
  },
];
