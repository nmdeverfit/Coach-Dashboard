import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { DEMO_TODAY, clients, todos as seedTodos } from '../data/mock';
import type { Client, FeedbackState, GroupKey, Todo } from '../data/types';
import type { ClientTabKey } from '../components/drawer/ClientTabs';
import type { DashboardTab } from '../lib/dashboard';

export type View = 'brief' | 'dashboard';

interface State {
  todos: Todo[];
  view: View;
  /** 0 is the current week; the week selector always opens here. */
  weekOffset: number;
  /** The client list's open tab; a group card's "View all" lands on its own. */
  dashboardTab: DashboardTab;
  toast: string | null;
  /** The to-do whose panel is open. */
  selectedTodoId: string | null;
  /** The client whose detail panel is open (from a group card). Only one panel is open at a time. */
  selectedClientId: string | null;
  /** The tab the client detail page opens on, when the coach came from a list that implies one (the Booking tab). */
  selectedClientTab: ClientTabKey | null;
  /** Clients reviewed this week. A Check-in review is one action on both views (brief, S3 BL5). */
  reviewed: Record<string, boolean>;
  /** Answer to "Does '{status}' look right for {first_name}?" per client. */
  feedback: Record<string, FeedbackState>;
}

type Action =
  | { type: 'toggleComplete'; id: string }
  | { type: 'dismiss'; id: string }
  | { type: 'dismissAllPrevious' }
  | { type: 'setView'; view: View }
  | { type: 'shiftWeek'; by: number }
  | { type: 'resetWeek' }
  | { type: 'openGroup'; group: GroupKey | null }
  | { type: 'toast'; message: string | null }
  | { type: 'select'; id: string | null }
  | { type: 'selectClient'; id: string | null; tab?: ClientTabKey }
  | { type: 'reviewClient'; clientId: string }
  | { type: 'toggleReview'; clientId: string }
  | { type: 'setDashboardTab'; tab: DashboardTab }
  | { type: 'markReviewed'; clientId: string }
  | { type: 'completeFromPanel'; id: string }
  | { type: 'feedback'; clientId: string; value: FeedbackState };

const initialState: State = {
  todos: seedTodos,
  view: 'brief',
  weekOffset: 0,
  dashboardTab: 'all',
  toast: null,
  selectedTodoId: null,
  selectedClientId: null,
  selectedClientTab: null,
  reviewed: {},
  feedback: {},
};

const isPrevious = (t: Todo) => t.raisedOn < DEMO_TODAY;

const GROUP_TAB: Record<GroupKey, DashboardTab> = {
  at_risk: 'at_risk',
  needs_attention: 'needs_attention',
  program_ending: 'program_ending',
  upcoming_bookings: 'booking',
};

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
      };
    case 'shiftWeek':
      return { ...state, weekOffset: Math.min(0, state.weekOffset + action.by) };
    case 'resetWeek':
      return { ...state, weekOffset: 0 };
    case 'openGroup':
      return { ...state, view: 'dashboard', dashboardTab: action.group ? GROUP_TAB[action.group] : 'all', selectedClientId: null, selectedTodoId: null };
    case 'setDashboardTab':
      return { ...state, dashboardTab: action.tab };
    case 'toast':
      return { ...state, toast: action.message };
    case 'select':
      return { ...state, selectedTodoId: action.id, selectedClientId: action.id ? null : state.selectedClientId };
    case 'selectClient':
      return { ...state, selectedClientId: action.id, selectedClientTab: action.tab ?? null, selectedTodoId: action.id ? null : state.selectedTodoId };
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
      };
    case 'completeFromPanel':
      // The panel's ✓ is the same write as the row checkbox, and closes the panel on every type (Spec 4 AC1.9).
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, state: 'completed' } : t)),
        selectedTodoId: null,
      };
    case 'feedback':
      return { ...state, feedback: { ...state.feedback, [action.clientId]: action.value } };
  }
}

const clientById = new Map(clients.map((c) => [c.id, c]));
export const getClient = (id: string): Client => {
  const client = clientById.get(id);
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
  openGroup: (group: GroupKey | null) => void;
  showToast: (message: string) => void;
  selectTodo: (id: string | null) => void;
  /** Opens the client detail page, optionally on a given tab. */
  selectClient: (id: string | null, tab?: ClientTabKey) => void;
  /** Mark as reviewed from the client detail page. */
  reviewClient: (clientId: string) => void;
  /** The client list's ✓: marks the client reviewed, or takes the review back. */
  toggleReview: (clientId: string) => void;
  setDashboardTab: (tab: DashboardTab) => void;
  markReviewed: (clientId: string) => void;
  completeFromPanel: (id: string) => void;
  setFeedback: (clientId: string, value: FeedbackState) => void;
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
      toggleComplete: (id) => dispatch({ type: 'toggleComplete', id }),
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
      showToast,
      selectTodo: (id) => dispatch({ type: 'select', id }),
      selectClient: (id, tab) => dispatch({ type: 'selectClient', id, tab }),
      reviewClient: (clientId) => {
        dispatch({ type: 'reviewClient', clientId });
        showToast(`${getClient(clientId).firstName} marked as reviewed`);
      },
      toggleReview: (clientId) => {
        const name = getClient(clientId).firstName;
        showToast(state.reviewed[clientId] ? `Review undone for ${name}` : `${name} marked as reviewed`);
        dispatch({ type: 'toggleReview', clientId });
      },
      setDashboardTab: (tab) => dispatch({ type: 'setDashboardTab', tab }),
      markReviewed: (clientId) => {
        dispatch({ type: 'markReviewed', clientId });
        showToast(`${getClient(clientId).firstName} marked as reviewed`);
      },
      setFeedback: (clientId, value) => dispatch({ type: 'feedback', clientId, value }),
      completeFromPanel: (id) => {
        dispatch({ type: 'completeFromPanel', id });
        showToast('To-do completed');
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
