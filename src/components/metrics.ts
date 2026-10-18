import statAtRisk from '../assets/figma/stat-at-risk.svg';
import statFormReview from '../assets/figma/stat-form-review.svg';
import statNeedsAttention from '../assets/figma/stat-needs-attention.svg';
import statNoActivities from '../assets/figma/stat-no-activities.svg';
import statOnTrack from '../assets/figma/stat-on-track.svg';
import statPaused from '../assets/figma/stat-paused.svg';
import statProgramEnding from '../assets/figma/stat-program-ending.svg';
import statReviewCompleted from '../assets/figma/stat-review-completed.svg';
import upcomingBookingsIcon from '../assets/figma/group-upcoming-bookings.svg';
import type { MetricKey } from '../data/types';
import type { DashboardTab } from '../lib/dashboard';
import { ALL_GROUPS } from './groups';

export interface MetricMeta {
  key: MetricKey;
  /** The tab a click on the card opens. */
  tab: DashboardTab;
  label: string;
  description: string;
  icon: { src: string; inset: string; bleed: string };
}

const group = (key: keyof typeof ALL_GROUPS) => ALL_GROUPS[key].description;

/**
 * Every metric card the client list can show (Figma 5676:145292 for the seven, 5749:521640 for Customize metrics).
 * Keys that are also rail group cards share the card's key, so Customize can say where else a group shows.
 */
export const METRICS: Record<MetricKey, MetricMeta> = {
  at_risk: { key: 'at_risk', tab: 'at_risk', label: 'At risk', description: group('at_risk'), icon: { src: statAtRisk, inset: '8.33% 8.33% 8.34% 8.34%', bleed: '-4.41%' } },
  needs_attention: { key: 'needs_attention', tab: 'needs_attention', label: 'Needs attention', description: group('needs_attention'), icon: { src: statNeedsAttention, inset: '12.5%', bleed: '-4.18%' } },
  on_track: { key: 'on_track', tab: 'on_track', label: 'On track', description: group('on_track'), icon: { src: statOnTrack, inset: '8.33%', bleed: '-4.17%' } },
  no_activities: { key: 'no_activities', tab: 'no_activities', label: 'No activities', description: 'No activity logged this week.', icon: { src: statNoActivities, inset: '0', bleed: '0' } },
  program_ending: { key: 'program_ending', tab: 'program_ending', label: 'Program ending', description: group('program_ending'), icon: { src: statProgramEnding, inset: '8.33% 12.5%', bleed: '-3.75% -4.17%' } },
  form_review: { key: 'form_review', tab: 'form_review', label: 'Form to review', description: group('form_review'), icon: { src: statFormReview, inset: '8.33% 12.5%', bleed: '-3.75% -4.17%' } },
  review_completed: { key: 'review_completed', tab: 'review_completed', label: 'Review completed', description: group('review_completed'), icon: { src: statReviewCompleted, inset: '8.32% 8.33% 8.33% 8.34%', bleed: '-3.75% -3.76% -3.75% -3.75%' } },
  // The popup's "Upcoming booking"; plural to match the rail card it shares a key with.
  upcoming_bookings: { key: 'upcoming_bookings', tab: 'booking', label: 'Upcoming bookings', description: group('upcoming_bookings'), icon: { src: upcomingBookingsIcon, inset: '8.32% 12.5%', bleed: '-3.75% -4.17%' } },
  paused: { key: 'paused', tab: 'paused', label: 'Paused', description: 'Clients whose coaching is paused.', icon: { src: statPaused, inset: '5% 5% 5.01% 5%', bleed: '-3.81%' } },
};

/** The brief's seven cards: the four statuses, then the three workflow cards (Paused keeps its tab only). */
export const DEFAULT_METRICS: MetricKey[] = ['at_risk', 'needs_attention', 'on_track', 'no_activities', 'program_ending', 'form_review', 'review_completed'];
/** Eight still fit one row at 1440 px; past that the labels would truncate. */
export const MAX_METRICS = 8;
/** Library order in Customize. */
export const METRIC_ORDER = Object.keys(METRICS) as MetricKey[];
