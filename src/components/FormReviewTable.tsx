import { useRef, useState } from 'react';
import iconCompare from '../assets/figma/icon-compare.svg';
import iconMarkDoneChecked from '../assets/figma/icon-markdone-checked.svg';
import iconMarkDone from '../assets/figma/icon-markdone.svg';
import { DEMO_TODAY } from '../data/mock';
import { getProfile } from '../data/profiles';
import { formReviewRows, type FormRow } from '../lib/dashboard';
import { formatMonthDay, parseDay } from '../lib/dates';
import { daysAgo, plural, time12 } from '../lib/todos';
import { clientsInWeek } from '../lib/week';
import { sideIsSidebar, useStore } from '../state/store';
import { ClientCell, HEAD, reducedMotion, SectionHeader } from './ClientListParts';
import { DraftReminderButton } from './drawer/SessionsBodies';
import { Tooltip } from './Tooltip';

/**
 * The client list's Form to review tab (the user's call, no frame): one row per form, with the columns of the client
 * detail page's Form tab (`FormStatus`) after the client: Client · Form name (+ "6 responses | Latest response: Aug 28
 * - 9:14 PM") · Response status · Last submitted · Coach action · Action. Sections Waiting for review (longest wait
 * first; Compare responses with 2 or more, ✓ Mark form as reviewed), Overdue (Draft a reminder) and Reviewed today.
 * A row opens its to-do's panel (Respond, or Remind for Leo), else the client on the Form tab; ✓ completes the Respond
 * to-do, which is the form review (Spec 4 AC3.5), so it never counts as a check-in review.
 */

const WIDE = { client: 'w-[280px] shrink-0', form: 'min-w-0 flex-1', response: 'w-[150px] shrink-0', last: 'w-[140px] shrink-0', coach: 'w-[160px] shrink-0', action: 'w-[160px] shrink-0' };
/** With the sidebar open the table loses 360 px: Client and the status columns narrow; nothing wraps. */
const COMPACT = { client: 'w-[200px] shrink-0', form: 'min-w-0 flex-1', response: 'w-[140px] shrink-0', last: 'w-[124px] shrink-0', coach: 'w-[144px] shrink-0', action: 'w-[160px] shrink-0' };
type Cols = typeof WIDE;

