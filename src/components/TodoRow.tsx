import { X } from 'lucide-react';
import iconCheck from '../assets/figma/icon-check.svg';
import type { Todo } from '../data/types';
import { getClient } from '../state/store';
import { Avatar } from './Avatar';

interface TodoRowProps {
  todo: Todo;
  /** Right-aligned age on carried-over rows ("Yesterday", "Aug 27"). */
  age?: string;
  onToggle: () => void;
  onDismiss: () => void;
}

export function TodoRow({ todo, age, onToggle, onDismiss }: TodoRowProps) {
  const client = getClient(todo.clientId);
  const done = todo.state === 'completed';

  return (
    <li className="group flex items-center gap-2 border-b border-line px-2 pb-[14px] pt-[10px]">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <div className="relative h-8 w-6 shrink-0">
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={`Mark "${todo.action} ${client.name}" as done`}
            onClick={onToggle}
            className={
              done
                ? 'absolute left-1/2 top-[5.75px] flex size-5 -translate-x-1/2 items-center justify-center rounded-full border border-brand bg-brand text-white'
                : 'absolute left-1/2 top-[5.75px] flex size-5 -translate-x-1/2 items-center justify-center rounded-full border-[0.938px] border-black/15 bg-white hover:border-brand'
            }
          >
            {/* The design's check mark; turned white on the filled (done) state. */}
            <span className="relative size-[10px]">
              <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
                <img src={iconCheck} alt="" className={`block size-full max-w-none ${done ? 'brightness-0 invert' : ''}`} />
              </span>
            </span>
          </button>
        </div>
        <div className={`flex min-w-0 flex-1 flex-col gap-1 transition-opacity ${done ? 'opacity-50' : ''}`}>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={`whitespace-nowrap text-[13px] font-semibold leading-[1.5] text-ink ${done ? 'line-through decoration-ink/40' : ''}`}>
              {todo.action}
            </span>
            <span className={`flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pl-0.5 ${age ? 'pr-2' : ''}`}>
              <Avatar name={client.name} src={client.avatar} />
              <span className="truncate text-[13px] font-semibold text-ink">{client.name}</span>
            </span>
          </div>
          <p className="text-[12px] leading-normal text-ink-tertiary">{todo.reason}</p>
        </div>
      </div>
      <div className="relative flex h-6 shrink-0 items-center justify-end">
        {age && <span className="whitespace-nowrap text-[12px] text-ink-tertiary group-hover:invisible group-focus-within:invisible">{age}</span>}
        <button
          type="button"
          title="Dismiss"
          aria-label={`Dismiss "${todo.action} ${client.name}"`}
          onClick={onDismiss}
          className={`${age ? 'absolute right-0' : ''} flex size-6 items-center justify-center rounded-md text-ink-secondary opacity-0 transition-opacity hover:bg-white hover:text-ink focus-visible:opacity-100 group-hover:opacity-100`}
        >
          <X size={16} />
        </button>
      </div>
    </li>
  );
}
