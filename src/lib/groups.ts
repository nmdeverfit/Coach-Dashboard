import { getProfile } from '../data/profiles';
import type { CardKey, Client, Todo } from '../data/types';
import { hasFormToReview } from './dashboard';
import { clientsInWeek, groupsInWeek } from './week';

/**
 * Who sits in each rail card for the week on the selector. The brief's four come from `groupsInWeek`; the groups a
 * coach can add use the same rules as their client-list tab, so a card and its View all always agree (AC3).
 */
export function cardMembers(key: CardKey, offset: number, ctx: { todos: Todo[]; reviewed: (clientId: string) => boolean }): Client[] {
  switch (key) {
    case 'at_risk':
    case 'needs_attention':
    case 'program_ending':
    case 'upcoming_bookings':
      return groupsInWeek(offset)[key];
  }
  const list = clientsInWeek(offset);
  switch (key) {
    case 'on_track':
      return list.filter((c) => c.status === 'on_track');
    case 'form_review':
      // Today's queue; a past week's forms were reviewed long since (as on the list's Form to review tab).
      return offset === 0 ? list.filter((c) => hasFormToReview(c, getProfile(c.id), ctx.todos)) : [];
    case 'review_completed':
      return list.filter((c) => ctx.reviewed(c.id));
    case 'no_activities':
      return list.filter((c) => c.status === 'no_activities');
    case 'paused':
      // Nobody in the demo is paused; the list's Paused tab is empty too.
      return [];
  }
}
