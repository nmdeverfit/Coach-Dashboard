import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { DEMO_TODAY, clients, findPerson, generatedStatus, setEffectiveStatus, todos as seedTodos } from '../data/mock';
import type { AiContext, CardKey, Client, ClientNote, ClientStatus, FeedbackState, GroupKey, Meeting, MetricKey, StatusChange, Todo } from '../data/types';
import { ALL_GROUPS, DEFAULT_ORDER } from '../components/groups';
import { STATUS_LABEL } from '../components/StatusChip';
import { DEFAULT_METRICS, METRICS } from '../components/metrics';
import type { Assessment } from '../lib/checkin';
import type { ClientTabKey } from '../components/drawer/ClientTabs';
import type { DashboardTab } from '../lib/dashboard';
import { MIN_WEEK_OFFSET, seededReview } from '../lib/week';

export type View = 'brief' | 'dashboard';

/** The middle column beside the panel (Spec 4 AC2.2, AC2.3): Olly and the inbox, tabbed when both are open. */
export type SideTab = 'inbox' | 'olly';
export interface OllyRequest {
  /** Tell me more, Draft with AI, or Deep analysis from the Training tab of the client detail page. */
  mode: 'tell' | 'draft' | 'training';
  /** Tell me more: the assessment on screen, which the answer repeats (one payload, AC4). */
  assessment?: Assessment;
  /** Draft with AI: the to-do whose context scopes the draft. */
  todoId?: string;
  /** Draft with AI from a Client highlight row: the highlight the note is about. */
  highlightId?: string;
  /** Bumped on every request, so asking again starts a fresh conversation. */
  seq: number;
}
export interface SidePanelState {
  clientId: string;
  inbox: boolean;
  olly: OllyRequest | null;
  active: SideTab;
  /** Opened from a Client highlight: sending from either tab completes that highlight. */
  highlightId?: string;
}
/** What became of a Client highlight this session; `seq` orders History, newest first. */
export interface HighlightOutcome {
  status: 'completed' | 'dismissed';
  seq: number;
  /** Clear all in History: gone from both views for good. */
  cleared?: boolean;
}
export interface SentMessage {
  text: string;
  at: string;
}

interface State {
  todos: Todo[];
  view: View;
  /** 0 is the current week; the week selector always opens here. */
  weekOffset: number;
  /** The client list's open tab; a group card's "View all" lands on its own. */
  dashboardTab: DashboardTab;
  toast: string | null;
  /** Bumped on every toast, so a new message replays the slide-in. */
  toastSeq: number;
  /** The to-do whose panel is open. */
  selectedTodoId: string | null;
  /** The client whose detail panel is open (from a group card). Only one panel is open at a time. */
  selectedClientId: string | null;
  /** A group session's details panel (Upcoming bookings), by occurrence id. One panel at a time. */
  selectedSessionId: string | null;
  /** The tab the client detail page opens on, when the coach came from a list that implies one (the Booking tab). */
  selectedClientTab: ClientTabKey | null;
  /** Clients reviewed this week. A Check-in review is one action on both views (brief, S3 BL5). */
  reviewed: Record<string, boolean>;
  /** Reviews the coach changed on past weeks, by week offset (the rest come from `seededReview`). */
  pastReviewed: Record<number, Record<string, boolean>>;
  /** Olly and the inbox, beside the open panel. */
  side: SidePanelState | null;
  /** Messages the coach sent in this session, by client. Sending never completes a to-do (AC2.2). */
  sent: Record<string, SentMessage[]>;
  /** Client highlights the coach messaged (completed) or dismissed, by highlight id. The rest need attention. */
  highlightLog: Record<string, HighlightOutcome>;
  /** Answer to "Does '{status}' look right for {first_name}?" per client. */
  feedback: Record<string, FeedbackState>;
  /** Statuses the coach changed this week, by client. The client's `status` already reads the new one (AC3). */
  statusChanges: Record<string, StatusChange>;
  /** Meetings the coach added on the Transcript tab in this session, by client. */
  meetings: Record<string, Meeting[]>;
  /** A client's notes once the coach has added, edited or deleted one in this session; else the profile's. */
  notes: Record<string, ClientNote[]>;
  /** What the coach told Olly about each client through Add context on the AI Assessment. */
  aiContext: Record<string, AiContext>;
  /** The rail's group cards, as the coach customized them (Customize cards, a trial). */
  rail: RailLayout;
  /** The client list's metric cards, in order (Customize cards, a trial). */
  metrics: MetricKey[];
  /** The Customize cards popup, open on its Today's Brief or Dashboard tab. */
  customize: CustomizeTab | null;
}

