import { useEffect, useState } from 'react';
import iconCircleCheck from '../../assets/figma/icon-circle-check-fill.svg';
import iconClose from '../../assets/figma/icon-close.svg';
import dot from '../../assets/figma/dot-drawer.svg';
import iconMessage from '../../assets/figma/icon-message-dots.svg';
import iconPencilAi from '../../assets/figma/icon-pencil-ai.svg';
import { todoDetails } from '../../data/details';
import type { Client, CheckinDetail, Todo } from '../../data/types';
import { getClient, useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { StatusChip } from '../StatusChip';
import { AiAssessment } from './AiAssessment';
import { NutritionTab } from './NutritionTab';
import { StatusFeedback } from './StatusFeedback';

/** Data tabs carried over from CID v1; Training reads as available, the rest are muted in the design. */
const TABS = [
  { key: 'training', label: 'Training', muted: false },
  { key: 'nutrition', label: 'Nutrition', muted: false },
  { key: 'tasks', label: 'Task & Habit', muted: true },
  { key: 'program', label: 'Program Ending', muted: true },
  { key: 'form', label: 'Form', muted: true },
  { key: 'notes', label: 'Notes', muted: true },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const CLOSE_MS = 220;

function TitleBlock({ todo, client, statusLine }: { todo: Todo; client: Client; statusLine: string }) {
  const { showToast } = useStore();
  // The client's name links to client details on every panel except Check-in, which already shows them.
  const nameIsLink = todo.type !== 'checkin';
  return (
    <div className="flex items-center gap-4 px-[30px] py-5">
      <Avatar name={client.name} src={client.avatar} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-[18px] font-bold leading-[1.5] text-ink">
          {todo.action}{' '}
          {nameIsLink ? (
            <button type="button" onClick={() => showToast('Client details open here, with a back arrow to the to-do')} className="text-brand hover:underline">
              {client.name}
            </button>
          ) : (
            client.name
          )}
        </h2>
        <div className="flex items-center gap-2">
          <StatusChip status={client.status} />
          <img src={dot} alt="" width={4} height={4} className="shrink-0" />
          <p className="min-w-0 text-[13px] leading-normal text-ink-tertiary">{statusLine}</p>
        </div>
      </div>
    </div>
  );
}

function CheckinBody({ todo, client, detail }: { todo: Todo; client: Client; detail: CheckinDetail }) {
  const { showToast } = useStore();
  const [tab, setTab] = useState<TabKey>(detail.focus);

  return (
    <>
      <TitleBlock todo={todo} client={client} statusLine={detail.statusLine} />
      <div className="flex flex-col gap-2 px-[30px] pb-[30px] pt-2.5">
        <AiAssessment
          status={client.status}
          assessment={detail.assessment}
          onTellMeMore={() => showToast('Tell me more (Olly BI) opens as a column beside this panel')}
        />
        <StatusFeedback client={client} />
      </div>
      <div className="flex flex-col border-t border-line px-[30px] pb-2 pt-2.5">
        <div className="flex flex-col items-end gap-[15px] py-3">
          <div role="tablist" aria-label="Client data" className="flex w-full items-center border-b border-line">
            {TABS.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={
                    active
                      ? '-mb-px border-b-2 border-brand px-5 pb-2.5 pt-2 text-[13px] font-semibold leading-normal text-brand'
                      : `px-5 py-1.5 text-[13px] font-semibold leading-normal tracking-[-0.26px] hover:text-ink ${t.muted ? 'text-ink/40' : 'text-ink-secondary'}`
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {tab === 'nutrition' ? (
            <NutritionTab nutrition={detail.nutrition} />
          ) : (
            <p className="w-full rounded-lg border border-dashed border-line-light bg-elevated px-4 py-10 text-center text-[13px] text-ink-secondary">
              The {TABS.find((t) => t.key === tab)?.label} tab keeps CID v1’s data area. It will be wired in once its frame is shared.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function CheckinFooter({ todo, client }: { todo: Todo; client: Client }) {
  const { markReviewed, showToast } = useStore();
  const reviewed = todo.state === 'completed';
  return (
    <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-white px-[30px] pb-5 pt-4 shadow-footer">
      <button
        type="button"
        disabled={reviewed}
        onClick={() => markReviewed(client.id)}
        className="flex h-10 items-center gap-2 rounded-lg border border-black/10 bg-brand px-6 text-[14px] font-semibold leading-5 tracking-[-0.28px] text-white hover:bg-brand/90 disabled:cursor-default disabled:opacity-60"
      >
        <img src={iconCircleCheck} alt="" width={16} height={16} />
        {reviewed ? 'Reviewed' : 'Mark as reviewed'}
      </button>
      <button
        type="button"
        onClick={() => showToast(`Draft with AI writes a check-in message for ${client.firstName}`)}
        className="flex h-10 items-center gap-2 rounded-lg border border-line-light bg-white px-6 text-[14px] font-semibold leading-5 tracking-[-0.28px] text-ink shadow-ai-draft hover:bg-surface-secondary"
      >
        <img src={iconPencilAi} alt="" width={20} height={20} />
        Draft with AI
      </button>
      <button
        type="button"
        onClick={() => showToast(`Opens a conversation with ${client.firstName}`)}
        className="flex h-10 items-center gap-2 rounded-lg border border-line-light bg-white px-6 text-[14px] font-semibold leading-5 tracking-[-0.28px] text-ink hover:bg-surface-secondary"
      >
        <span className="flex size-5 items-center justify-center">
          <img src={iconMessage} alt="" width={16.2} height={16.2} />
        </span>
        Send message
      </button>
    </footer>
  );
}

function PlaceholderBody({ todo, client }: { todo: Todo; client: Client }) {
  return (
    <>
      <TitleBlock todo={todo} client={client} statusLine={todo.reason} />
      <div className="px-[30px] pb-[30px]">
        <p className="rounded-lg border border-dashed border-line-light bg-elevated px-4 py-10 text-center text-[13px] leading-[1.5] text-ink-secondary">
          The panel for this to-do type is built once its Figma frame is shared.
        </p>
      </div>
    </>
  );
}

/** To-do details drawer: slides in from the right over the right rail; the brief stays usable beside it. */
export function TodoDrawer() {
  const { state, selectTodo } = useStore();
  const [shownId, setShownId] = useState<string | null>(state.selectedTodoId);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (state.selectedTodoId) {
      setShownId(state.selectedTodoId);
      setClosing(false);
      return;
    }
    setClosing(true);
    const timer = window.setTimeout(() => {
      setShownId(null);
      setClosing(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [state.selectedTodoId]);

  useEffect(() => {
    if (!state.selectedTodoId) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[role="alertdialog"]') && selectTodo(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.selectedTodoId, selectTodo]);

  const todo = state.todos.find((t) => t.id === shownId);
  if (!todo) return null;
  const client = getClient(todo.clientId);
  const detail = todoDetails[todo.id];

  return (
    <aside
      aria-label="To-do details"
      className={`fixed inset-y-0 right-0 z-40 flex w-[720px] flex-col bg-white shadow-drawer ${closing ? 'animate-drawer-out' : 'animate-drawer-in'}`}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5 pb-2.5 pt-[15px]">
        <p className="text-[13px] font-semibold leading-[1.5] text-ink-secondary">TO-DO DETAILS</p>
        <button type="button" aria-label="Close to-do details" onClick={() => selectTodo(null)} className="relative size-5 overflow-hidden rounded hover:opacity-70">
          <img src={iconClose} alt="" className="absolute left-1/2 top-1/2 size-6 max-w-none -translate-x-1/2 -translate-y-1/2" />
        </button>
      </header>
      <div key={todo.id} className="flex-1 overflow-y-auto">
        {detail?.kind === 'checkin' ? <CheckinBody todo={todo} client={client} detail={detail} /> : <PlaceholderBody todo={todo} client={client} />}
      </div>
      {detail?.kind === 'checkin' && <CheckinFooter todo={todo} client={client} />}
    </aside>
  );
}
