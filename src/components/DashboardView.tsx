import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import iconCalendarDays from '../assets/figma/icon-calendar-days.svg';
import iconColumns from '../assets/figma/icon-columns.svg';
import iconDownViews from '../assets/figma/icon-down-views.svg';
import iconDropdown from '../assets/figma/icon-dropdown.svg';
import iconPencilAiSm from '../assets/figma/icon-pencil-ai-sm.svg';
import iconPlusView from '../assets/figma/icon-plus-view.svg';
import iconSearch from '../assets/figma/icon-search-note.svg';
import { clients } from '../data/mock';
import { getProfile } from '../data/profiles';
import type { Client, MetricKey, StatusChange } from '../data/types';
import { cardMembers } from '../lib/groups';
import { activityLine, byUrgency, hasFormToReview, inTab, lastActive, statusLine, type ActivityLine, type DashboardTab } from '../lib/dashboard';
import { clientsInWeek, weekAsOf } from '../lib/week';
import { sideIsSidebar, useStore } from '../state/store';
import { AiPill } from './AiPill';
import { BookingTable } from './BookingTable';
import { ClientActions } from './ClientActions';
import { ClientCell, HEAD, reducedMotion, rowProps, SectionHeader } from './ClientListParts';
import { AI_GRADIENT } from './drawer/AiAssessment';
import { Glyph } from './Glyph';
import { METRICS } from './metrics';
import { STATUS_LABEL, StatusChip } from './StatusChip';

/**
 * The client-list view (Figma 5676:145292): the metric row (the brief's seven unless the coach customized it), the tabs, search and filters, and the client
 * table split into Need Review and Review Completed. Marking a client reviewed here is the same review as a
 * Check-in to-do's (brief, S3 BL5), so the row moves between sections and the to-do completes.
 */

const TABS: { tab: DashboardTab; label: string; noCount?: boolean }[] = [
  { tab: 'all', label: 'All clients' },
  { tab: 'booking', label: 'Booking', noCount: true },
  { tab: 'at_risk', label: 'At risk' },
  { tab: 'needs_attention', label: 'Needs attention' },
  { tab: 'on_track', label: 'On track' },
  { tab: 'program_ending', label: 'Program ending' },
  { tab: 'no_activities', label: 'No activities' },
  { tab: 'form_review', label: 'Form to review' },
  { tab: 'review_completed', label: 'Review completed' },
  { tab: 'paused', label: 'Paused' },
];


/** Everything a row shows, computed once per client from its profile. */
interface Row {
  client: Client;
  status: string;
  activity: ActivityLine | null;
  lastActive: string;
}

const rowCache = new Map<number, Row[]>();

/** The rows as of a week's Monday morning; the current week is the live data. */
function rowsInWeek(offset: number): Row[] {
  let rows = rowCache.get(offset);
  if (!rows) {
    const asOf = weekAsOf(offset);
    rows = clientsInWeek(offset).map((client) => {
      const profile = getProfile(client.id);
      return {
        client,
        status: statusLine(client, profile, asOf),
        activity: activityLine(client, profile, asOf),
        lastActive: lastActive(profile, asOf),
      };
    });
    rowCache.set(offset, rows);
  }
  return rows;
}