export type CustomizeTab = 'brief' | 'dashboard';

/** Which group cards the rail shows, in what order, and which are collapsed to their header. */
export interface RailLayout {
  order: CardKey[];
  collapsed: CardKey[];
}

export const DEFAULT_RAIL: RailLayout = { order: DEFAULT_ORDER, collapsed: [] };
const RAIL_KEY = 'cid-demo-rail';

/** The coach's layout survives a reload in this browser; storage may be blocked, so every access is guarded. */
function loadRail(): RailLayout {
  try {
    const saved = JSON.parse(window.localStorage.getItem(RAIL_KEY) ?? 'null') as RailLayout | null;
    if (saved && Array.isArray(saved.order) && saved.order.every((k) => k in ALL_GROUPS)) {
      return { order: saved.order, collapsed: (saved.collapsed ?? []).filter((k) => saved.order.includes(k)) };
    }
  } catch {
    // Private window or blocked storage: start from the default.
  }
  return DEFAULT_RAIL;
}

function saveRail(rail: RailLayout) {
  try {
    window.localStorage.setItem(RAIL_KEY, JSON.stringify(rail));
  } catch {
    // Not persisted; the layout still holds for this session.
  }
}

const METRICS_KEY = 'cid-demo-metrics';

function loadMetrics(): MetricKey[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(METRICS_KEY) ?? 'null') as MetricKey[] | null;
    if (Array.isArray(saved) && saved.length > 0 && saved.every((k) => k in METRICS)) return saved;
  } catch {
    // Private window or blocked storage: start from the default.
  }
  return DEFAULT_METRICS;
}

function saveMetrics(metrics: MetricKey[]) {
  try {
    window.localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  } catch {
    // Not persisted; the row still holds for this session.
  }
}

type Action =
  | { type: 'toggleComplete'; id: string }
  | { type: 'dismiss'; id: string }
  | { type: 'dismissAllPrevious' }
  | { type: 'setView'; view: View }
  | { type: 'shiftWeek'; by: number }
  | { type: 'resetWeek' }
  | { type: 'openGroup'; group: CardKey | null }
  | { type: 'setRail'; rail: RailLayout }
  | { type: 'setMetrics'; metrics: MetricKey[] }
  | { type: 'customize'; tab: CustomizeTab | null }
  | { type: 'toggleCollapsed'; key: CardKey }
  | { type: 'toast'; message: string | null }
  | { type: 'select'; id: string | null }
  | { type: 'selectClient'; id: string | null; tab?: ClientTabKey }
  | { type: 'selectSession'; id: string | null }
  | { type: 'reviewClient'; clientId: string }
  | { type: 'toggleReview'; clientId: string; offset: number }
  | { type: 'setDashboardTab'; tab: DashboardTab }
  | { type: 'markReviewed'; clientId: string }
  | { type: 'completeFromPanel'; id: string }
  | { type: 'feedback'; clientId: string; value: FeedbackState }
  | { type: 'changeStatus'; clientId: string; change: StatusChange | null }
  | { type: 'openOlly'; clientId: string; request: Omit<OllyRequest, 'seq'> }
  | { type: 'openInbox'; clientId: string; highlightId?: string }
  | { type: 'sideTab'; tab: SideTab }
  | { type: 'closeSideTab'; tab: SideTab }
  | { type: 'closeSide' }
  | { type: 'sendMessage'; clientId: string; text: string; highlightId?: string }
  | { type: 'dismissHighlight'; id: string }
  | { type: 'restoreHighlight'; id: string }
  | { type: 'clearHighlightHistory' }
  | { type: 'addMeeting'; clientId: string; meeting: Meeting }
  | { type: 'setNotes'; clientId: string; notes: ClientNote[] }
  | { type: 'setAiContext'; clientId: string; context: AiContext | null };

