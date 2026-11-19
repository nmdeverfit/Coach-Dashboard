import { useRef, useState } from 'react';
import iconClipboard from '../assets/figma/icon-clipboard-brand.svg';
import iconMarkDoneChecked from '../assets/figma/icon-markdone-checked.svg';
import iconMarkDone from '../assets/figma/icon-markdone.svg';
import iconMessage from '../assets/figma/icon-message-dots.svg';
import { todoDetails } from '../data/details';
import { DEMO_TODAY } from '../data/mock';
import { getProfile } from '../data/profiles';
import { formRows, type FormRow } from '../lib/dashboard';
import { formatMonthDay, parseDay } from '../lib/dates';
import { clientsInWeek } from '../lib/week';
import { sideIsSidebar, useStore } from '../state/store';
import { AiPill } from './AiPill';
import { ClientCell, HEAD, reducedMotion, SectionHeader } from './ClientListParts';
import { AI_GRADIENT } from './drawer/AiAssessment';
import { StatusChip } from './StatusChip';
import { Tooltip } from './Tooltip';

/**
 * The client list's Form to review tab (the user's call, no frame): one row per submitted form, not per client.
 * Client · Form (name, submitted date, response number) · Review status (how long it has waited, or Reviewed) ·
 * the client's Status · Action (Review form, Mark form as reviewed, Send message). Sections Waiting for review
 * (longest wait first) and Reviewed today. A row opens the form's Respond panel; ✓ completes that to-do, which is
 * the form review (Spec 4 AC3.5), so it never counts as a check-in review.
 */

/** Waiting this many days or more reads red. */
export const LONG_WAIT_DAYS = 7;

const WIDE = { client: 'w-[280px] shrink-0', form: 'min-w-0 flex-1', review: 'w-[200px] shrink-0', status: 'w-[180px] shrink-0', action: 'w-[208px] shrink-0' };
/** With the sidebar open the table loses 360 px: Client, Review status and Status narrow. */
const COMPACT = { client: 'w-[220px] shrink-0', form: 'min-w-0 flex-1', review: 'w-[150px] shrink-0', status: 'w-[140px] shrink-0', action: 'w-[208px] shrink-0' };

