import type { KeyboardEvent, MouseEvent } from 'react';
import iconCheck from '../assets/figma/icon-check.svg';
import iconCheckWhite from '../assets/figma/icon-check-white.svg';
import iconTrash from '../assets/figma/icon-trash.svg';
import type { Todo, TodoType } from '../data/types';
import { getClient } from '../state/store';
import { Avatar } from './Avatar';
import { Tooltip } from './Tooltip';

interface TodoRowProps {
  todo: Todo;
  /** Right-aligned age on carried-over rows ("Yesterday", "Aug 27"); marks the Past variant. */
  age?: string;
  selected: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onDismiss: () => void;
  /**
   * Grouped to-dos (trial): the row's place in its client's group. `first` carries the client chip as usual; `nested`
   * and `last` rows drop it for the type's short action and hang off a dashed line. None draws its own bottom border.
   */
  grouped?: 'first' | 'nested' | 'last';
}

const TREE = 'pointer-events-none absolute border-l border-dashed border-ink-muted';

/** A nested row's action: the client is named once, on the group's first row. */
export const SHORT_ACTION: Record<TodoType, string> = {
  checkin: 'Check in',
  respond: 'Reply to the form',
  remind: 'Remind to submit a check-in form',
  build: 'Assign a new program',
  prepare: 'Prepare for the session',
  unblock: 'Issue credit',
  adjust: 'Adjust the plan',
  acknowledge: 'Congratulate',
  congratulate: 'Congratulate',
  kudos: 'Send kudos',
};

/**
 * To-do item (Figma component 3925:6908): Default, Hover, Selected and Completed states, each in a
 * Current and a Past (Previous to-dos) variant.
 */
export function TodoRow({ todo, age, selected, onOpen, onToggle, onDismiss, grouped }: TodoRowProps) {
  const client = getClient(todo.clientId);
  const done = todo.state === 'completed';
  const strike = done ? 'line-through' : '';

  const stop = (handler: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    handler();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onOpen();
    }
  };

  const nested = grouped === 'nested' || grouped === 'last';
  const surface = selected
    ? 'rounded-r-lg border-l-4 border-l-brand bg-white shadow-row'
    : `${grouped ? '' : 'border-b border-line hover:border-transparent'} hover:rounded-lg hover:bg-white hover:shadow-row`;

  return (
    <li
      data-todo-row
      // The group, not its rows, slides and sinks when the list reorders (TodayBrief).
      data-todo-id={grouped ? undefined : todo.id}
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${todo.action} ${client.name}`}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className={`group relative flex cursor-pointer gap-2 px-2 pt-[10px] outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        grouped === 'first' ? 'pb-2' : 'pb-[14px]'
      } ${nested ? 'ml-8' : ''} ${age ? 'items-center' : 'items-start'} ${surface}`}
    >
      {/* The dashed line runs down from the first row's checkbox, 20 px in, and bends into each nested checkbox. */}
      {grouped === 'first' && <span aria-hidden className={`${TREE} left-5 top-[30px] bottom-0`} />}
      {/* A selected row's 4 px brand border moves its padding box, so its lines start 4 px further left. */}
      {grouped === 'nested' && <span aria-hidden className={`${TREE} ${selected ? '-left-4' : '-left-3'} top-0 bottom-0`} />}
      {nested && <span aria-hidden className={`${TREE} top-0 h-[26px] rounded-bl-md border-b ${selected ? '-left-4 w-[26px]' : '-left-3 w-[22px]'}`} />}
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="relative h-8 w-6 shrink-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={`Mark "${todo.action} ${client.name}" as done`}
            onClick={stop(onToggle)}
            className={`group/tip absolute left-1/2 top-[5.75px] flex size-5 -translate-x-1/2 items-center justify-center rounded-full border-[0.938px] border-black/15 ${
              done ? 'bg-checked' : 'bg-white hover:border-brand'
            }`}
          >
            <span className="relative size-[10px]">
              <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
                <img src={done ? iconCheckWhite : iconCheck} alt="" className="block size-full max-w-none" />
              </span>
            </span>
            {!done && <Tooltip label="Complete this task" />}
          </button>
        </div>
        <div className={`flex min-w-0 flex-1 flex-col gap-1 ${done ? 'opacity-60' : ''}`}>
          <div className={`flex min-w-0 items-center gap-1.5 ${nested ? 'pt-1.5' : ''}`}>
            <span className={`whitespace-nowrap text-[13px] font-semibold leading-[1.5] text-ink ${strike}`}>{nested ? SHORT_ACTION[todo.type] : todo.action}</span>
            {!nested && <span className={`flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 ${age ? 'pr-2' : ''}`}>
              <Avatar name={client.name} src={client.avatar} />
              <span className={`truncate text-[13px] font-semibold text-ink ${strike}`}>{client.name}</span>
            </span>}
            {todo.actionAfter && !nested && (
              <span className={`whitespace-nowrap text-[13px] font-semibold leading-[1.5] text-ink ${strike}`}>{todo.actionAfter}</span>
            )}
          </div>
          <p className={`text-[12px] leading-normal text-ink-tertiary ${strike}`}>{todo.reason}</p>
        </div>
      </div>

      {/* Past rows show their age; hover swaps it for the dismiss button. Selected keeps the age. */}
      {age && (
        <span
          className={`whitespace-nowrap text-[12px] ${selected ? 'leading-[1.5] text-ink-secondary' : 'text-ink-tertiary group-hover:hidden group-focus-within:hidden'}`}
        >
          {age}
        </span>
      )}
      {!selected && (
        <button
          type="button"
          aria-label={`Dismiss "${todo.action} ${client.name}"`}
          onClick={stop(onDismiss)}
          className="group/tip relative hidden shrink-0 items-center justify-center rounded-[10px] bg-white p-1 hover:bg-surface-secondary focus-visible:flex group-hover:flex group-focus-within:flex"
        >
          <img src={iconTrash} alt="" width={18} height={18} />
          <Tooltip label="Dismiss" />
        </button>
      )}
    </li>
  );
}