const initialState: State = {
  todos: seedTodos,
  view: 'brief',
  weekOffset: 0,
  dashboardTab: 'all',
  toast: null,
  toastSeq: 0,
  selectedTodoId: null,
  selectedClientId: null,
  selectedSessionId: null,
  selectedClientTab: null,
  reviewed: {},
  pastReviewed: {},
  side: null,
  sent: {},
  highlightLog: {},
  feedback: {},
  statusChanges: {},
  meetings: {},
  notes: {},
  aiContext: {},
  rail: loadRail(),
  metrics: loadMetrics(),
  customize: null,
};

const isPrevious = (t: Todo) => t.raisedOn < DEMO_TODAY;

const todoClient = (state: State) => state.todos.find((t) => t.id === state.selectedTodoId)?.clientId ?? null;

/**
 * Opened from a Client highlight on the brief, or from a row on the client list (Dashboard view), with no client panel
 * beside it, the middle column is a sidebar (the user's call): it takes 360 px of the page, which reflows beside it,
 * instead of floating over it.
 */
export const sideIsSidebar = (state: State) => {
  if (!state.side) return false;
  const fromList = state.view === 'dashboard';
  const fromHighlight = state.view === 'brief' && Boolean(state.side.highlightId);
  if (!fromList && !fromHighlight) return false;
  const panel = state.selectedTodoId ? todoClient(state) : state.selectedClientId;
  return panel !== state.side.clientId;
};

/** The middle column belongs to one client's panel: it closes with the panel or when another client opens. */
const keepSide = (side: SidePanelState | null, clientId: string | null) => (side && side.clientId === clientId ? side : null);

/** Reviewed in the week `offset` weeks from this one (0 = this week, the only one tied to to-dos). */
export function isReviewed(state: Pick<State, 'reviewed' | 'pastReviewed'>, clientId: string, offset: number): boolean {
  if (offset === 0) return Boolean(state.reviewed[clientId]);
  return state.pastReviewed[offset]?.[clientId] ?? seededReview(clientId, offset);
}


