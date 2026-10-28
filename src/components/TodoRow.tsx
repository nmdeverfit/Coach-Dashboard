import type { KeyboardEvent, MouseEvent } from 'react';
import iconCheck from '../assets/figma/icon-check.svg';
import iconCheckWhite from '../assets/figma/icon-check-white.svg';
import iconTrash from '../assets/figma/icon-trash.svg';
import type { Todo, TodoType } from '../data/types';
import { getClient } from '../state/store';
import { Avatar } from './Avatar';
import type { CardRole } from './TodoGroupCard';
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
   * Grouped to-dos (trial): a row in a client's card (`TodoGroupCard`), with no bottom border of its own. The main
   * row reads like a single one; a related row is the type's short action only, indented under the main row's text,
   * with no client chip and no reason (the user's call).
   */
  inCard?: CardRole;
}

/** A related row's action inside a client's card: the client is named once, on the main row. */
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
export function TodoRow({ todo, age, selected, onOpen, onToggle, onDismiss, inCard }: TodoRowProps) {
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

  const nested = inCard === 'related';
  // Grouped to-dos trial: one line, the action and its reason in one sentence (`todo.title`), no reason line under it.
  const title = todo.title;
  const oneLine = nested || Boolean(title);
  // "’s" or "," right after the client sticks to the name: "Sidney Goyette-Kihn’s Weekly Check-in".
  const glue = title?.tail.match(/^(’s|,)\s*/);
  const rest = title ? title.tail.slice(glue?.[0].length ?? 0) : '';
  // In a group the brand edge is drawn over the row, so the checkbox stays on the connect line.
  const surface = selected
    ? inCard
      ? 'relative rounded-r-lg bg-white shadow-row before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-brand'
      : 'rounded-r-lg border-l-4 border-l-brand bg-white shadow-row'
    : inCard
      ? 'hover:rounded-lg hover:bg-white hover:shadow-row'
      : 'border-b border-line hover:rounded-lg hover:border-transparent hover:bg-white hover:shadow-row';

  return (
    <li
      data-todo-row
      // The card, not its rows, slides and sinks when the list reorders (TodayBrief).
      data-todo-id={inCard ? undefined : todo.id}
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      aria-label={title ? `${title.lead} ${client.name}${glue?.[1] ?? ''} ${rest}` : `${todo.action} ${client.name}`}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className={`group flex cursor-pointer gap-2 outline-none ${nested ? 'relative py-0.5 pl-10 pr-2' : inCard ? 'px-2 pb-1.5 pt-[10px]' : title ? 'px-2 py-2.5' : 'px-2 pb-[14px] pt-[10px]'} focus-visible:ring-2 focus-visible:ring-brand/40 ${age || oneLine ? 'items-center' : 'items-start'} ${surface}`}
    >
      {/* A related row's branch off the group's connect line (x 20) to its checkbox (`TodoGroupCard`). */}
      {nested && <span aria-hidden className="pointer-events-none absolute left-5 top-1/2 z-[1] h-px w-[22px] -translate-x-px bg-line-light" />}
      <div className={`flex min-w-0 flex-1 gap-2 ${oneLine ? 'items-center' : 'items-start'}`}>
        <div className="relative h-8 w-6 shrink-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={`Mark "${todo.action} ${client.name}" as done`}
            onClick={stop(onToggle)}
            className={`group/tip absolute left-1/2 flex size-5 -translate-x-1/2 items-center ${oneLine ? 'top-1/2 -translate-y-1/2' : 'top-[5.75px]'} justify-center rounded-full border-[0.938px] border-black/15 ${
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
          {title && !nested ? (
            // Regular weight; only the client's name stays semibold (the user's call).
            <div className="flex min-w-0 items-center gap-1.5 text-[13px] leading-[1.5] text-ink">
              <span className={`whitespace-nowrap ${strike}`}>{title.lead}</span>
              <span className="flex shrink-0 items-center gap-1.5 py-0.5 pl-0.5">
                <Avatar name={client.name} src={client.avatar} />
                <span className={`whitespace-nowrap font-semibold ${strike}`}>
                  {client.name}
                  {glue?.[1]}
                </span>
              </span>
              <span className={`min-w-0 truncate ${strike}`}>{rest}</span>
            </div>
          ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`whitespace-nowrap text-[13px] leading-[1.5] text-ink ${title ? '' : 'font-semibold'} ${strike}`}>{nested ? (title?.short ?? SHORT_ACTION[todo.type]) : todo.action}</span>
            {!nested && <span className={`flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 ${age ? 'pr-2' : ''}`}>
              <Avatar name={client.name} src={client.avatar} />
              <span className={`truncate text-[13px] font-semibold text-ink ${strike}`}>{client.name}</span>
            </span>}
            {todo.actionAfter && !nested && (
              <span className={`whitespace-nowrap text-[13px] font-semibold leading-[1.5] text-ink ${strike}`}>{todo.actionAfter}</span>
            )}
          </div>
          )}
          {!oneLine && <p className={`text-[12px] leading-normal text-ink-tertiary ${strike}`}>{todo.reason}</p>}
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
