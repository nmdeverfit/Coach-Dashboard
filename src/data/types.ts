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
export type MacroKey = 'carb' | 'fat' | 'protein';

/** One logged food. Calories are derived from the macros (4/9/4 kcal per gram) so the two never disagree. */
export interface FoodEntry {
  name: string;
  carb: number;
  fat: number;
  protein: number;
}

/** Raw nutrition data for a client. Every figure the panel shows is computed from this. */
export interface NutritionLog {
  /** Daily macro targets in grams; the calorie target is derived from them. */
  targets: Record<MacroKey, number>;
  /** Foods logged per day (YYYY-MM-DD) and meal. A missing day logged nothing. */
  days: Record<string, Partial<Record<MealKey, FoodEntry[]>>>;
}

/** Raw inputs for a Check-in to-do. Status line, assessment and row reason are built from it (AC4). */
export interface CheckinDetail {
  kind: 'checkin';
  /** The main_signal variant that set this to-do. */
  focus: 'nutrition' | 'training';
  nutrition: NutritionLog;
  /** Facts from outside the data area that the assessment cites. */
  context: {
    /** Due date of the weekly check-in form when it is overdue. */
    checkinFormDueOn?: string;
    /** A coach note, summarised (never quoted). */
    note?: { on: string; summary: string };
  };
}

export type TodoDetail = CheckinDetail;

export type FeedbackState = 'yes' | 'not_quite' | 'hidden';