function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'toggleComplete': {
      const todo = state.todos.find((t) => t.id === action.id);
      const completing = todo?.state !== 'completed';
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, state: completing ? 'completed' : 'open' } : t)),
        // Ticking a Check-in row is the review; unticking it takes the review back.
        reviewed: todo?.type === 'checkin' ? { ...state.reviewed, [todo.clientId]: completing } : state.reviewed,
      };
    }
    case 'dismiss':
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, state: 'dismissed' } : t)),
        selectedTodoId: state.selectedTodoId === action.id ? null : state.selectedTodoId,
        side: state.selectedTodoId === action.id ? null : state.side,
      };
    case 'dismissAllPrevious': {
      const selected = state.todos.find((t) => t.id === state.selectedTodoId);
      return {
        ...state,
        todos: state.todos.map((t) => (isPrevious(t) ? { ...t, state: 'dismissed' } : t)),
        selectedTodoId: selected && isPrevious(selected) ? null : state.selectedTodoId,
      };
    }
    case 'setView':
      return {
        ...state,
        view: action.view,
        // The header toggle opens the list on All clients; the brief keeps nothing to reset, so the list sliding
        // out does not change under the coach's eyes.
        dashboardTab: action.view === 'dashboard' && state.view !== 'dashboard' ? 'all' : state.dashboardTab,
        selectedTodoId: action.view === 'brief' ? state.selectedTodoId : null,
        selectedClientId: action.view === 'brief' ? state.selectedClientId : null,
        selectedSessionId: action.view === 'brief' ? state.selectedSessionId : null,
        side: action.view === 'brief' ? state.side : null,
      };
    case 'shiftWeek': {
      const weekOffset = Math.max(MIN_WEEK_OFFSET, Math.min(0, state.weekOffset + action.by));
      // To-dos exist on the current week only, so their panel closes when the coach looks back.
      const closing = weekOffset !== 0 && state.selectedTodoId !== null;
      // A group session's panel shows one week's occurrence, so it closes too.
      return { ...state, weekOffset, selectedTodoId: closing ? null : state.selectedTodoId, selectedSessionId: null, side: closing ? null : state.side };
    }
    case 'resetWeek':
      return { ...state, weekOffset: 0 };
    case 'openGroup':
      return { ...state, view: 'dashboard', dashboardTab: action.group ? ALL_GROUPS[action.group].tab : 'all', selectedClientId: null, selectedTodoId: null, selectedSessionId: null, side: null };
    case 'setRail':
      return { ...state, rail: action.rail };
    case 'setMetrics':
      return { ...state, metrics: action.metrics };
    case 'customize':
      return { ...state, customize: action.tab };
    case 'toggleCollapsed': {
      const { collapsed } = state.rail;
      const next = collapsed.includes(action.key) ? collapsed.filter((k) => k !== action.key) : [...collapsed, action.key];
      return { ...state, rail: { ...state.rail, collapsed: next } };
    }
    case 'setDashboardTab':
      return { ...state, dashboardTab: action.tab };
    case 'toast':
      return { ...state, toast: action.message, toastSeq: action.message ? state.toastSeq + 1 : state.toastSeq };
    case 'select': {
      const clientId = action.id ? state.todos.find((t) => t.id === action.id)?.clientId ?? null : null;
      return {
        ...state,
        selectedTodoId: action.id,
        selectedClientId: action.id ? null : state.selectedClientId,
        selectedSessionId: action.id ? null : state.selectedSessionId,
        side: keepSide(state.side, action.id ? clientId : state.selectedClientId),
      };
    }
    case 'selectClient':
      return {
        ...state,
        selectedClientId: action.id,
        selectedClientTab: action.tab ?? null,
        selectedTodoId: action.id ? null : state.selectedTodoId,
        selectedSessionId: action.id ? null : state.selectedSessionId,
        side: keepSide(state.side, action.id ?? (state.selectedTodoId ? todoClient(state) : null)),
      };
    case 'selectSession':
      return action.id
        ? { ...state, selectedSessionId: action.id, selectedClientId: null, selectedTodoId: null, side: null }
        : { ...state, selectedSessionId: null };
    case 'openOlly':
    case 'openInbox': {
      const prev = state.side?.clientId === action.clientId ? state.side : null;
      const side: SidePanelState =
        action.type === 'openOlly'
          ? {
              clientId: action.clientId,
              inbox: prev?.inbox ?? false,
              olly: { ...action.request, seq: (prev?.olly?.seq ?? 0) + 1 },
              active: 'olly',
              // Only Draft with AI from a highlight scopes it; Olly from anywhere else does not.
              highlightId: action.request.highlightId,
            }
          : { clientId: action.clientId, inbox: true, olly: prev?.olly ?? null, active: 'inbox', highlightId: action.highlightId ?? prev?.highlightId };
      // Beside the client's open panel it docks to it. From a list row it opens on its own, at the right edge, and
      // does not open the client detail page (the user's call); another client's panel closes.
      const shown = state.selectedTodoId ? todoClient(state) : state.selectedClientId;
      return shown === action.clientId ? { ...state, side } : { ...state, side, selectedClientId: null, selectedTodoId: null };
    }
    case 'sideTab':
      return state.side ? { ...state, side: { ...state.side, active: action.tab } } : state;
    case 'closeSideTab': {
      if (!state.side) return state;
      const next = { ...state.side, inbox: action.tab === 'inbox' ? false : state.side.inbox, olly: action.tab === 'olly' ? null : state.side.olly };
      if (!next.inbox && !next.olly) return { ...state, side: null };
      return { ...state, side: { ...next, active: next.inbox ? (next.olly ? next.active : 'inbox') : 'olly' } };
    }
    case 'closeSide':
      return { ...state, side: null };
    case 'sendMessage': {
      const sent = { ...state.sent, [action.clientId]: [...(state.sent[action.clientId] ?? []), { text: action.text, at: `${DEMO_TODAY}T06:00` }] };
      // A message sent from a highlight's Draft with AI or Send message completes it (moves it to History).
      const done = action.highlightId && state.highlightLog[action.highlightId]?.status !== 'completed';
      return done ? { ...state, sent, highlightLog: logHighlight(state.highlightLog, action.highlightId!, 'completed') } : { ...state, sent };
    }
    case 'dismissHighlight':
      return { ...state, highlightLog: logHighlight(state.highlightLog, action.id, 'dismissed') };
    case 'clearHighlightHistory':
      return { ...state, highlightLog: Object.fromEntries(Object.entries(state.highlightLog).map(([id, o]) => [id, { ...o, cleared: true }])) };
    case 'restoreHighlight': {
      const { [action.id]: _gone, ...rest } = state.highlightLog;
      return { ...state, highlightLog: rest };
    }
    case 'setAiContext': {
      const { [action.clientId]: _old, ...rest } = state.aiContext;
      return { ...state, aiContext: action.context ? { ...rest, [action.clientId]: action.context } : rest };
    }
    case 'addMeeting':
      return { ...state, meetings: { ...state.meetings, [action.clientId]: [action.meeting, ...(state.meetings[action.clientId] ?? [])] } };
    case 'setNotes':
      return { ...state, notes: { ...state.notes, [action.clientId]: action.notes } };
    case 'reviewClient':
      // A review from the client detail page completes the client's Check-in to-dos too; the panel stays open.
      return {
        ...state,
        reviewed: { ...state.reviewed, [action.clientId]: true },
        todos: state.todos.map((t) =>
          t.clientId === action.clientId && t.type === 'checkin' && t.state === 'open' ? { ...t, state: 'completed' } : t,
        ),
      };
    case 'toggleReview': {
      // A past week's review is that week's record only; to-dos exist on the current week alone.
      if (action.offset !== 0) {
        const week = state.pastReviewed[action.offset] ?? {};
        return {
          ...state,
          pastReviewed: { ...state.pastReviewed, [action.offset]: { ...week, [action.clientId]: !isReviewed(state, action.clientId, action.offset) } },
        };
      }
      // The client list's ✓ toggles the week's review; undoing it reopens the Check-in to-dos it completed.
      const reviewing = !state.reviewed[action.clientId];
      return {
        ...state,
        reviewed: { ...state.reviewed, [action.clientId]: reviewing },
        todos: state.todos.map((t) =>
          t.clientId === action.clientId && t.type === 'checkin' && t.state === (reviewing ? 'open' : 'completed')
            ? { ...t, state: reviewing ? 'completed' : 'open' }
            : t,
        ),
      };
    }
    case 'markReviewed':
      // Review is per client: it completes every Check-in to-do raised for that client (S3 BL5).
      // The panel closes and the coach lands back on the list (Spec 4 AC2.5).
      return {
        ...state,
        reviewed: { ...state.reviewed, [action.clientId]: true },
        todos: state.todos.map((t) =>
          t.clientId === action.clientId && t.type === 'checkin' && t.state === 'open' ? { ...t, state: 'completed' } : t,
        ),
        selectedTodoId: null,
        side: null,
      };
    case 'completeFromPanel':
      // The panel's ✓ is the same write as the row checkbox, and closes the panel on every type (Spec 4 AC1.9).
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, state: 'completed' } : t)),
        selectedTodoId: null,
        side: null,
      };
    case 'feedback':
      return { ...state, feedback: { ...state.feedback, [action.clientId]: action.value } };
    case 'changeStatus': {
      const { [action.clientId]: _, ...rest } = state.statusChanges;
      return {
        ...state,
        statusChanges: action.change ? { ...rest, [action.clientId]: action.change } : rest,
        feedback: { ...state.feedback, [action.clientId]: 'not_quite' },
      };
    }
  }
}

