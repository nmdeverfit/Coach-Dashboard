import { useCallback, useEffect, useState } from 'react';
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
import { getProfile } from '../../data/profiles';
import type { CheckinDetail, Client, Todo, TodoDetail } from '../../data/types';
import { buildCheckinView } from '../../lib/checkin';
import { buildAcknowledgeView, buildBuildView, buildPrepareView, buildRemindView, buildRespondView, buildUnblockView } from '../../lib/todos';
import { getClient, useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { ConfirmDialog } from '../ConfirmDialog';
import { StatusChip } from '../StatusChip';
import { Tooltip } from '../Tooltip';
import { AiAssessment } from './AiAssessment';
import { AcknowledgeBody, BuildBody, RemindBody } from './AssessedBodies';
import { DraftWithAiButton, FooterButton, PanelFooter, SendMessageButton } from './PanelParts';
import { RespondBody } from './RespondBody';
import { PrepareBody, UnblockBody } from './SessionsBodies';
import { StatusFeedback } from './StatusFeedback';
import { ClientDetailsPanel } from './ClientDetails';
import { ClientTabs } from './ClientTabs';
import { DrawerAside, useCloseOnOutside, useDrawerPresence } from './DrawerShell';

/** The ✓ on the title row is each type's completion (Spec 4 BL1 G). */
const COMPLETE_LABEL: Partial<Record<Todo['type'], string>> = { checkin: 'Mark as reviewed', respond: 'Mark form as reviewed' };

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
        {/*
          The reason line is shown in full: it flows inline after the chip and wraps under it instead of truncating.
          Only Check-in is status-derived, so only it carries the status label (BL2, AC9.1).
        */}
        <p className="text-[13px] leading-[21px] text-ink-tertiary">
          {isCheckin && (
            <>
              <span className="mr-2 inline-flex align-top">
                <StatusChip status={client.status} />
              </span>
              <img src={dot} alt="" width={4} height={4} className="mr-2 inline-block align-middle" />
            </>
          )}
          {todo.reason}
        </p>
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
          {/* Same tooltip as the row checkbox; the accessible name keeps each type's completion (BL1 G). */}
          {!done && <Tooltip label="Complete this task" />}
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
  const { openOlly } = useStore();
  const view = buildCheckinView(detail, DEMO_TODAY);

  return (
    <>
      <div className="flex flex-col gap-2 px-[30px] pb-[30px] pt-2.5">
        <AiAssessment
          client={client}
          assessment={view.assessment}
          onTellMeMore={() => openOlly(client.id, { mode: 'tell', assessment: view.assessment })}
        />
        <StatusFeedback client={client} />
      </div>
      {/* Check-in carries all six data tabs (Spec 4 BL1), read from the same profile as the client detail page. */}
      <ClientTabs client={client} profile={getProfile(client.id)} />
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
          <DraftWithAiButton clientId={client.id} todoId={todo.id} />
          <SendMessageButton clientId={client.id} />
        </PanelFooter>
      );
    case 'respond':
      // Reviewing clears only this client's Respond to-do and never counts as a check-in review (AC3.5).
      return (
        <PanelFooter>
          <FooterButton variant="primary" icon={white(iconCircleCheck, 16)} label={done ? 'Form reviewed' : 'Mark form as reviewed'} disabled={done} onClick={onComplete} />
          <DraftWithAiButton clientId={client.id} todoId={todo.id} />
          <SendMessageButton clientId={client.id} />
        </PanelFooter>
      );
    case 'build':
      // Assigning does not complete the to-do (AC4.6); there is no Program Copilot hand-off (AC4.5).
      return (
        <PanelFooter>
          <FooterButton variant="primary" icon={white(iconDuplicateWhite)} label="Assign new program" onClick={() => showToast(`The program library opens to assign ${client.firstName} a new program`)} />
          <DraftWithAiButton clientId={client.id} todoId={todo.id} />
          <SendMessageButton clientId={client.id} />
        </PanelFooter>
      );
    case 'remind':
      // Sending does not complete; a submission first auto-resolves the to-do (AC12.5).
      return (
        <PanelFooter>
          <DraftWithAiButton clientId={client.id} todoId={todo.id} />
          <SendMessageButton clientId={client.id} />
        </PanelFooter>
      );
    case 'acknowledge':
      // Like Remind: the work is a message, so there is no primary action; ✓ completes.
      return (
        <PanelFooter>
          <DraftWithAiButton clientId={client.id} todoId={todo.id} />
          <SendMessageButton clientId={client.id} />
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
          <DraftWithAiButton clientId={client.id} todoId={todo.id} />
          <SendMessageButton clientId={client.id} />
        </PanelFooter>
      );
    case 'prepare': {
      const next = buildPrepareView(detail, DEMO_TODAY).upcoming[0];
      const where = { in_person: 'in-person', phone: 'phone', video: 'video' }[next.type.location];
      return (
        <PanelFooter>
          <FooterButton variant="primary" icon={white(iconAlarmWhite, 16)} label="Draft a reminder" onClick={() => showToast(`The ${where} session reminder template (v1.11) opens beside this panel`)} />
          <DraftWithAiButton clientId={client.id} todoId={todo.id} />
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
    case 'acknowledge':
      return <AcknowledgeBody client={client} detail={detail} view={buildAcknowledgeView(detail, first, DEMO_TODAY)} />;
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

/** To-do details drawer: slides in from the right over the right rail; the brief stays usable beside it. */
export function TodoDrawer() {
  const { state, selectTodo, markReviewed, completeFromPanel, dismiss } = useStore();
  const { shown: shownId, closing } = useDrawerPresence(state.selectedTodoId);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);
  const close = useCallback(() => selectTodo(null), [selectTodo]);
  useCloseOnOutside(Boolean(state.selectedTodoId), close);

  useEffect(() => {
    setConfirmDismiss(false);
    setClientOpen(false);
  }, [state.selectedTodoId]);

  const todo = state.todos.find((t) => t.id === shownId);
  if (!todo) return null;
  const client = getClient(todo.clientId);
  const detail = todoDetails[todo.id];
  // The panel's ✓ is the row checkbox; on Check-in it is Mark as reviewed (AC1.9, AC2.5). Both close the panel.
  const complete = () => (todo.type === 'checkin' ? markReviewed(client.id) : completeFromPanel(todo.id));

  return (
    <DrawerAside label="To-do details" closing={closing}>
      {clientOpen && <ClientDetailsPanel client={client} onBack={() => setClientOpen(false)} onClose={close} />}
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
    </DrawerAside>
  );
}
