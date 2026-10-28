import { useCallback, useEffect, useRef, useState } from 'react';
import iconChevronLeft from '../../assets/figma/icon-chevron-left.svg';
import iconChevronRight from '../../assets/figma/icon-chevron-right-small.svg';
import iconCheckTitle from '../../assets/figma/icon-check-title.svg';
import iconCheckWhite from '../../assets/figma/icon-check-white.svg';
import iconCheck from '../../assets/figma/icon-check.svg';
import iconAddWhite from '../../assets/figma/icon-add-white.svg';
import iconAlarmWhite from '../../assets/figma/icon-alarm-white.svg';
import iconCircleCheck from '../../assets/figma/icon-circle-check-fill.svg';
import iconClose from '../../assets/figma/icon-close.svg';
import dot from '../../assets/figma/dot-drawer.svg';
import iconDuplicateWhite from '../../assets/figma/icon-duplicate-white.svg';
import iconTrashHover from '../../assets/figma/icon-trash-hover.svg';
import iconTrash from '../../assets/figma/icon-trash.svg';
import { todoDetails } from '../../data/details';
import { GROUPED_TODOS, MAX_RELATED, byPriority } from '../../data/groupedTodos';
import { DEMO_TODAY } from '../../data/mock';
import { getProfile } from '../../data/profiles';
import type { CheckinDetail, Client, Todo, TodoDetail } from '../../data/types';
import { buildCheckinView } from '../../lib/checkin';
import { buildClientAssessment } from '../../lib/client';
import { buildAcknowledgeView, buildBuildView, buildPrepareView, buildRemindView, buildRespondView, buildUnblockView } from '../../lib/todos';
import { getClient, useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { SHORT_ACTION } from '../TodoRow';
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
 * The name links to client details on every type (AC1.11), Check-in too (the user's call; Spec 4 keeps it plain there).
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
            <button type="button" title="Open client details" onClick={onOpenClient} className="text-brand hover:underline">
              {client.name}
            </button>
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

/**
 * A Check-in with no hand-written panel data (grouped to-dos' Wade): the client detail page's assessment, feedback and
 * tabs, read from the same profile as the list's status line, so the row's reason and the card agree (AC4).
 */
function ProfileCheckinBody({ client }: { client: Client }) {
  const { openOlly } = useStore();
  const profile = getProfile(client.id);
  const assessment = buildClientAssessment(client, profile, DEMO_TODAY);
  return (
    <>
      <div className="flex flex-col gap-2 px-[30px] pb-[30px] pt-2.5">
        <AiAssessment client={client} assessment={assessment} onTellMeMore={() => openOlly(client.id, { mode: 'tell', assessment })} />
        <StatusFeedback client={client} />
      </div>
      <ClientTabs client={client} profile={profile} />
    </>
  );
}

/**
 * The client's to-dos (grouped to-dos, a trial; option B of three, the user's pick): one quiet line above the title,
 * drawn like a breadcrumb, with every to-do of the group in `TYPE_PRIORITY` order, the main one first, split by small
 * chevrons. The open one is plain `ink` text; the others are `ink-secondary` links that open their panel in this one's
 * place, so the coach can go back to the main to-do or across to any other. A done one is struck through. It shows
 * only on a to-do reached from another one (the trail or Related to-dos), not on one opened from its row (the user's
 * call).
 */
function GroupTrail({ todo, onOpen }: { todo: Todo; onOpen: (id: string) => void }) {
  const { suggested, previous } = useStore();
  const group = [...suggested, ...previous].filter((t) => t.clientId === todo.clientId).sort(byPriority).slice(0, 1 + MAX_RELATED);
  if (group.length < 2) return null;
  return (
    <nav aria-label="This client’s to-dos" className="px-[30px] pt-4">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[12px] leading-[18px]">
        {group.map((t, i) => {
          const done = t.state === 'completed' ? 'line-through' : '';
          return (
            <li key={t.id} className="flex items-center gap-1">
              {i > 0 && <img src={iconChevronRight} alt="" width={14} height={14} className="shrink-0 opacity-50" />}
              {t.id === todo.id ? (
                <span aria-current="page" className={`font-semibold text-ink ${done}`}>
                  {SHORT_ACTION[t.type]}
                </span>
              ) : (
                <button type="button" onClick={() => onOpen(t.id)} className={`text-ink-secondary hover:text-brand hover:underline ${done}`}>
                  {SHORT_ACTION[t.type]}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Related to-dos (grouped to-dos, a trial): the client's other to-dos today, by `TYPE_PRIORITY`, each only its checkbox
 * and title (the user's call), on a plain header; hover adds a chevron, since a click goes to that to-do. Each opens
 * its own panel in this one's place; each is completed or dismissed on its own.
 */
function RelatedTodos({ todo, onOpen }: { todo: Todo; onOpen: (id: string) => void }) {
  const { suggested, previous } = useStore();
  const related = [...suggested, ...previous].filter((t) => t.clientId === todo.clientId && t.id !== todo.id).sort(byPriority);
  if (!related.length) return null;
  return (
    <div className="px-[30px] pb-2.5">
      <section aria-label="Related to-dos" className="overflow-hidden rounded-lg bg-surface-secondary">
        <h3 className="px-4 pb-1 pt-3 text-[13px] font-semibold leading-[1.5] text-ink-secondary">Related to-dos</h3>
        <ul className="pb-2">
          {related.map((t) => {
            const done = t.state === 'completed';
            return (
              <li key={t.id}>
                <button type="button" onClick={() => onOpen(t.id)} className="group flex w-full items-center gap-3 px-4 py-1.5 text-left hover:bg-black/[0.03]">
                  {/* The row checkbox's look, read-only here: the to-do is ticked in its own panel or on its row. */}
                  <span
                    aria-hidden
                    className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-[0.938px] border-black/15 ${done ? 'bg-checked' : 'bg-white'}`}
                  >
                    <span className="relative size-[9px]">
                      <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
                        <img src={done ? iconCheckWhite : iconCheck} alt="" className="block size-full max-w-none" />
                      </span>
                    </span>
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[13px] font-semibold leading-[1.5] text-ink group-hover:text-brand ${done ? 'opacity-60 line-through' : ''}`}>
                    {t.title?.short ?? SHORT_ACTION[t.type]}
                  </span>
                  <img src={iconChevronRight} alt="" width={16} height={16} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** One footer per type: primary action plus at most two secondary controls (Spec 4 BL1 G). */
function Footer({ todo, client, detail, onComplete }: { todo: Todo; client: Client; detail?: TodoDetail; onComplete: () => void }) {
  const { showToast } = useStore();
  const done = todo.state === 'completed';
  const white = (src: string, size = 20) => <img src={src} alt="" width={size} height={size} />;
  const checkinFooter = (
    <PanelFooter>
      <FooterButton variant="primary" icon={white(iconCircleCheck, 16)} label={done ? 'Reviewed' : 'Mark as reviewed'} disabled={done} onClick={onComplete} />
      <DraftWithAiButton clientId={client.id} todoId={todo.id} />
      <SendMessageButton clientId={client.id} />
    </PanelFooter>
  );
  if (!detail) return todo.type === 'checkin' ? checkinFooter : null;
  switch (detail.kind) {
    case 'checkin':
      return checkinFooter;
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
  // Grouped to-dos: whether this to-do was reached from another one, which is when the group trail shows, and the
  // to-dos left on the way, newest last, for ‹ back on the header (the user's call). Opening a to-do from its row, or
  // closing the panel, starts again.
  const [fromTodo, setFromTodo] = useState(false);
  const [trail, setTrail] = useState<string[]>([]);
  const viaTodo = useRef(false);
  const openFromTodo = (id: string) => {
    viaTodo.current = true;
    setTrail((t) => [...t, state.selectedTodoId!]);
    selectTodo(id);
  };
  const back = () => {
    // A to-do dismissed meanwhile is skipped.
    const left = trail.filter((id) => state.todos.find((t) => t.id === id)?.state !== 'dismissed');
    const prev = left.pop();
    setTrail(left);
    if (!prev) return;
    viaTodo.current = true;
    selectTodo(prev);
  };

  useEffect(() => {
    setConfirmDismiss(false);
    setClientOpen(false);
    setFromTodo(viaTodo.current);
    if (!viaTodo.current) setTrail([]);
    viaTodo.current = false;
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
      <div className={`relative flex min-h-0 flex-1 flex-col ${clientOpen ? 'hidden' : ''}`}>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5 pb-2.5 pt-[15px]">
          {trail.length > 0 ? (
            <button type="button" aria-label="Back to the previous to-do" onClick={back} className="-ml-1.5 flex items-center gap-0.5 text-[13px] font-semibold leading-[1.5] text-ink-secondary hover:text-ink">
              <img src={iconChevronLeft} alt="" width={24} height={24} />
              TO-DO DETAILS
            </button>
          ) : (
            <p className="text-[13px] font-semibold leading-[1.5] text-ink-secondary">TO-DO DETAILS</p>
          )}
          <button type="button" aria-label="Close to-do details" onClick={() => selectTodo(null)} className="relative size-5 overflow-hidden rounded hover:opacity-70">
            <img src={iconClose} alt="" className="absolute left-1/2 top-1/2 size-6 max-w-none -translate-x-1/2 -translate-y-1/2" />
          </button>
        </header>
        <div key={todo.id} data-panel-scroll className="flex-1 overflow-y-auto">
          {GROUPED_TODOS && fromTodo && <GroupTrail todo={todo} onOpen={openFromTodo} />}
          <TitleBlock todo={todo} client={client} onComplete={complete} onDismiss={() => setConfirmDismiss(true)} onOpenClient={() => setClientOpen(true)} />
          {GROUPED_TODOS && <RelatedTodos todo={todo} onOpen={openFromTodo} />}
          {detail ? (
            <Body todo={todo} client={client} detail={detail} />
          ) : todo.type === 'checkin' && GROUPED_TODOS ? (
            <ProfileCheckinBody client={client} />
          ) : (
            <PlaceholderBody />
          )}
        </div>
        {(detail || GROUPED_TODOS) && <Footer todo={todo} client={client} detail={detail} onComplete={complete} />}
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
