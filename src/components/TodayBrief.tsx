import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import heroDivider from '../assets/figma/hero-divider.svg';
import heroPhoto from '../assets/figma/hero-2.jpg';
import dot from '../assets/figma/dot.svg';
import { COACH_FIRST_NAME, DEMO_TODAY, GENERATED_AT } from '../data/mock';
import type { Todo } from '../data/types';
import { ageLabel, formatMonthDay, parseDay } from '../lib/dates';
import { getClient, useStore } from '../state/store';
import { reducedMotion } from './ClientListParts';
import { ConfirmDialog } from './ConfirmDialog';
import { CountChip } from './CountChip';
import { TodoRow } from './TodoRow';

/** Rows shown before "Show N more" (brief: INITIAL_ROWS = 7). */
const INITIAL_ROWS = 7;

const todayLabel = formatMonthDay(parseDay(DEMO_TODAY));

function Hero() {
  return (
    <div className="p-3">
      <div className="relative flex h-40 flex-col items-center justify-center overflow-hidden rounded-lg px-10">
        <img src={heroPhoto} alt="" className="absolute inset-0 size-full rounded-lg object-cover" />
        <div className="absolute inset-0 bg-black/30" aria-hidden />
        <div className="relative flex flex-col items-center">
          <div className="flex items-center gap-3 font-serif text-[20px] italic text-white">
            <span>Today’s Brief</span>
            <span className="flex h-4 w-0 items-center justify-center" aria-hidden>
              <img src={heroDivider} alt="" className="block h-px w-4 max-w-none rotate-90" />
            </span>
            <span>{todayLabel}</span>
          </div>
          <p className="font-display text-[32px] font-bold leading-[1.5] tracking-[-0.64px] text-white">
            Good morning, {COACH_FIRST_NAME} 👋
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-[14px] font-bold leading-[1.5] text-ink">{title}</h2>
      <CountChip value={count} />
    </div>
  );
}

/** Motion for a ticked row (the user's call): the tick shows, the row slides left and fades, then reappears last. */
const TICK_MS = 150;
const LEAVE_MS = 320;
const ARRIVE_MS = 320;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** With reduced motion there is no slide: a ticked row shows its tick in place, then drops to the bottom. */
const SINK_DELAY_MS = 450;

interface RowMotion {
  /** Rows that have just been moved to the bottom: they fade in there instead of sliding down. */
  arriving: Set<string>;
  /** The slide-out of a ticked row, held on its last frame until the row has moved. */
  leaving: Map<string, Animation>;
}

/**
 * Completed rows drop to the bottom of their section and the open ones close up (the user's call; the brief keeps a
 * completed row in place). A ticked row first slides left and fades out, then the list reorders and it fades in at
 * the bottom; rows completed before the page opened start there. The sort is stable, so each group keeps its rank,
 * and an unticked row goes straight back to its place.
 */
function useDoneLast(todos: Todo[], list: RefObject<HTMLUListElement>): { rows: Todo[]; motion: RowMotion } {
  const done = todos.filter((t) => t.state === 'completed').map((t) => t.id);
  const [sunk, setSunk] = useState(() => new Set(done));
  const sunkNow = useRef(sunk);
  sunkNow.current = sunk;
  const motion = useRef<RowMotion>({ arriving: new Set(), leaving: new Map() }).current;
  const key = done.join();
  useEffect(() => {
    const now = new Set(key ? key.split(',') : []);
    const fresh = [...now].filter((id) => !sunkNow.current.has(id));
    // Unticked rows come back at once; newly ticked ones leave, then sink.
    setSunk((s) => new Set([...s].filter((id) => now.has(id))));
    const still = reducedMotion();
    const timers = [
      window.setTimeout(() => {
        if (still) return;
        fresh.forEach((id) => {
          const row = list.current?.querySelector<HTMLElement>(`[data-todo-id="${id}"]`);
          if (!row) return;
          motion.leaving.set(
            id,
            row.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateX(-24%)', opacity: 0 }], {
              duration: LEAVE_MS,
              easing: 'ease-in',
              fill: 'forwards',
            }),
          );
        });
      }, TICK_MS),
      window.setTimeout(
        () => {
          fresh.forEach((id) => motion.arriving.add(id));
          setSunk(now);
        },
        still ? SINK_DELAY_MS : TICK_MS + LEAVE_MS,
      ),
    ];
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      // Cut short (ticked again, or unticked): any row still faded out comes back.
      fresh.forEach((id) => {
        if (motion.arriving.has(id)) return;
        motion.leaving.get(id)?.cancel();
        motion.leaving.delete(id);
      });
    };
  }, [key, list, motion]);
  return { rows: [...todos].sort((a, b) => Number(sunk.has(a.id)) - Number(sunk.has(b.id))), motion };
}

/**
 * Slides rows to their new places when a list reorders (the rest closing up after a ticked row leaves): each row is
 * measured against the list before and after, then eased from its old offset (FLIP). A row that has just been moved
 * to the bottom fades in from the right there instead.
 */
