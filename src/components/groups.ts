import atRiskIcon from '../assets/figma/group-at-risk.svg';
import needsAttentionIcon from '../assets/figma/group-needs-attention.svg';
import programEndingIcon from '../assets/figma/group-program-ending.svg';
import upcomingBookingsIcon from '../assets/figma/group-upcoming-bookings.svg';
import statFormReview from '../assets/figma/stat-form-review.svg';
import statNoActivities from '../assets/figma/stat-no-activities.svg';
import statOnTrack from '../assets/figma/stat-on-track.svg';
import statPaused from '../assets/figma/stat-paused.svg';
import statReviewCompleted from '../assets/figma/stat-review-completed.svg';
import type { CardKey, Client, GroupKey } from '../data/types';
import type { DashboardTab } from '../lib/dashboard';

export interface GroupMeta {
  key: CardKey;
  /** The client-list tab its View all opens. */
  tab: DashboardTab;
  title: string;
  description: string;
  icon: string;
  /** Figma places each status icon's vector inside the 20px frame with these insets. */
  iconInset: string;
  /** Negative inset that lets the vector's stroke bleed past its box, as exported. */
  iconBleed: string;
  /** Only the lifecycle cards carry row meta; the risk cards carry none (brief, AC4). */
  suffix?: (client: Client) => string;
}

const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** The brief's four cards, in its order (the default rail). */
export const GROUPS: (GroupMeta & { key: GroupKey })[] = [
  {
    key: 'at_risk',
    tab: 'at_risk',
    title: 'At risk',
    description: 'Clients who have been slipping for a while. Worth reaching out.',
    icon: atRiskIcon,
    iconInset: 'inset-[8.33%_8.33%_8.34%_8.34%]',
    iconBleed: 'inset-[-4.41%]',
  },
  {
    key: 'needs_attention',
    tab: 'needs_attention',
    title: 'Needs attention',
    description: 'Clients who have just started slipping. Worth taking a look.',
    icon: needsAttentionIcon,
    iconInset: 'inset-[12.5%]',
    iconBleed: 'inset-[-4.18%]',
  },
  {
    key: 'program_ending',
    tab: 'program_ending',
    title: 'Program ending',
    description: 'Clients whose program ends within the next 7 days.',
    icon: programEndingIcon,
    iconInset: 'inset-[8.33%_12.5%]',
    iconBleed: 'inset-[-3.75%_-4.17%]',
    suffix: (c) => days(c.programEndsInDays ?? 0),
  },
  {
    key: 'upcoming_bookings',
    tab: 'booking',
    title: 'Upcoming bookings',
    description: 'Sessions booked for the next few days, 1:1 and group.',
    icon: upcomingBookingsIcon,
    iconInset: 'inset-[8.32%_12.5%]',
    iconBleed: 'inset-[-3.75%_-4.17%]',
    suffix: (c) => c.nextSession ?? '',
  },
];

/**
 * Groups a coach can add in Customize cards (a trial): only ones with a client-list tab, so View all
 * always lands somewhere and the counts come from the same source (AC3). None carries row meta.
 */
export const EXTRA_GROUPS: GroupMeta[] = [
  {
    key: 'form_review',
    tab: 'form_review',
    title: 'Form to review',
    description: 'Check-in forms submitted and waiting on your review.',
    icon: statFormReview,
    iconInset: 'inset-[8.33%_12.5%]',
    iconBleed: 'inset-[-3.75%_-4.17%]',
  },
  {
    key: 'on_track',
    tab: 'on_track',
    title: 'On track',
    description: 'Clients keeping up with their plan. Worth a quick well done.',
    icon: statOnTrack,
    iconInset: 'inset-[8.33%]',
    iconBleed: 'inset-[-4.17%]',
  },
  {
    key: 'review_completed',
    tab: 'review_completed',
    title: 'Review completed',
    description: 'Clients you have reviewed this week.',
    icon: statReviewCompleted,
    iconInset: 'inset-[8.32%_8.33%_8.33%_8.34%]',
    iconBleed: 'inset-[-3.75%_-3.76%_-3.75%_-3.75%]',
  },
  // The brief gives these two no group card; Customize offers them on both tabs (the user's call).
  {
    key: 'no_activities',
    tab: 'no_activities',
    title: 'No activities',
    description: 'No activity logged this week.',
    icon: statNoActivities,
    iconInset: 'inset-0',
    iconBleed: 'inset-0',
  },
  {
    key: 'paused',
    tab: 'paused',
    title: 'Paused',
    description: 'Clients whose coaching is paused.',
    icon: statPaused,
    iconInset: 'inset-[5%_5%_5.01%_5%]',
    iconBleed: 'inset-[-3.81%]',
  },
];

export const ALL_GROUPS: Record<CardKey, GroupMeta> = Object.fromEntries([...GROUPS, ...EXTRA_GROUPS].map((g) => [g.key, g])) as Record<
  CardKey,
  GroupMeta
>;

export const DEFAULT_ORDER: CardKey[] = GROUPS.map((g) => g.key);
/** The same limit on both tabs: eight metric cards still fit one row at 1440 px (the rail takes four rows). */
export const MAX_CARDS = 8;