const logHighlight = (log: Record<string, HighlightOutcome>, id: string, status: HighlightOutcome['status']) => ({
  ...log,
  [id]: { status, seq: Math.max(0, ...Object.values(log).map((o) => o.seq)) + 1 },
});

// Highlight-only people resolve too, for the middle column (Draft with AI, Send message from a highlight).
export const getClient = (id: string): Client => {
  const client = findPerson(id);
  if (!client) throw new Error(`Unknown client ${id}`);
  return client;
};

/** Group membership is derived from client status, the single source of truth (AC3). */
export const groupClients: Record<GroupKey, Client[]> = {
  at_risk: clients.filter((c) => c.status === 'at_risk'),
  needs_attention: clients.filter((c) => c.status === 'needs_attention'),
  program_ending: clients
    .filter((c) => c.programEndsInDays !== undefined)
    .sort((a, b) => a.programEndsInDays! - b.programEndsInDays!),
  upcoming_bookings: clients.filter((c) => c.nextSession !== undefined),
};

interface Store {
  state: State;
  suggested: Todo[];
  previous: Todo[];
  openSuggestedCount: number;
  toggleComplete: (id: string) => void;
  dismiss: (id: string) => void;
  dismissAllPrevious: () => void;
  setView: (view: View) => void;
  shiftWeek: (by: number) => void;
  resetWeek: () => void;
  /** Opens the client list filtered to a group; null clears the filter. */
  openGroup: (group: CardKey | null) => void;
  setRail: (rail: RailLayout) => void;
  setMetrics: (metrics: MetricKey[]) => void;
  /** Opens Customize cards on a tab; null closes it. */
  openCustomize: (tab: CustomizeTab | null) => void;
  toggleCollapsed: (key: CardKey) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  selectTodo: (id: string | null) => void;
  /** Opens the client detail page, optionally on a given tab. */
  selectClient: (id: string | null, tab?: ClientTabKey) => void;
  /** Opens a group session's details panel; null closes it. */
  selectSession: (id: string | null) => void;
  /** Mark as reviewed from the client detail page. */
  reviewClient: (clientId: string) => void;
  /** The client list's ✓: marks the client reviewed, or takes the review back. */
  toggleReview: (clientId: string) => void;
  /** Whether the client was reviewed in the selected week. */
  reviewedNow: (clientId: string) => boolean;
  setDashboardTab: (tab: DashboardTab) => void;
  markReviewed: (clientId: string) => void;
  completeFromPanel: (id: string) => void;
  setFeedback: (clientId: string, value: FeedbackState) => void;
  /** Update Status in Change Client Status: the new status everywhere this week, with the coach's reason. */
  changeStatus: (clientId: string, to: ClientStatus, reason: string) => void;
  /** Tell me more or Draft with AI, beside the panel. */
  openOlly: (clientId: string, request: Omit<OllyRequest, 'seq'>) => void;
  /** Send message: the inbox with this client, beside the panel. */
  openInbox: (clientId: string, highlightId?: string) => void;
  setSideTab: (tab: SideTab) => void;
  closeSideTab: (tab: SideTab) => void;
  closeSide: () => void;
  sendMessage: (clientId: string, text: string, highlightId?: string) => void;
  dismissHighlight: (id: string) => void;
  /** Takes a dismissed highlight out of History, back to Need attention. */
  restoreHighlight: (id: string) => void;
  /** Empties History; cleared highlights do not come back to Need attention. */
  clearHighlightHistory: () => void;
  addMeeting: (clientId: string, meeting: Meeting) => void;
  /** Replaces the client's notes (after an add, edit or delete) and confirms it with `toast`. */
  setNotes: (clientId: string, notes: ClientNote[], toast: string) => void;
  /** Saves (or, with null, clears) the coach's context for a client's AI Assessment. */
  setAiContext: (clientId: string, context: AiContext | null) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toastTimer = useRef<number>();

