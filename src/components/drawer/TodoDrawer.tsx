import { useEffect, useState } from 'react';
import iconCheckTitle from '../../assets/figma/icon-check-title.svg';
import iconCheckWhite from '../../assets/figma/icon-check-white.svg';
import iconAddWhite from '../../assets/figma/icon-add-white.svg';
import iconAlarmWhite from '../../assets/figma/icon-alarm-white.svg';
import iconCircleCheck from '../../assets/figma/icon-circle-check-fill.svg';
import iconClose from '../../assets/figma/icon-close.svg';
import dot from '../../assets/figma/dot-drawer.svg';
import iconDuplicateWhite from '../../assets/figma/icon-duplicate-white.svg';
import iconTrashHover from '../../assets/figma/icon-trash-hover.svg';
import iconTrash from '../../assets/figma/icon-trash.svg';
import { todoDetails } from '../../data/details';
import { DEMO_TODAY } from '../../data/mock';
import type { CheckinDetail, Client, Todo, TodoDetail } from '../../data/types';
import { buildCheckinView } from '../../lib/checkin';
import { buildBuildView, buildPrepareView, buildRemindView, buildRespondView, buildUnblockView } from '../../lib/todos';
import { formatDayMonth, parseDay } from '../../lib/dates';
import { getClient, useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { ConfirmDialog } from '../ConfirmDialog';
import { StatusChip } from '../StatusChip';
import { Tooltip } from '../Tooltip';
import { AiAssessment, STATUS_BORDER } from './AiAssessment';
import { BuildBody, RemindBody } from './AssessedBodies';
import { NutritionTab } from './NutritionTab';
import { DataArea, DraftWithAiButton, FooterButton, PanelFooter, SendMessageButton, TabBar, TabPlaceholder } from './PanelParts';
import { RespondBody } from './RespondBody';
import { PrepareBody, UnblockBody } from './SessionsBodies';
import { StatusFeedback } from './StatusFeedback';
import { TrainingTab } from './TrainingTab';

/** Check-in carries all six v1 data tabs (Spec 4 BL1); Training reads as available, the rest are muted in the design. */
const TABS = [
  { key: 'training', label: 'Training' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'tasks', label: 'Task & Habit', muted: true },
  { key: 'program', label: 'Program Ending', muted: true },
  { key: 'form', label: 'Form', muted: true },
  { key: 'notes', label: 'Notes', muted: true },
] as const;
type TabKey = (typeof TABS)[number]['key'];

/** The ✓ on the title row is each type's completion (Spec 4 BL1 G). */
const COMPLETE_LABEL: Partial<Record<Todo['type'], string>> = { checkin: 'Mark as reviewed', respond: 'Mark form as reviewed' };

const CLOSE_MS = 220;

interface TitleProps {
  todo: Todo;
  client: Client;
  onComplete: () => void;
  onDismiss: () => void;
  onOpenClient: () => void;
}

/**
 * Parts A + B (Spec 4 BL1): avatar, title, status, the row's reason line verbatim, and the ✓ / Dismiss icons.
 * The name links to client details on every type except Check-in, which already is the client's details (AC1.11).
 */
function TitleBlock({ todo, client, onComplete, onDismiss, onOpenClient }: TitleProps) {
  const isCheckin = todo.type === 'checkin';
  const done = todo.state === 'completed';
  const completeLabel = COMPLETE_LABEL[todo.type] ?? 'Mark as done';
  return (
    <div className="flex items-center gap-4 px-[30px] py-5">
      <Avatar name={client.name} src={client.avatar} size={44} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-[18px] font-bold leading-[1.5] text-ink">
            {todo.action}{' '}
            {isCheckin ? (
              client.name
            ) : (
              <button type="button" title="Open client details" onClick={onOpenClient} className="text-brand hover:underline">
                {client.name}
              </button>
            )}
            {todo.actionAfter && ` ${todo.actionAfter}`}
          </h2>
          {done && (
            <span className="shrink-0 rounded-full bg-status-track-bg px-2 py-0.5 text-[12px] font-semibold leading-[15px] text-status-track-fg">
              Completed
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          {/* Only Check-in is status-derived, so only it carries the status label (BL2, AC9.1). */}
          {isCheckin && (
            <>
              <StatusChip status={client.status} />
              <img src={dot} alt="" width={4} height={4} className="shrink-0" />
            </>
          )}
          <p title={todo.reason} className="min-w-0 flex-1 truncate text-[13px] leading-normal text-ink-tertiary">
            {todo.reason}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 px-0.5 py-1.5">
        <button
          type="button"
          aria-label={completeLabel}
          disabled={done}
          onClick={onComplete}
          className={`group/tip relative flex size-6 items-center justify-center rounded-full border-[1.125px] border-black/15 ${
            done ? 'cursor-default bg-checked' : 'bg-white hover:border-brand'
          }`}
        >
          <span className="relative size-3">
            <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
              <img src={done ? iconCheckWhite : iconCheckTitle} alt="" className="block size-full max-w-none" />
            </span>
          </span>
          {!done && <Tooltip label={completeLabel} />}
        </button>
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="group/tip relative flex size-7 items-center justify-center rounded-[10px]">
          <span className="flex items-center justify-center rounded-lg p-[5px] group-hover/tip:bg-[#fef2f2]">
            <img src={iconTrash} alt="" width={18} height={18} className="group-hover/tip:hidden" />
            <img src={iconTrashHover} alt="" width={18} height={18} className="hidden group-hover/tip:block" />
          </span>
          <Tooltip label="Dismiss" />
        </button>
      </div>
    </div>
  );
}

function CheckinBody({ client, detail }: { client: Client; detail: CheckinDetail }) {
  const { showToast } = useStore();
  const [tab, setTab] = useState<TabKey>(detail.focus);
  const view = buildCheckinView(detail, DEMO_TODAY);

  return (
    <>
      <div className="flex flex-col gap-2 px-[30px] pb-[30px] pt-2.5">
        <AiAssessment
          border={STATUS_BORDER[client.status]}
          assessment={view.assessment}
          onTellMeMore={() =>
            showToast(`Olly BI opens beside this panel: “Tell me more about ${client.firstName}’s status on ${formatDayMonth(parseDay(DEMO_TODAY))}”`)
          }
        />
        <StatusFeedback client={client} />
      </div>
      <DataArea>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />
        {tab === 'nutrition' ? (
          <NutritionTab log={detail.nutrition} summary={view.summary} />
        ) : tab === 'training' ? (
          <TrainingTab log={detail.training} today={DEMO_TODAY} />
        ) : (
          <TabPlaceholder label={TABS.find((t) => t.key === tab)!.label} />
        )}
      </DataArea>
    </>
  );
}

/** One footer per type: primary action plus at most two secondary controls (Spec 4 BL1 G). */
function Footer({ todo, client, detail, onComplete }: { todo: Todo; client: Client; detail: TodoDetail; onComplete: () => void }) {
  const { showToast } = useStore();
  const done = todo.state === 'completed';
  const white = (src: string, size = 20) => <img src={src} alt="" width={size} height={size} />;
  switch (detail.kind) {
    case 'checkin':
      return (
        <PanelFooter>
          <FooterButton variant="primary" icon={white(iconCircleCheck, 16)} label={done ? 'Reviewed' : 'Mark as reviewed'} disabled={done} onClick={onComplete} />
          <DraftWithAiButton firstName={client.firstName} />
          <SendMessageButton />
        </PanelFooter>
      );
    case 'respond':
      // Reviewing clears only this client's Respond to-do and never counts as a check-in review (AC3.5).
      return (
        <PanelFooter>
          <FooterButton variant="primary" icon={white(iconCircleCheck, 16)} label={done ? 'Form reviewed' : 'Mark form as reviewed'} disabled={done} onClick={onComplete} />
          <DraftWithAiButton firstName={client.firstName} about={`about the ${detail.form}`} />
          <SendMessageButton />
        </PanelFooter>
      );
    case 'build':
      // Assigning does not complete the to-do (AC4.6); there is no Program Copilot hand-off (AC4.5).
      return (
        <PanelFooter>
          <FooterButton variant="primary" icon={white(iconDuplicateWhite)} label="Assign new program" onClick={() => showToast(`The program library opens to assign ${client.firstName} a new program`)} />
          <DraftWithAiButton firstName={client.firstName} />
          <SendMessageButton />
        </PanelFooter>
      );
    case 'remind':
      // Sending does not complete; a submission first auto-resolves the to-do (AC12.5).
      return (
        <PanelFooter>
          <DraftWithAiButton firstName={client.firstName} about="that names the overdue form and how long it has waited" />
          <SendMessageButton />
        </PanelFooter>
      );
    case 'unblock':
      // The dashboard never issues credits; issuing does not complete (AC8.4, AC8.5).
      return (
        <PanelFooter>
          <FooterButton
            variant="primary"
            icon={<span className="relative size-5"><span className="absolute inset-[16.67%]"><img src={iconAddWhite} alt="" className="block size-full max-w-none" /></span></span>}
            label="Issue credits"
            onClick={() => showToast('Client Sessions › Credits opens in a new tab with the Issue credits popup pre-filled')}
          />
          <DraftWithAiButton firstName={client.firstName} />
          <SendMessageButton />
        </PanelFooter>
      );
    case 'prepare': {
      const next = buildPrepareView(detail, DEMO_TODAY).upcoming[0];
      const where = { in_person: 'in-person', phone: 'phone', video: 'video' }[next.type.location];
      return (
        <PanelFooter>
          <FooterButton variant="primary" icon={white(iconAlarmWhite, 16)} label="Draft a reminder" onClick={() => showToast(`The ${where} session reminder template (v1.11) opens beside this panel`)} />
          <DraftWithAiButton firstName={client.firstName} />
        </PanelFooter>
      );
    }
  }
}

function Body({ todo, client, detail }: { todo: Todo; client: Client; detail: TodoDetail }) {
  const first = client.firstName;
  switch (detail.kind) {
    case 'checkin':
      return <CheckinBody client={client} detail={detail} />;
    case 'respond':
      return <RespondBody detail={detail} view={buildRespondView(detail, first, DEMO_TODAY)} reviewed={todo.state === 'completed'} />;
    case 'build':
      return <BuildBody client={client} detail={detail} view={buildBuildView(detail, first, DEMO_TODAY)} />;
    case 'remind':
      return <RemindBody client={client} detail={detail} view={buildRemindView(detail, first, DEMO_TODAY)} />;
    case 'unblock':
      return <UnblockBody view={buildUnblockView(detail, first, DEMO_TODAY)} />;
    case 'prepare':
      return <PrepareBody view={buildPrepareView(detail, DEMO_TODAY)} />;
  }
}

function PlaceholderBody() {
  return (
    <div className="px-[30px] pb-[30px]">
      <p className="rounded-lg border border-dashed border-line-light bg-elevated px-4 py-10 text-center text-[13px] leading-[1.5] text-ink-secondary">
        The panel for this to-do type is built once its Figma frame is shared.
      </p>
    </div>
  );
}

/** Client details in the panel's slot (AC1.11); S5 owns its content. */
function ClientDetails({ client, onBack, onClose }: { client: Client; onBack: () => void; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5 pb-2.5 pt-[15px]">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-[13px] font-semibold leading-[1.5] text-ink-secondary hover:text-ink">
          <span aria-hidden className="text-[16px] leading-none">
            ‹
          </span>
          CLIENT DETAILS
        </button>
        <button type="button" aria-label="Close" onClick={onClose} className="relative size-5 overflow-hidden rounded hover:opacity-70">
          <img src={iconClose} alt="" className="absolute left-1/2 top-1/2 size-6 max-w-none -translate-x-1/2 -translate-y-1/2" />
        </button>
      </header>
      <div className="flex items-center gap-4 px-[30px] py-5">
        <Avatar name={client.name} src={client.avatar} size={44} />
        <div className="flex flex-col items-start gap-1">
          <h2 className="text-[18px] font-bold leading-[1.5] text-ink">{client.name}</h2>
          <StatusChip status={client.status} />
        </div>
      </div>
      <div className="px-[30px]">
        <p className="rounded-lg border border-dashed border-line-light bg-elevated px-4 py-10 text-center text-[13px] leading-[1.5] text-ink-secondary">
          The client details page (status, AI explanation, data area) is built once its frame is shared.
        </p>
      </div>
    </div>
  );
}

/** To-do details drawer: slides in from the right over the right rail; the brief stays usable beside it. */
export function TodoDrawer() {
  const { state, selectTodo, markReviewed, completeFromPanel, dismiss } = useStore();
  const [shownId, setShownId] = useState<string | null>(state.selectedTodoId);
  const [closing, setClosing] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  useEffect(() => {
    setConfirmDismiss(false);
    setClientOpen(false);
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

  // Close, Esc or a click outside closes the panel without completing anything (AC1.4).
  useEffect(() => {
    if (!state.selectedTodoId) return;
    const busy = () => document.querySelector('[role="alertdialog"]');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy() && selectTodo(null);
    const onPointer = (e: PointerEvent) => {
      if (busy() || (e.target as Element).closest('[data-todo-drawer], [data-todo-row]')) return;
      selectTodo(null);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [state.selectedTodoId, selectTodo]);

  const todo = state.todos.find((t) => t.id === shownId);
  if (!todo) return null;
  const client = getClient(todo.clientId);
  const detail = todoDetails[todo.id];
  // The panel's ✓ is the row checkbox; on Check-in it is Mark as reviewed (AC1.9, AC2.5). Both close the panel.
  const complete = () => (todo.type === 'checkin' ? markReviewed(client.id) : completeFromPanel(todo.id));

  return (
    <aside
      data-todo-drawer
      aria-label="To-do details"
      className={`fixed inset-y-0 right-0 z-40 flex w-[720px] flex-col bg-white shadow-drawer ${closing ? 'animate-drawer-out' : 'animate-drawer-in'}`}
    >
      {clientOpen && <ClientDetails client={client} onBack={() => setClientOpen(false)} onClose={() => selectTodo(null)} />}
      {/* Kept mounted behind client details so ‹ returns to the same tab and scroll (AC1.11). */}
      <div className={`flex min-h-0 flex-1 flex-col ${clientOpen ? 'hidden' : ''}`}>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5 pb-2.5 pt-[15px]">
          <p className="text-[13px] font-semibold leading-[1.5] text-ink-secondary">TO-DO DETAILS</p>
          <button type="button" aria-label="Close to-do details" onClick={() => selectTodo(null)} className="relative size-5 overflow-hidden rounded hover:opacity-70">
            <img src={iconClose} alt="" className="absolute left-1/2 top-1/2 size-6 max-w-none -translate-x-1/2 -translate-y-1/2" />
          </button>
        </header>
        <div key={todo.id} className="flex-1 overflow-y-auto">
          <TitleBlock todo={todo} client={client} onComplete={complete} onDismiss={() => setConfirmDismiss(true)} onOpenClient={() => setClientOpen(true)} />
          {detail ? <Body todo={todo} client={client} detail={detail} /> : <PlaceholderBody />}
        </div>
        {detail && <Footer todo={todo} client={client} detail={detail} onComplete={complete} />}
      </div>

      {confirmDismiss && (
        <ConfirmDialog
          title="Dismiss this to-do?"
          body={`It won’t show again, and we won’t suggest the same kind of to-do for ${client.firstName} for 7 days.`}
          confirmLabel="Dismiss"
          onConfirm={() => {
            setConfirmDismiss(false);
            dismiss(todo.id);
          }}
          onCancel={() => setConfirmDismiss(false)}
        />
      )}
    </aside>
  );
}