function useSlideRows(list: RefObject<HTMLUListElement>, order: string, motion: RowMotion) {
  const last = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const now = new Map<string, number>();
    list.current?.querySelectorAll<HTMLElement>('[data-todo-id]').forEach((row) => {
      const id = row.dataset.todoId!;
      now.set(id, row.offsetTop);
      if (motion.arriving.has(id)) {
        motion.leaving.get(id)?.cancel();
        motion.leaving.delete(id);
        if (!reducedMotion())
          row.animate([{ transform: 'translateX(24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: ARRIVE_MS, easing: EASE });
        return;
      }
      const before = last.current.get(id);
      if (before !== undefined && before !== row.offsetTop && !reducedMotion()) {
        row.animate([{ transform: `translateY(${before - row.offsetTop}px)` }, { transform: 'none' }], {
          duration: 380,
          easing: EASE,
        });
      }
    });
    // A row that sank past "Show N more" is not drawn; its slide-out goes with it.
    motion.arriving.forEach((id) => {
      motion.leaving.get(id)?.cancel();
      motion.leaving.delete(id);
    });
    motion.arriving.clear();
    last.current = now;
  }, [list, order, motion]);
}

type PendingDismiss = { kind: 'one'; todo: Todo } | { kind: 'all'; count: number };

export function TodayBrief() {
  const store = useStore();
  const { state, openSuggestedCount, toggleComplete, dismiss, dismissAllPrevious, selectTodo } = store;
  const suggestedList = useRef<HTMLUListElement>(null);
  const previousList = useRef<HTMLUListElement>(null);
  const { rows: suggested, motion: suggestedMotion } = useDoneLast(store.suggested, suggestedList);
  const { rows: previous, motion: previousMotion } = useDoneLast(store.previous, previousList);
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<PendingDismiss | null>(null);

  const visibleSuggested = expanded ? suggested : suggested.slice(0, INITIAL_ROWS);
  const hiddenCount = suggested.length - visibleSuggested.length;
  useSlideRows(suggestedList, visibleSuggested.map((t) => t.id).join(), suggestedMotion);
  useSlideRows(previousList, previous.map((t) => t.id).join(), previousMotion);

  const confirmDismiss = () => {
    if (!pending) return;
    if (pending.kind === 'one') dismiss(pending.todo.id);
    else dismissAllPrevious();
    setPending(null);
  };

  return (
    <section className="flex flex-col bg-white">
      <Hero />
      <div className="h-px" />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5 px-[60px] py-2.5">
          <h2 className="text-[20px] font-bold leading-[1.5] tracking-[-0.4px] text-black">
            {openSuggestedCount > 0 ? (
              <>
                You have <span className="text-brand">{openSuggestedCount} to-do{openSuggestedCount === 1 ? '' : 's'}</span> to work through today!
              </>
            ) : (
              'You’re all caught up for today!'
            )}
          </h2>
          <div className="flex items-center gap-2 text-[13px] leading-[1.4] text-ink-secondary">
            <span>
              Updated at{' '}
              <span className="text-ink">
                {GENERATED_AT} - {todayLabel}
              </span>
            </span>
            <img src={dot} alt="" width={4} height={4} />
            <span>Refreshes daily</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-[60px] pb-5">
          <SectionTitle title="Suggested to-dos" count={suggested.length} />
          {suggested.length > 0 ? (
            <div className="rounded-lg bg-surface-secondary px-2 pt-1">
              <ul ref={suggestedList} className="relative">
                {visibleSuggested.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    selected={state.selectedTodoId === todo.id}
                    onOpen={() => selectTodo(todo.id)}
                    onToggle={() => toggleComplete(todo.id)}
                    onDismiss={() => setPending({ kind: 'one', todo })}
                  />
                ))}
              </ul>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="w-full px-2 py-3 text-left text-[13px] font-semibold text-brand hover:underline"
                >
                  Show {hiddenCount} more
                </button>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-surface-secondary px-4 py-6 text-[13px] text-ink-secondary">
              Nothing new today. Your next brief arrives tomorrow morning.
            </p>
          )}
        </div>

        {previous.length > 0 && (
          <div className="flex flex-col gap-3 px-[60px] pb-[30px]">
            <div className="flex items-end justify-between pr-2">
              <SectionTitle title="Previous to-dos" count={previous.length} />
              <button
                type="button"
                onClick={() => setPending({ kind: 'all', count: previous.length })}
                className="text-[13px] leading-[1.4] text-ink-secondary underline hover:text-ink"
              >
                Dismiss all
              </button>
            </div>
            <ul ref={previousList} className="relative rounded-lg bg-surface-secondary px-2 pt-1">
              {previous.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  age={ageLabel(todo.raisedOn, DEMO_TODAY)}
                  selected={state.selectedTodoId === todo.id}
                  onOpen={() => selectTodo(todo.id)}
                  onToggle={() => toggleComplete(todo.id)}
                  onDismiss={() => setPending({ kind: 'one', todo })}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      {pending && (
        <ConfirmDialog
          title={pending.kind === 'one' ? 'Dismiss this to-do?' : `Dismiss all ${pending.count} previous to-dos?`}
          body={
            pending.kind === 'one'
              ? `It won’t show again, and we won’t suggest the same kind of to-do for ${getClient(pending.todo.clientId).firstName} for 7 days.`
              : 'They won’t show again, and we won’t suggest the same kind of to-do for these clients for 7 days.'
          }
          confirmLabel={pending.kind === 'one' ? 'Dismiss' : 'Dismiss all'}
          onConfirm={confirmDismiss}
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
}
