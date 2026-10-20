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
  /** Last week's status, when it differs from this week's (feeds the client list's Activity line). */
  lastWeekStatus?: ClientStatus;
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
  /** Phase 2 in the brief, with no drawn panel; the demo trials one (see AcknowledgeDetail). */
  | 'acknowledge'
  | 'congratulate'
  | 'kudos';

export type TodoState = 'open' | 'completed' | 'dismissed';

export interface Todo {
  id: string;
  clientId: string;
  type: TodoType;
  /** The verb phrase before the client chip, e.g. "Check in with". */
  action: string;
  /** Words after the client chip, e.g. "to submit a check-in form" in "Remind {client} to submit a check-in form". */
  actionAfter?: string;
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
  /** A dashboard client's id, or a highlight-only person's (`highlightOnlyClients`). */
  clientId: string;
  clientName: string;
  /** The rest of the sentence after the client's name. */
  text: string;
  /** The day of the moment (reached, birthday, anniversary); the row's timestamp reads from it. */
  on: string;
  image?: string;
}

export type GroupKey = 'at_risk' | 'needs_attention' | 'program_ending' | 'upcoming_bookings';
/** Groups a coach can add to the rail in Customize cards (a trial); each has a client-list tab behind its View all. */
export type ExtraGroupKey = 'form_review' | 'on_track' | 'review_completed' | 'no_activities' | 'paused';
export type CardKey = GroupKey | ExtraGroupKey;
/** Metric cards on the client list: the same nine groups as the rail's cards (one set for both tabs, the user's call). */
export type MetricKey = CardKey;

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

/**
 * One day of a client's training calendar. A date with no entry had nothing assigned: the Check-in session log
 * draws it as a rest day, the Build session log as "Not assigned".
 */
export type TrainingDay =
  | { kind: 'rest' }
  | { kind: 'paused' }
  | { kind: 'workout'; workouts: Workout[] };

/** One workout assigned on a day, and whether the client completed it. */
export interface Workout {
  name: string;
  done: boolean;
}

/** Raw training data for a client. Adherence, last workout and the program card are all computed from it. */
export interface TrainingLog {
  days: Record<string, TrainingDay>;
  program: { name: string; startsOn: string; weeks: number; nextProgram?: string };
}

/** Raw inputs for a Check-in to-do. Status line, assessment and row reason are built from it (AC4). */
export interface CheckinDetail {
  kind: 'checkin';
  /** The main_signal variant that set this to-do. */
  focus: 'nutrition' | 'training';
  nutrition: NutritionLog;
  training: TrainingLog;
  /** Facts from outside the data area that the assessment cites. */
  context: {
    /** Due date of the weekly check-in form when it is overdue (a reason riding along, BL3). */
    checkinFormDueOn?: string;
  };
}

/** One answer on a submitted form. */
export type FormAnswer =
  | { kind: 'scale'; question: string; min: number; max: number; value: number }
  | { kind: 'text'; question: string; answer: string }
  | { kind: 'choice'; question: string; selected: string[] };

/** Raw inputs for a Respond (form review) to-do: the response waiting for the coach. */
export interface RespondDetail {
  kind: 'respond';
  form: string;
  submittedOn: string;
  /** Responses this client has sent to the form so far; Compare response needs 2 or more (Spec 4 AC3.3). */
  responseCount: number;
  answers: FormAnswer[];
}

export type SessionLocation = 'in_person' | 'phone' | 'video';

export interface SessionType {
  name: string;
  /** The session type's colour swatch, set by the coach in Client Sessions. */
  color: string;
  minutes: number;
  location: SessionLocation;
}

/** Credits of one session type, in batches that share an expiry date. A batch without `expiresOn` never expires. */
export interface CreditPool {
  type: SessionType;
  batches: { count: number; expiresOn?: string }[];
}

/** Raw inputs for an Unblock (issue credit) to-do. Balances, the expiring batch and the badge are computed from it. */
export interface UnblockDetail {
  kind: 'unblock';
  credits: CreditPool[];
}

/** One 1:1 booking. `start` is the local start time, 24-hour "HH:MM". */
export interface Booking {
  type: SessionType;
  date: string;
  start: string;
  status: 'booked' | 'completed' | 'late_cancel' | 'early_cancel';
}

/** Raw inputs for a Prepare (booking) to-do: the client's 1:1 bookings, past and upcoming. */
export interface PrepareDetail {
  kind: 'prepare';
  sessions: Booking[];
}

/** Raw inputs for a Build (assign program) to-do. */
export interface BuildDetail {
  kind: 'build';
  training: TrainingLog;
  context: {
    /** Date of the message in which the client asked for a new program (summarised, never quoted: BL4). */
    programRequestedOn?: string;
  };
}

/** One assigned form on the client's Form Status table. */
export interface AssignedForm {
  name: string;
  lastSubmittedOn?: string;
  /** Whether the coach has reviewed the last submission. */
  reviewed: boolean;
  /** Due date of the current period when it has passed without a submission. */
  overdueSince?: string;
}

