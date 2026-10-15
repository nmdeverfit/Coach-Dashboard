import type { KeyboardEvent, MouseEvent } from 'react';
import iconCheck from '../assets/figma/icon-check.svg';
import iconCheckWhite from '../assets/figma/icon-check-white.svg';
import iconTrash from '../assets/figma/icon-trash.svg';
import type { Todo } from '../data/types';
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
}

/**
 * To-do item (Figma component 3925:6908): Default, Hover, Selected and Completed states, each in a
 * Current and a Past (Previous to-dos) variant.
 */
export function TodoRow({ todo, age, selected, onOpen, onToggle, onDismiss }: TodoRowProps) {
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

  const surface = selected
    ? 'rounded-r-lg border-l-4 border-l-brand bg-white shadow-row'
    : 'border-b border-line hover:rounded-lg hover:border-transparent hover:bg-white hover:shadow-row';

  return (
    <li
      data-todo-row
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      aria-label={`${todo.action} ${client.name}`}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className={`group flex cursor-pointer gap-2 px-2 pb-[14px] pt-[10px] outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${age ? 'items-center' : 'items-start'} ${surface}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="relative h-8 w-6 shrink-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={`Mark "${todo.action} ${client.name}" as done`}
            onClick={stop(onToggle)}
            className={`absolute left-1/2 top-[5.75px] flex size-5 -translate-x-1/2 items-center justify-center rounded-full border-[0.938px] border-black/15 ${
              done ? 'bg-checked' : 'bg-white hover:border-brand'
            }`}
          >
            <span className="relative size-[10px]">
              <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
                <img src={done ? iconCheckWhite : iconCheck} alt="" className="block size-full max-w-none" />
              </span>
            </span>
          </button>
        </div>
        <div className={`flex min-w-0 flex-1 flex-col gap-1 ${done ? 'opacity-60' : ''}`}>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`whitespace-nowrap text-[13px] font-semibold leading-[1.5] text-ink ${strike}`}>{todo.action}</span>
            <span className={`flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 ${age ? 'pr-2' : ''}`}>
              <Avatar name={client.name} src={client.avatar} />
              <span className={`truncate text-[13px] font-semibold text-ink ${strike}`}>{client.name}</span>
            </span>
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
