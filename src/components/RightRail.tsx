import { useCallback } from 'react';
import type { CardKey } from '../data/types';
import { cardMembers } from '../lib/groups';
import { sessionsInWeek } from '../lib/week';
import { sideIsSidebar, useStore } from '../state/store';
import { CardsEditor, CustomizeTrigger, EditOverlay, type EditItem } from './CardsEditMode';
import { CategoryGroup, GroupIcon } from './CategoryGroup';
import { ClientHighlights } from './ClientHighlights';
import { ALL_GROUPS } from './groups';

/**
 * `wide`: a past week, where the rail takes the full width and every card description fits on one line.
 * `narrow`: the three-part layout test, where the rail is a third of the page: the group cards stack in one column
 * and Client highlights put their category tabs in a row above the list. The highlights' sidebar (`sideIsSidebar`)
 * does the same on the two-column brief.
 * The cards follow the coach's layout (`state.rail`), set in edit mode: the "Customize cards" row under them, a
 * card's ⋯ menu or Dashboard Settings (`CardsEditMode`).
 */
export function RightRail({ wide = false, narrow = false }: { wide?: boolean; narrow?: boolean }) {
  const { state, reviewedNow, setRail, editCards, showToast } = useStore();
  // With the highlights' sidebar open the rail is too narrow for the 2 × 2 grid, so the cards stack in one column
  // (the user's call), as in the three-part layout.
  const stacked = narrow || (!wide && sideIsSidebar(state));
  const editing = state.editCards === 'brief';

  const item = (key: CardKey): EditItem => {
    const g = ALL_GROUPS[key];
    // The count each card's header shows: Upcoming bookings counts sessions, the rest their clients.
    const count = key === 'upcoming_bookings'
      ? sessionsInWeek(state.weekOffset).length
      : cardMembers(key, state.weekOffset, { todos: state.todos, reviewed: reviewedNow }).length;
    return { title: g.title, description: g.description, icon: <GroupIcon group={g} />, count };
  };
  const cancel = useCallback(() => editCards(null), [editCards]);

  return (
    <aside className="flex min-w-0 flex-col bg-surface-secondary">
      {/* The "Client groups · Customize" row above the cards is set aside for now (the user's call). */}
      <div className={editing ? 'px-1 pt-1' : 'px-5 pt-5'}>
        {editing ? (
          <>
            <EditOverlay />
            <CardsEditor
              initial={state.rail.order}
              item={item}
              label="Today’s Brief"
              onCancel={cancel}
              onSave={(order) => {
                setRail({ order, collapsed: state.rail.collapsed.filter((k) => order.includes(k)) });
                editCards(null);
                showToast('Cards updated');
              }}
            />
          </>
        ) : (
          <>
            <div className={stacked ? 'flex flex-col gap-4' : 'grid grid-cols-2 items-start gap-5'}>
              {state.rail.order.map((key) => (
                <CategoryGroup key={key} group={ALL_GROUPS[key]} wide={wide || stacked} narrow={stacked} />
              ))}
            </div>
            <CustomizeTrigger onClick={() => editCards('brief')} className="mt-2 h-9 w-full" />
          </>
        )}
      </div>
      <ClientHighlights narrow={narrow} />
    </aside>
  );
}