/** Raw inputs for a Remind (overdue check-in form) to-do. Its Training and Nutrition tabs ride along. */
export interface RemindDetail {
  kind: 'remind';
  forms: AssignedForm[];
  training: TrainingLog;
  nutrition: NutritionLog;
}

/**
 * Raw inputs for an Acknowledge to-do (Phase 2, trialled in the demo). One trigger: the client is back on a calorie
 * goal for several days running after weeks under it. A turnaround, not a Catch-up milestone (those stay in Client
 * highlights, Spec 4 OQ21).
 */
export interface AcknowledgeDetail {
  kind: 'acknowledge';
  nutrition: NutritionLog;
  training: TrainingLog;
  /** The calorie goal set as a surplus over maintenance; the target itself comes from the macro targets. */
  goal: { surplusKcal: number };
}

export type TodoDetail = CheckinDetail | RespondDetail | UnblockDetail | PrepareDetail | BuildDetail | RemindDetail | AcknowledgeDetail;

export type FeedbackState = 'yes' | 'not_quite' | 'hidden';

/** A coach's change of a client's status this week (Not quite → Change Client Status): from the generated one. */
export interface StatusChange {
  from: ClientStatus;
  to: ClientStatus;
  reason: string;
}

/**
 * A task on the client's calendar. Three are derived from other data so they cannot disagree with it (AC4): logging
 * meals (from the food log), the week's workouts (from the training log) and the weekly check-in form (from the
 * client's forms). `custom` tasks carry their own done flag.
 */
export type ClientTask =
  | { kind: 'log_meals'; dueOn: string; time?: string }
  | { kind: 'workouts'; dueOn: string }
  | { kind: 'checkin_form'; dueOn: string }
  | { kind: 'custom'; name: string; dueOn: string; time?: string; done: boolean };

export interface Habit {
  name: string;
  frequency: 'daily' | 'weekly';
  /** Weekly habits: times a week that count as a kept week. */
  perWeek?: number;
  /** Dates (YYYY-MM-DD) the habit was ticked. */
  doneOn: string[];
}

export interface ClientNote {
  /** Unique within the client's notes. */
  id: string;
  title: string;
  /** Local date and time, "YYYY-MM-DDTHH:MM". */
  at: string;
  /** Last edit, same format; absent when the note was never edited. */
  editedAt?: string;
  /** The note's text as the editor writes it: p, b, i, ul, ol and li only (`cleanNoteHtml` in lib/notes.ts). */
  body: string;
}

/**
 * Everything the client detail page and the data tabs read for one client. `focus` is the main_signal that opens
 * first and is tagged in the assessment.
 */
/** One message in the coach–client thread. Only its time and sender are read; the text is never quoted (BL4). */
export interface ClientMessage {
  from: 'coach' | 'client';
  /** "YYYY-MM-DDTHH:MM" */
  at: string;
  /** A check-in message from the coach. */
  checkin?: boolean;
}

export interface ClientProfile {
  focus: 'nutrition' | 'training';
  nutrition: NutritionLog;
  training: TrainingLog;
  forms: AssignedForm[];
  tasks: ClientTask[];
  habits: Habit[];
  notes: ClientNote[];
  messages: ClientMessage[];
}

/** One line of a meeting transcript: who spoke, how far into the call ("04:12"), what was said. */
export interface TranscriptLine {
  from: 'coach' | 'client';
  at: string;
  text: string;
}

/** How the coach brought a transcript in: the demo's recorded lines, pasted text, or an uploaded file. */
export type Transcript =
  | { kind: 'lines'; lines: TranscriptLine[] }
  | { kind: 'text'; text: string }
  | { kind: 'file'; name: string; size: number; /** Read for .txt and .srt; .docx and .pdf are not previewed. */ text?: string };

/** A coach–client meeting on the Transcript tab. */
export interface Meeting {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  /** "HH:MM", 24 h */
  start: string;
  /** Unset when the coach adds the meeting (the form's Duration is hidden for now). */
  minutes?: number;
  timeZone: string;
  link?: string;
  transcript: Transcript;
  /** What the call covered, from the same sections as its transcript; unset for meetings the coach adds. */
  summary?: MeetingSummary;
}

/** The meeting popup's Summary tab: an overview (as the AI Assessment reads), what was discussed, the coach's to-dos. */
export interface MeetingSummary {
  overview: { headline: string; bullets: string[] };
  /** Up to three short takeaways, for the Transcript tab's Latest call card. */
  highlights: string[];
  discuss: string[];
  followUp: string[];
}

/** How closely the coach works with a client, from Add context (the AI Assessment's questionnaire). */
export type CoachingStyle = 'high_touch' | 'low_touch' | 'self_guided';
/** Data a client doesn't log, so Olly shouldn't read its absence as slipping. */
export type UntrackedArea = 'nutrition' | 'tasks_habits';

/** What the coach told Olly about a client in Add context (Figma 5744:519377). */
export interface AiContext {
  style?: CoachingStyle;
  untracked: UntrackedArea[];
  untrackedNote: string;
  /** "Note for the next N weeks": how long the note applies, from the day it was saved. */
  nextWeeks: number;
  nextNote: string;
  /** YYYY-MM-DD */
  savedOn: string;
}