export function FormReviewTable({ query }: { query: string }) {
  const { state } = useStore();
  const [open, setOpen] = useState({ waiting: true, overdue: true, reviewed: true });
  const cols = sideIsSidebar(state) ? COMPACT : WIDE;
  const past = state.weekOffset !== 0;
  // Forms waiting on review are today's queue; a past week's were reviewed long since.
  const rows = past
    ? []
    : formReviewRows(clientsInWeek(0), state.todos, DEMO_TODAY, (c) => getProfile(c.id).forms).filter(
        (r) => !query || r.client.name.toLowerCase().includes(query) || r.form.toLowerCase().includes(query),
      );
  const waiting = rows.filter((r) => r.kind === 'review' && !r.reviewed);
  const overdue = rows.filter((r) => r.kind === 'overdue');
  const reviewed = rows.filter((r) => r.kind === 'review' && r.reviewed);
  const toggle = (key: keyof typeof open) => () => setOpen((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="flex flex-col gap-2">
      <div className="sticky top-0 z-10 flex h-10 items-center whitespace-nowrap rounded-t-lg border-b border-line bg-white">
        <div className={`${cols.client} py-2.5 pl-4 pr-3 ${HEAD}`}>Client</div>
        <div className={`${cols.form} px-4 py-2.5 ${HEAD}`}>Form name</div>
        <div className={`${cols.response} px-4 py-2.5 ${HEAD}`}>Response status</div>
        <div className={`${cols.last} px-4 py-2.5 ${HEAD}`}>Last submitted</div>
        <div className={`${cols.coach} px-4 py-2.5 ${HEAD}`}>Coach action</div>
        <div className={`${cols.action} px-3 py-2.5 text-center ${HEAD}`}>Action</div>
      </div>
      <Section
        title="Waiting for review"
        rows={waiting}
        cols={cols}
        open={open.waiting}
        onToggle={toggle('waiting')}
        empty={past ? 'Forms to review are today’s queue; this week’s were all reviewed.' : query ? 'No waiting form matches your search.' : 'No forms are waiting for review.'}
      />
      <Section
        title="Overdue"
        rows={overdue}
        cols={cols}
        open={open.overdue}
        onToggle={toggle('overdue')}
        empty={past ? 'Overdue forms are today’s.' : query ? 'No overdue form matches your search.' : 'No forms are overdue.'}
      />
      <Section title="Reviewed today" rows={reviewed} cols={cols} open={open.reviewed} onToggle={toggle('reviewed')} empty="Forms you mark as reviewed today move here." />
    </div>
  );
}

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

/** "6 responses | Latest response: Aug 28 - 9:14 PM"; parts the form does not have are left out. */
function formMeta(row: FormRow) {
  const parts = [
    row.responseCount ? plural(row.responseCount, 'response') : null,
    row.submittedOn ? `Latest response: ${formatMonthDay(parseDay(row.submittedOn))}${row.submittedTime ? ` - ${time12(row.submittedTime)}` : ''}` : null,
  ];
  return parts.filter(Boolean).join(' | ');
}

function FormRowView({ row, cols }: { row: FormRow; cols: Cols }) {
  const { state, selectTodo, selectClient, toggleComplete, showToast, openOlly } = useStore();
  const { client } = row;
  const ref = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);
  const overdue = row.kind === 'overdue';
  const selected = row.todoId ? state.selectedTodoId === row.todoId : state.selectedClientId === client.id;
  const openForm = () => (row.todoId ? selectTodo(row.todoId) : selectClient(client.id, 'form'));

  // ✓: the row slides left and fades, then the review lands and the row shows in the other section.
  const toggle = () => {
    if (!row.todoId) return;
    const id = row.todoId;
    const land = () => {
      toggleComplete(id);
      showToast(row.reviewed ? `${client.firstName}’s ${row.form} is back in the queue` : `${client.firstName}’s ${row.form} marked as reviewed`);
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

  const meta = formMeta(row);
  // Compare needs two responses to set side by side (Spec 4 AC3.3); it opens in a new tab.
  const canCompare = !overdue && (row.responseCount ?? 0) >= 2;

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
      className={`flex cursor-pointer items-center whitespace-nowrap border-b border-line text-[13px] leading-[18px] outline-none focus-visible:bg-surface-secondary ${
        selected ? 'bg-surface-secondary' : 'hover:bg-elevated'
      }`}
    >
      <ClientCell client={client} className={cols.client} />
      {/* The Form tab's cells: name · Submitted / Overdue · "3 days ago" · Not yet reviewed / Reviewed. */}
      <span className={`${cols.form} flex flex-col gap-0.5 px-4`}>
        <span className="truncate font-semibold text-ink">{row.form}</span>
        {meta && <span className="truncate text-[12px] leading-[1.5] text-ink-secondary">{meta}</span>}
      </span>
      <span className={`${cols.response} px-4 font-semibold ${overdue ? 'text-status-risk-fg' : 'text-checked'}`}>{overdue ? 'Overdue' : 'Submitted'}</span>
      <span className={`${cols.last} px-4 text-ink`}>{row.submittedOn ? daysAgo(row.submittedOn, DEMO_TODAY) : '—'}</span>
      <span className={`${cols.coach} px-4 font-semibold ${row.reviewed ? 'text-[#059669]' : 'text-ink-muted'}`}>
        {row.submittedOn ? (row.reviewed ? 'Reviewed' : 'Not yet reviewed') : '—'}
      </span>
      <div className={`${cols.action} flex items-center justify-center gap-1 px-3 py-2`} onClick={(e) => e.stopPropagation()}>
        {overdue ? (
          <DraftReminderButton onClick={() => openOlly(client.id, { mode: 'draft', formName: row.form })} />
        ) : (
          <>
            {canCompare && (
              <button
                type="button"
                aria-label="Compare responses"
                onClick={() => showToast(`Compare response opens ${row.responseCount} ${row.form} responses in a new tab`)}
                className={`${ICON_BASE} bg-white hover:bg-surface-secondary`}
              >
                <img src={iconCompare} alt="" width={18} height={18} />
                <Tooltip end label="Compare responses" />
              </button>
            )}
            {/* Holds Compare's place, so every row's ✓ lines up. */}
            {!canCompare && <span className="size-8" aria-hidden />}
            {row.todoId && (
              <button
                type="button"
                aria-label={row.reviewed ? 'Undo form review' : 'Mark form as reviewed'}
                aria-pressed={row.reviewed}
                onClick={toggle}
                className={row.reviewed ? `${ICON_BASE} bg-checked hover:brightness-110` : `${ICON_BASE} bg-white hover:border-brand`}
              >
                <span className="relative size-4">
                  <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
                    <img src={row.reviewed ? iconMarkDoneChecked : iconMarkDone} alt="" className="block size-full max-w-none" />
                  </span>
                </span>
                <Tooltip end label={row.reviewed ? 'Undo form review' : 'Mark form as reviewed'} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