export function DashboardView() {
  const { state, setDashboardTab, reviewedNow } = useStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState({ need: true, done: true });
  // The client whose row just changed section, so its new row animates in once.
  const [arrived, setArrived] = useState<string | null>(null);
  useEffect(() => {
    if (!arrived) return;
    const t = window.setTimeout(() => setArrived(null), ROW_IN_MS + 100);
    return () => window.clearTimeout(t);
  }, [arrived]);

  const offset = state.weekOffset;
  // Forms waiting on review are today's queue; a past week's were reviewed long since.
  const formToReview = useMemo(
    () => new Set(offset === 0 ? clients.filter((c) => hasFormToReview(c, getProfile(c.id), state.todos)).map((c) => c.id) : []),
    [state.todos, offset],
  );
  const weekClients = clientsInWeek(offset);
  const ctx = (c: Client) => ({ formToReview: formToReview.has(c.id), reviewed: reviewedNow(c.id) });
  const count = (tab: DashboardTab) => weekClients.filter((c) => inTab(tab, c, ctx(c))).length;
  // Upcoming bookings counts its group, as the rail card does (the Booking tab has no count); the rest count their tab.
  const metricCount = (key: MetricKey) =>
    key === 'upcoming_bookings'
      ? cardMembers(key, offset, { todos: state.todos, reviewed: reviewedNow }).length
      : count(METRICS[key].tab);

  const q = query.trim().toLowerCase();
  const rows = rowsInWeek(offset).filter(
    ({ client: c }) =>
      inTab(state.dashboardTab, c, ctx(c)) &&
      (!q || c.name.toLowerCase().includes(q)),
  ).sort((a, b) => byUrgency(a.client, b.client));
  const need = rows.filter((r) => !reviewedNow(r.client.id));
  const done = rows.filter((r) => reviewedNow(r.client.id));

  return (
    <div className="flex min-h-full flex-col bg-surface-secondary">
      <div className="flex gap-2 p-3">
        {state.metrics.map((key) => METRICS[key]).map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setDashboardTab(m.tab)}
            className={`flex min-w-0 flex-1 basis-0 flex-col gap-3 overflow-hidden rounded-lg border bg-white px-3 py-4 text-left hover:border-line-light hover:shadow-card ${
              state.dashboardTab === m.tab ? 'border-brand/40' : 'border-line'
            }`}
          >
            <span className="flex items-center gap-2">
              <Glyph src={m.icon.src} size={20} inset={m.icon.inset} bleed={m.icon.bleed} />
              <span className="truncate text-[14px] font-semibold leading-[1.5] tracking-[-0.28px] text-ink">{m.label}</span>
            </span>
            <span className="px-1 text-[20px] font-semibold leading-[1.2] tracking-[-0.4px] text-ink tabular-nums">{metricCount(m.key)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 bg-white px-4 pb-4 pt-4">
        <Tabs current={state.dashboardTab} count={count} onSelect={setDashboardTab} />
        <SearchAndFilters query={query} onQuery={setQuery} booking={state.dashboardTab === 'booking'} />
        {state.dashboardTab === 'booking' ? (
          <BookingTable query={q} />
        ) : (
        <div className="flex flex-col gap-2">
          <TableHeader />
          <Section
            title="Need Review"
            rows={need}
            open={open.need}
            onToggle={() => setOpen((o) => ({ ...o, need: !o.need }))}
            empty="Everyone in this view has been reviewed this week."
            arrived={arrived}
            onMoved={setArrived}
          />
          <Section
            title="Review Completed"
            rows={done}
            open={open.done}
            onToggle={() => setOpen((o) => ({ ...o, done: !o.done }))}
            empty="Clients you mark as reviewed this week move here."
            arrived={arrived}
            onMoved={setArrived}
          />
        </div>
        )}
      </div>
    </div>
  );
}

function Tabs({ current, count, onSelect }: { current: DashboardTab; count: (tab: DashboardTab) => number; onSelect: (tab: DashboardTab) => void }) {
  const { showToast } = useStore();
  return (
    <div role="tablist" aria-label="Client views" className="flex h-[37px] items-center border-b border-line">
      <div className="flex min-w-0 flex-1 items-center">
        <div className="scroll-none flex min-w-0 flex-1 items-center overflow-x-auto">
          {TABS.map((t) => {
            const active = t.tab === current;
            return (
              <button
                key={t.tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(t.tab)}
                className={`flex h-[37px] shrink-0 items-center gap-1.5 border-b-2 px-4 pt-0.5 text-[14px] font-semibold tracking-[-0.28px] ${
                  active ? 'border-brand text-brand' : 'border-transparent text-ink-secondary hover:text-ink'
                }`}
              >
                {t.tab === 'booking' && <Glyph src={iconCalendarDays} size={20} inset="8.32% 12.5%" bleed="-4.5% -5%" />}
                {t.label}
                {!t.noCount && (
                  <span
                    className={`min-w-[19px] rounded-[4px] px-[3px] py-0.5 text-center text-[11px] font-semibold leading-normal tabular-nums ${
                      active ? 'bg-brand/10 text-brand' : 'bg-ink/5 text-ink-secondary'
                    }`}
                  >
                    {count(t.tab)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button type="button" aria-label="Add view" onClick={() => showToast('Saved views come in Phase 3')} className="flex h-9 shrink-0 items-center p-2 hover:opacity-70">
          <img src={iconPlusView} alt="" width={18} height={18} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => showToast('Saved views come in Phase 3')}
        className="flex shrink-0 items-center gap-1.5 py-2 pl-4 pr-3 text-[14px] font-semibold tracking-[-0.28px] text-ink-secondary hover:text-ink"
      >
        All Views
        <img src={iconDownViews} alt="" width={20} height={20} />
      </button>
    </div>
  );
}

const FIELD = 'flex h-[38px] shrink-0 items-center overflow-hidden rounded-[5px] border border-line-input bg-white';

/** The Booking tab draws no Status dropdown. */
function SearchAndFilters({ query, onQuery, booking }: { query: string; onQuery: (q: string) => void; booking: boolean }) {
  const { showToast } = useStore();
  const notBuilt = () => showToast('Filters work as in v1; not part of this demo');
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <label className={`${FIELD} w-[376px] gap-2.5 px-3`}>
          <Glyph src={iconSearch} size={20} inset="15% 14.69% 14.69% 15%" bleed="-3.56%" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search client"
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-[1.5] text-ink outline-none placeholder:text-ink-tertiary"
          />
        </label>
        <button type="button" onClick={notBuilt} className={`${FIELD} w-40 gap-0.5 px-5 text-[13px] leading-[1.5] text-ink-tertiary`}>
          <span className="flex-1 text-left">All Coaches</span>
          <img src={iconDropdown} alt="" width={20} height={20} />
        </button>
        <button type="button" onClick={notBuilt} className={`${FIELD} gap-4 px-5 text-[13px] leading-[1.5]`}>
          <span className="flex gap-1">
            <span className="text-ink-tertiary">Group:</span>
            <span className="font-semibold text-ink">All</span>
          </span>
          <img src={iconDropdown} alt="" width={20} height={20} />
        </button>
        {!booking && (
          <button type="button" onClick={notBuilt} className={`${FIELD} w-40 gap-0.5 px-5 text-[13px] leading-[1.5] text-ink-tertiary`}>
            <span className="flex-1 text-left">Status</span>
            <img src={iconDropdown} alt="" width={20} height={20} />
          </button>
        )}
      </div>
      <button type="button" aria-label="Columns" onClick={notBuilt} className={`${FIELD} gap-2 px-3`}>
        <img src={iconColumns} alt="" width={20} height={20} />
        <img src={iconDropdown} alt="" width={20} height={20} />
      </button>
    </div>
  );
}

/** Column widths from the frame: Client 280 · Status (fills) · Activity 440 · Last active 111 · Action 164. */
const WIDE_COLS = { client: 'w-[280px] shrink-0', status: 'min-w-0 flex-1', activity: 'w-[440px] shrink-0', last: 'w-[111px] shrink-0', action: 'w-[164px] shrink-0' };
/** With the sidebar open (`sideIsSidebar`) the table loses 360 px: Client and Last active narrow, Status and Activity share the rest. */
const COMPACT_COLS = { client: 'w-[220px] shrink-0', status: 'min-w-0 flex-1', activity: 'min-w-0 flex-1', last: 'w-[108px] shrink-0', action: 'w-[164px] shrink-0' };
function useCols() {
  const { state } = useStore();
  return sideIsSidebar(state) ? COMPACT_COLS : WIDE_COLS;
}

function TableHeader() {
  const COL = useCols();
  return (
    <div className="sticky top-0 z-10 flex h-10 items-center rounded-t-lg border-b border-line bg-white">
      <div className={`${COL.client} py-2.5 pl-4 pr-3 ${HEAD}`}>Client</div>
      <div className={`${COL.status} flex items-center gap-1.5 px-4 py-2.5`}>
        <span className="bg-clip-text text-[13px] font-semibold leading-[1.5] text-transparent" style={{ backgroundImage: AI_GRADIENT }}>
          Status
        </span>
        <AiPill />
      </div>
      <div className={`${COL.activity} px-4 py-2.5 ${HEAD}`}>Activity</div>
      <div className={`${COL.last} px-4 py-2.5 ${HEAD}`}>Last active</div>
      <div className={`${COL.action} py-2.5 pl-4 pr-3 text-center ${HEAD}`}>Action</div>
    </div>
  );
}

interface SectionProps {
  title: string;
  rows: Row[];
  open: boolean;
  onToggle: () => void;
  empty: string;
  arrived: string | null;
  onMoved: (clientId: string) => void;
}

function Section({ title, rows, open, onToggle, empty, arrived, onMoved }: SectionProps) {
  return (
    <section>
      <SectionHeader title={title} count={rows.length} open={open} onToggle={onToggle} />
      {open && (
        <div className="mt-2">
          {rows.length ? rows.map((row) => <ClientRow key={row.client.id} row={row} arriving={arrived === row.client.id} onMoved={onMoved} />) : <p className="px-4 py-4 text-[13px] leading-[1.5] text-ink-muted">{empty}</p>}
        </div>
      )}
    </section>
  );
}

const ROW_OUT_MS = 520;
const ROW_IN_MS = 420;
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

function ClientRow({ row, arriving, onMoved }: { row: Row; arriving: boolean; onMoved: (clientId: string) => void }) {
  const { state, selectClient, toggleReview } = useStore();
  const COL = useCols();
  const { client } = row;
  const selected = state.selectedClientId === client.id;
  // A status the coach changed this week shows in the Activity column instead of the activity line.
  const change = state.weekOffset === 0 ? state.statusChanges[client.id] : undefined;
  const ref = useRef<HTMLDivElement>(null);
  const leaving = useRef(false);

  // ✓ on the list: the row slides left and fades, the gap closes, then the review lands and the row appears in the
  // other section.
  const moveOut = () => {
    const el = ref.current;
    const land = () => {
      onMoved(client.id);
      toggleReview(client.id);
    };
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
      { duration: ROW_OUT_MS, easing: EASE, fill: 'forwards' },
    ).onfinish = land;
  };

  // The moved row opens its space in the new section, then fades in from the right.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!arriving || !el || reducedMotion()) return;
    const h = el.offsetHeight;
    el.style.overflow = 'hidden';
    const a = el.animate(
      [
        { transform: 'translateX(24px)', opacity: 0, height: '0px' },
        { transform: 'translateX(24px)', opacity: 0, height: `${h}px`, offset: 0.4 },
        { transform: 'translateX(0)', opacity: 1, height: `${h}px` },
      ],
      { duration: ROW_IN_MS, easing: EASE },
    );
    a.onfinish = () => (el.style.overflow = '');
    // Mount only: a row animates in once, when it changes section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} {...rowProps(client, selected, selectClient)}>
      <ClientCell client={client} className={COL.client} />
      <div className={`${COL.status} flex flex-col items-start gap-1 px-4 py-3`}>
        <StatusChip status={client.status} />
        <p className="text-[13px] leading-[1.5] text-ink">{row.status}</p>
      </div>
      <div className={`${COL.activity} px-4 py-3`}>
        {change ? <StatusChangeLine change={change} /> : row.activity && <Activity client={client} line={row.activity} />}
      </div>
      <div className={`${COL.last} px-4 py-3 text-[13px] leading-[1.5] text-ink/60`}>{row.lastActive}</div>
      <div className={`${COL.action} flex justify-center px-3 py-2`}>
        <ClientActions client={client} where="list" onToggleReview={moveOut} />
      </div>
    </div>
  );
}

/** The coach's change this week, in place of the activity line: "~~At risk~~ → Needs attention", then the reason. */
function StatusChangeLine({ change }: { change: StatusChange }) {
  return (
    <div className="flex flex-col items-start gap-1 text-[13px] leading-[1.5] text-ink">
      <p>
        <span className="text-ink-secondary line-through">{STATUS_LABEL[change.from]}</span> →{' '}
        <span className="font-semibold">{STATUS_LABEL[change.to]}</span>
      </p>
      {change.reason && (
        <p>
          <span className="text-ink-secondary">Reason:</span> {change.reason}
        </p>
      )}
    </div>
  );
}

function Activity({ client, line }: { client: Client; line: ActivityLine }) {
  const { openInbox, openOlly } = useStore();
  const text = line.parts.map((p, i) =>
    p.strong ? (
      <span key={i} className="font-semibold">
        {p.text}
      </span>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
  return (
    <div className="flex flex-col items-start gap-2 text-[13px] leading-[1.5] text-ink">
      <p>
        {text}
        {line.action === 'follow_up' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openInbox(client.id);
            }}
            className="ml-2 font-bold text-brand underline hover:opacity-80"
          >
            Follow Up
          </button>
        )}
        {line.note && (
          <>
            <br />
            {line.note}
          </>
        )}
      </p>
      {line.action === 'draft_reach_out' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openOlly(client.id, { mode: 'draft' });
          }}
          className="ai-btn flex h-7 items-center gap-1 rounded-[4px] border border-[#e0e0e0] bg-white px-2 text-[12px] font-semibold leading-[1.5] tracking-[-0.24px] text-ink shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
        >
          <img src={iconPencilAiSm} alt="" width={18} height={18} />
          Draft a reach out
        </button>
      )}
    </div>
  );
}
