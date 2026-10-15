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
  image?: string;
}

export type GroupKey = 'at_risk' | 'needs_attention' | 'program_ending' | 'upcoming_bookings';

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface LoggedFood {
  name: string;
  calories: number;
}

export interface MealWeek {
  /** Monday of the week, YYYY-MM-DD. */
  start: string;
  isCurrent?: boolean;
  /** Meals logged per day, Monday first; null marks a day that has not happened yet. */
  meals: Record<MealKey, (number | null)[]>;
}

export interface NutritionDetail {
  calories: { value: number; target: number };
  macros: { key: 'carb' | 'fat' | 'protein'; label: string; value: number; target: number }[];
  weeks: MealWeek[];
  /** Foods shown in a cell's tooltip, keyed by `${weekStart}:${meal}:${dayIndex}`. */
  foods: Record<string, LoggedFood[]>;
  mealsThisWeek: number;
  avgCalories: number;
}

/** One computed payload per client-day (AC4): the row's reason, the assessment and the data area all read from it. */
export interface CheckinDetail {
  kind: 'checkin';
  /** The main_signal variant that set this to-do. */
  focus: 'nutrition' | 'training';
  /** One-line status explanation beside the status label. */
  statusLine: string;
  assessment: {
    /** Headline split around the highlighted signal word. */
    headline: { before: string; signal: string; after: string };
    bullets: string[];
  };
  nutrition: NutritionDetail;
}

export type TodoDetail = CheckinDetail;

export type FeedbackState = 'yes' | 'not_quite' | 'hidden';
