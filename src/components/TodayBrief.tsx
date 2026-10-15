import { useState } from 'react';
import heroDivider from '../assets/figma/hero-divider.svg';
import heroPhoto from '../assets/figma/hero-2.png';
import dot from '../assets/figma/dot.svg';
import { COACH_FIRST_NAME, DEMO_TODAY, GENERATED_AT } from '../data/mock';
import type { Todo } from '../data/types';
import { ageLabel, formatMonthDay, parseDay } from '../lib/dates';
import { getClient, useStore } from '../state/store';
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

type PendingDismiss = { kind: 'one'; todo: Todo } | { kind: 'all'; count: number };

export function TodayBrief() {
  const { state, suggested, previous, openSuggestedCount, toggleComplete, dismiss, dismissAllPrevious, resetWeek } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<PendingDismiss | null>(null);

  if (state.weekOffset !== 0) {
    return (
      <section className="flex flex-col bg-white">
        <Hero />
        <div className="flex flex-col items-start gap-3 px-[60px] py-10">
          <h2 className="text-[20px] font-bold leading-[1.5] tracking-[-0.4px] text-ink">Today’s Brief covers the current week only</h2>
          <p className="max-w-[460px] text-[13px] leading-[1.5] text-ink-secondary">
            Suggested to-dos are generated each morning for this week. The group cards on the right still show this past week’s
            client status.
          </p>
          <button type="button" onClick={resetWeek} className="h-8 rounded-[4px] bg-ink px-4 text-[13px] font-semibold text-white hover:bg-ink/90">
            Back to this week
          </button>
        </div>
      </section>
    );
  }

  const visibleSuggested = expanded ? suggested : suggested.slice(0, INITIAL_ROWS);
  const hiddenCount = suggested.length - visibleSuggested.length;

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
            <div className="overflow-hidden rounded-lg bg-surface-secondary px-2 pt-1">
              <ul>
                {visibleSuggested.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
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
            <ul className="overflow-hidden rounded-lg bg-surface-secondary px-2 pt-1">
              {previous.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  age={ageLabel(todo.raisedOn, DEMO_TODAY)}
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