const responsesOf = (todoId: string) => {
  const d = todoDetails[todoId];
  return d?.kind === 'respond' ? d.responseCount : undefined;
};
const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${s}`;
};
const waited = (days: number) => (days === 0 ? 'Today' : days === 1 ? 'Waiting 1 day' : `Waiting ${days} days`);

export function FormReviewTable({ query }: { query: string }) {
  const { state } = useStore();
  const [open, setOpen] = useState({ waiting: true, reviewed: true });
  const cols = sideIsSidebar(state) ? COMPACT : WIDE;
  const past = state.weekOffset !== 0;
  // Forms waiting on review are today's queue; a past week's were reviewed long since.
  const rows = past
    ? []
    : formRows(clientsInWeek(0), state.todos, DEMO_TODAY, (c) => getProfile(c.id).forms, responsesOf).filter(
        (r) => !query || r.client.name.toLowerCase().includes(query) || r.form.toLowerCase().includes(query),
      );
  const waiting = rows.filter((r) => !r.reviewed);
  const reviewed = rows.filter((r) => r.reviewed);

  return (
    <div className="flex flex-col gap-2">
      <div className="sticky top-0 z-10 flex h-10 items-center rounded-t-lg border-b border-line bg-white">
        <div className={`${cols.client} py-2.5 pl-4 pr-3 ${HEAD}`}>Client</div>
        <div className={`${cols.form} px-4 py-2.5 ${HEAD}`}>Form</div>
        <div className={`${cols.review} px-4 py-2.5 ${HEAD}`}>Review status</div>
        <div className={`${cols.status} flex items-center gap-1.5 px-4 py-2.5`}>
          <span className="bg-clip-text text-[13px] font-semibold leading-[1.5] text-transparent" style={{ backgroundImage: AI_GRADIENT }}>
            Status
          </span>
          <AiPill />
        </div>
        <div className={`${cols.action} py-2.5 pl-4 pr-3 ${HEAD}`}>Action</div>
      </div>
      <Section
        title="Waiting for review"
        rows={waiting}
        cols={cols}
        open={open.waiting}
        onToggle={() => setOpen((o) => ({ ...o, waiting: !o.waiting }))}
        empty={past ? 'Forms to review are today’s queue; this week’s were all reviewed.' : query ? 'No waiting form matches your search.' : 'No forms are waiting for review.'}
      />
      <Section
        title="Reviewed today"
        rows={reviewed}
        cols={cols}
        open={open.reviewed}
        onToggle={() => setOpen((o) => ({ ...o, reviewed: !o.reviewed }))}
        empty="Forms you mark as reviewed today move here."
      />
    </div>
  );
}

type Cols = typeof WIDE;

function Section({ title, rows, cols, open, onToggle, empty }: { title: string; rows: FormRow[]; cols: Cols; open: boolean; onToggle: () => void; empty: string }) {
  return (
    <section>
      <SectionHeader title={title} count={rows.length} open={open} onToggle={onToggle} />
      {open && (
        <div className="mt-2">
          {rows.length ? (
            rows.map((r) => <FormRowView key={`${r.client.id}:${r.form}`} row={r} cols={cols} />)
          ) : (
            <p className="px-4 py-4 text-[13px] leading-[1.5] text-ink-muted">{empty}</p>
          )}
        </div>
      )}
    </section>
  );
}

const ICON_BASE = 'group/tip relative flex size-8 items-center justify-center rounded-md border border-black/15';

function FormRowView({ row, cols }: { row: FormRow; cols: Cols }) {
  const { state, selectTodo, selectClient, toggleComplete, showToast, openInbox } = useStore();
  const { client } = row;
  const ref = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const selected = row.todoId ? state.selectedTodoId === row.todoId : state.selectedClientId === client.id;
  const openForm = () => (row.todoId ? selectTodo(row.todoId) : selectClient(client.id, 'form'));

  // ✓: the row slides left and fades, then the review lands and the row shows in the other section.
  const toggle = () => {
    if (!row.todoId) return;
    const id = row.todoId;
    const land = () => {
      toggleComplete(id);
      showToast(row.reviewed ? `${client.firstName}’s form is back in the queue` : `${client.firstName}’s form marked as reviewed`);
    };
    const el = ref.current;
    if (!el || reducedMotion()) return land();
    if (leaving.current) return;
    leaving.current = true;
    const h = el.offsetHeight;
    el.style.overflow = 'hidden';
    el.style.pointerEvents = 'none';
    el.animate(
      [
        { transform: 'translateX(0)', opacity: 1, height: `${h}px` },
        { transform: 'translateX(-24%)', opacity: 0, height: `${h}px`, offset: 0.55 },
        { transform: 'translateX(-24%)', opacity: 0, height: '0px', borderBottomWidth: '0px' },
      ],
      { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
    ).onfinish = land;
  };

  const long = row.waitingDays >= LONG_WAIT_DAYS;
  const meta = [`Submitted ${formatMonthDay(parseDay(row.submittedOn))}`, row.responses ? `${ordinal(row.responses)} response` : null].filter(Boolean).join(' • ');

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      data-client-row
      aria-current={selected ? 'true' : undefined}
      aria-label={`${row.form} from ${client.name}`}
      onClick={openForm}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openForm();
        }
      }}
      className={`flex cursor-pointer items-center border-b border-line outline-none focus-visible:bg-surface-secondary ${selected ? 'bg-surface-secondary' : 'hover:bg-elevated'}`}
    >
      <ClientCell client={client} className={cols.client} />
      <div className={`${cols.form} flex items-center gap-3 px-4 py-3`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/[0.08]">
          <img src={iconClipboard} alt="" width={14} height={15} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className={`truncate text-[14px] font-semibold leading-[1.5] ${row.reviewed ? 'text-ink-secondary' : 'text-ink'}`}>{row.form}</span>
          <span className="truncate text-[12px] leading-[1.5] text-ink-secondary">{meta}</span>
        </span>
      </div>
      <div className={`${cols.review} px-4 py-3`}>
        {row.reviewed ? (
          <span className="inline-flex h-[21px] items-center gap-1 whitespace-nowrap rounded-full bg-status-track-bg px-2 text-[12px] font-semibold leading-[15px] text-status-track-fg">
            Reviewed
          </span>
        ) : (
          <span
            className={`inline-flex h-[21px] items-center whitespace-nowrap rounded-full px-2 text-[12px] font-semibold leading-[15px] ${
              long ? 'bg-status-risk-bg text-status-risk-fg' : 'bg-status-attention-bg text-status-attention-fg'
            }`}
          >
            {waited(row.waitingDays)}
          </span>
        )}
      </div>
      <div className={`${cols.status} px-4 py-3`}>
        <StatusChip status={client.status} />
      </div>
      <div className={`${cols.action} flex items-center gap-1 py-2 pl-4 pr-3`} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={openForm}
          className="flex h-8 items-center whitespace-nowrap rounded-md border border-black/15 bg-white px-3 text-[13px] font-semibold leading-[1.5] text-ink hover:bg-surface-secondary"
        >
          {row.reviewed ? 'View form' : 'Review form'}
        </button>
        {row.todoId && (
          <button
            type="button"
            aria-label={row.reviewed ? 'Undo form review' : 'Mark form as reviewed'}
            aria-pressed={row.reviewed}
            onClick={toggle}
            className={row.reviewed ? `${ICON_BASE} bg-checked hover:brightness-110` : `${ICON_BASE} bg-white hover:bg-surface-secondary`}
          >
            <span className="relative size-4">
              <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
                <img src={row.reviewed ? iconMarkDoneChecked : iconMarkDone} alt="" className="block size-full max-w-none" />
              </span>
            </span>
            <Tooltip label={row.reviewed ? 'Undo form review' : 'Mark form as reviewed'} />
          </button>
        )}
        <button type="button" aria-label="Send message" onClick={() => openInbox(client.id)} className={`${ICON_BASE} bg-white hover:bg-surface-secondary`}>
          <img src={iconMessage} alt="" width={16.2} height={16.2} />
          <Tooltip label="Send message" />
        </button>
      </div>
    </div>
  );
}