  const showToast = useCallback((message: string) => {
    dispatch({ type: 'toast', message });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => dispatch({ type: 'toast', message: null }), 3000);
  }, []);

  const store = useMemo<Store>(() => {
    const visible = state.todos.filter((t) => t.state !== 'dismissed');
    const suggested = visible.filter((t) => !isPrevious(t));
    const previous = visible.filter(isPrevious).sort((a, b) => b.raisedOn.localeCompare(a.raisedOn));
    return {
      state,
      suggested,
      previous,
      openSuggestedCount: suggested.filter((t) => t.state === 'open').length,
      toggleComplete: (id) => {
        const done = state.todos.find((t) => t.id === id)?.state === 'completed';
        dispatch({ type: 'toggleComplete', id });
        showToast(done ? 'To-do has been reopened' : 'To-do has been completed');
      },
      dismiss: (id) => {
        dispatch({ type: 'dismiss', id });
        showToast('To-do has been dismissed');
      },
      dismissAllPrevious: () => {
        dispatch({ type: 'dismissAllPrevious' });
        showToast('Previous to-dos dismissed');
      },
      setView: (view) => dispatch({ type: 'setView', view }),
      shiftWeek: (by) => dispatch({ type: 'shiftWeek', by }),
      resetWeek: () => dispatch({ type: 'resetWeek' }),
      openGroup: (group) => dispatch({ type: 'openGroup', group }),
      setRail: (rail) => {
        saveRail(rail);
        dispatch({ type: 'setRail', rail });
      },
      setMetrics: (metrics) => {
        saveMetrics(metrics);
        dispatch({ type: 'setMetrics', metrics });
      },
      openCustomize: (tab) => dispatch({ type: 'customize', tab }),
      toggleCollapsed: (key) => {
        const { order, collapsed } = state.rail;
        saveRail({ order, collapsed: collapsed.includes(key) ? collapsed.filter((k) => k !== key) : [...collapsed, key] });
        dispatch({ type: 'toggleCollapsed', key });
      },
      showToast,
      hideToast: () => {
        window.clearTimeout(toastTimer.current);
        dispatch({ type: 'toast', message: null });
      },
      selectTodo: (id) => dispatch({ type: 'select', id }),
      selectClient: (id, tab) => dispatch({ type: 'selectClient', id, tab }),
      selectSession: (id) => dispatch({ type: 'selectSession', id }),
      reviewClient: (clientId) => {
        dispatch({ type: 'reviewClient', clientId });
        showToast(`${getClient(clientId).firstName} marked as reviewed`);
      },
      toggleReview: (clientId) => {
        const name = getClient(clientId).firstName;
        showToast(isReviewed(state, clientId, state.weekOffset) ? `Review undone for ${name}` : `${name} marked as reviewed`);
        dispatch({ type: 'toggleReview', clientId, offset: state.weekOffset });
      },
      reviewedNow: (clientId) => isReviewed(state, clientId, state.weekOffset),
      setDashboardTab: (tab) => dispatch({ type: 'setDashboardTab', tab }),
      markReviewed: (clientId) => {
        dispatch({ type: 'markReviewed', clientId });
        showToast(`${getClient(clientId).firstName} marked as reviewed`);
      },
      setFeedback: (clientId, value) => dispatch({ type: 'feedback', clientId, value }),
      changeStatus: (clientId, to, reason) => {
        const client = getClient(clientId);
        const from = generatedStatus(client);
        // The client object is the one every surface reads, so the change shows on cards, list and panels at once.
        setEffectiveStatus(clientId, to);
        dispatch({ type: 'changeStatus', clientId, change: to === from ? null : { from, to, reason: reason.trim() } });
        showToast(`${client.firstName}'s status changed to ${STATUS_LABEL[to]}`);
      },
      openOlly: (clientId, request) => dispatch({ type: 'openOlly', clientId, request }),
      openInbox: (clientId, highlightId) => dispatch({ type: 'openInbox', clientId, highlightId }),
      setSideTab: (tab) => dispatch({ type: 'sideTab', tab }),
      closeSideTab: (tab) => dispatch({ type: 'closeSideTab', tab }),
      closeSide: () => dispatch({ type: 'closeSide' }),
      // No toast: Olly and the Inbox show the sent message themselves (the user's call).
      sendMessage: (clientId, text, highlightId) => dispatch({ type: 'sendMessage', clientId, text, highlightId }),
      dismissHighlight: (id) => dispatch({ type: 'dismissHighlight', id }),
      restoreHighlight: (id) => dispatch({ type: 'restoreHighlight', id }),
      clearHighlightHistory: () => dispatch({ type: 'clearHighlightHistory' }),
      setAiContext: (clientId, context) => {
        dispatch({ type: 'setAiContext', clientId, context });
        showToast(context ? `Context saved for ${getClient(clientId).firstName}` : 'Context cleared');
      },
      addMeeting: (clientId, meeting) => {
        dispatch({ type: 'addMeeting', clientId, meeting });
        showToast('Meeting added');
      },
      setNotes: (clientId, notes, toast) => {
        dispatch({ type: 'setNotes', clientId, notes });
        showToast(toast);
      },
      completeFromPanel: (id) => {
        dispatch({ type: 'completeFromPanel', id });
        showToast('To-do has been completed');
      },
    };
  }, [state, showToast]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
