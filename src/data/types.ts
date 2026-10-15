/** Four statuses from the three-layer model (brief: "Four statuses"). */
export type ClientStatus = 'at_risk' | 'needs_attention' | 'on_track' | 'no_activities';

export interface Client {
  id: string;
  name: string;
  firstName: string;
  avatar?: string;
  status: ClientStatus;
  /** Days until the current program ends, when it ends within the next 7 days. */
  programEndsInDays?: number;
  /** Next 1:1 session label, when one is booked in the next few days. */
  nextSession?: string;
}

/**
 * Phase 1 ships six types (checkin, respond, remind, build, prepare, unblock).
 * adjust / congratulate / kudos are Phase 2 titles that the design's mock rows still use.
 */
export type TodoType =
  | 'checkin'
  | 'respond'
  | 'remind'
  | 'build'
  | 'prepare'
  | 'unblock'
  | 'adjust'
  | 'congratulate'
  | 'kudos';

export type TodoState = 'open' | 'completed' | 'dismissed';

export interface Todo {
  id: string;
  clientId: string;
  type: TodoType;
  /** The verb phrase before the client chip, e.g. "Check in with". */
  action: string;
  /** One greyed sentence of why. */
  reason: string;
  /** ISO date (YYYY-MM-DD) of the daily generation that raised it. */
  raisedOn: string;
  state: TodoState;
}

export type HighlightCategory = 'milestone' | 'birthday' | 'anniversary';

export interface Highlight {
  id: string;
  category: HighlightCategory;
  clientName: string;
  /** The rest of the sentence after the client's name. */
  text: string;
  /** Avatar with its catch-up badge, as drawn in the design. */
  image?: string;
}

export type GroupKey = 'at_risk' | 'needs_attention' | 'program_ending' | 'upcoming_bookings';
