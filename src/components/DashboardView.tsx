import { useMemo, useState } from 'react';
import iconCalendarDays from '../assets/figma/icon-calendar-days.svg';
import iconColumns from '../assets/figma/icon-columns.svg';
import iconDownViews from '../assets/figma/icon-down-views.svg';
import iconDropdown from '../assets/figma/icon-dropdown.svg';
import iconPencilAiSm from '../assets/figma/icon-pencil-ai-sm.svg';
import iconPlusView from '../assets/figma/icon-plus-view.svg';
import iconExpand from '../assets/figma/icon-row-expanded.svg';
import iconSearch from '../assets/figma/icon-search-note.svg';
import statAtRisk from '../assets/figma/stat-at-risk.svg';
import statFormReview from '../assets/figma/stat-form-review.svg';
import statNeedsAttention from '../assets/figma/stat-needs-attention.svg';
import statNoActivities from '../assets/figma/stat-no-activities.svg';
import statOnTrack from '../assets/figma/stat-on-track.svg';
import statProgramEnding from '../assets/figma/stat-program-ending.svg';
import statReviewCompleted from '../assets/figma/stat-review-completed.svg';
import { DEMO_TODAY, clients } from '../data/mock';
import { getProfile } from '../data/profiles';
import type { Client, ClientStatus } from '../data/types';
import { activityLine, byUrgency, hasFormToReview, inTab, lastActive, statusLine, type ActivityLine, type DashboardTab } from '../lib/dashboard';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { ClientActions } from './ClientActions';
import { AI_GRADIENT } from './drawer/AiAssessment';
import { Glyph } from './Glyph';
import { StatusChip } from './StatusChip';

/**
 * The client-list view (Figma 5676:145292): the seven-card metric row, the tabs, search and filters, and the client
 * table split into Need Review and Review Completed. Marking a client reviewed here is the same review as a
 * Check-in to-do's (brief, S3 BL5), so the row moves between sections and the to-do completes.
 */

type Icon = { src: string; inset: string; bleed: string };

/** Seven cards: the four statuses, then the three workflow cards. Paused keeps its tab only (brief). */
const METRICS: { tab: DashboardTab; label: string; icon: Icon }[] = [
  { tab: 'at_risk', label: 'At risk', icon: { src: statAtRisk, inset: '8.33% 8.33% 8.34% 8.34%', bleed: '-4.41%' } },
  { tab: 'needs_attention', label: 'Needs attention', icon: { src: statNeedsAttention, inset: '12.5%', bleed: '-4.18%' } },
  { tab: 'on_track', label: 'On track', icon: { src: statOnTrack, inset: '8.33%', bleed: '-4.17%' } },
  { tab: 'no_activities', label: 'No activities', icon: { src: statNoActivities, inset: '0', bleed: '0' } },
  { tab: 'program_ending', label: 'Program ending', icon: { src: statProgramEnding, inset: '8.33% 12.5%', bleed: '-3.75% -4.17%' } },
  { tab: 'form_review', label: 'Form to review', icon: { src: statFormReview, inset: '8.33% 12.5%', bleed: '-3.75% -4.17%' } },
  { tab: 'review_completed', label: 'Review completed', icon: { src: statReviewCompleted, inset: '8.32% 8.33% 8.33% 8.34%', bleed: '-3.75% -3.76% -3.75% -3.75%' } },
];

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

const DOT: Record<ClientStatus, string> = {
  at_risk: 'bg-status-risk-dot',
  needs_attention: 'bg-status-attention-dot',
  on_track: 'bg-status-track-dot',
  no_activities: 'bg-ink-muted',
};

/** Everything a row shows, computed once per client from its profile. */
interface Row {
  client: Client;
  status: string;
  activity: ActivityLine | null;
  lastActive: string;
}

const ROWS: Row[] = clients.map((client) => {
  const profile = getProfile(client.id);
  return {
    client,
    status: statusLine(client, profile, DEMO_TODAY),
    activity: activityLine(client, profile, DEMO_TODAY),
    lastActive: lastActive(profile, DEMO_TODAY),
  };
});

export function DashboardView() {
  const { state, setDashboardTab } = useStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState({ need: true, done: true });

  const formToReview = useMemo(
    () => new Set(clients.filter((c) => hasFormToReview(c, getProfile(c.id), state.todos)).map((c) => c.id)),
    [state.todos],
  );
  const count = (tab: DashboardTab) =>
    clients.filter((c) => inTab(tab, c, { formToReview: formToReview.has(c.id), reviewed: Boolean(state.reviewed[c.id]) })).length;

  const q = query.trim().toLowerCase();
  const rows = ROWS.filter(
    ({ client: c }) =>
      inTab(state.dashboardTab, c, { formToReview: formToReview.has(c.id), reviewed: Boolean(state.reviewed[c.id]) }) &&
      (!q || c.name.toLowerCase().includes(q)),
  ).sort((a, b) => byUrgency(a.client, b.client));
  const need = rows.filter((r) => !state.reviewed[r.client.id]);
  const done = rows.filter((r) => state.reviewed[r.client.id]);

  return (
    <div className="flex min-h-full flex-col bg-surface-secondary">
      <div className="flex gap-2 p-3">
        {METRICS.map((m) => (
          <button
            key={m.tab}
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
            <span className="px-1 text-[20px] font-semibold leading-[1.2] tracking-[-0.4px] text-ink tabular-nums">{count(m.tab)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4 bg-white px-4 pb-4 pt-4">
        <Tabs current={state.dashboardTab} count={count} onSelect={setDashboardTab} />
        <SearchAndFilters query={query} onQuery={setQuery} />
        <div className="flex flex-col gap-2">
          <TableHeader />
          <Section title="Need Review" rows={need} open={open.need} onToggle={() => setOpen((o) => ({ ...o, need: !o.need }))} empty="Everyone in this view has been reviewed this week." />
          <Section
            title="Review Completed"
            rows={done}
            open={open.done}
            onToggle={() => setOpen((o) => ({ ...o, done: !o.done }))}
            empty="Clients you mark as reviewed this week move here."
          />
        </div>
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

function SearchAndFilters({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
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
        <button type="button" onClick={notBuilt} className={`${FIELD} w-40 gap-0.5 px-5 text-[13px] leading-[1.5] text-ink-tertiary`}>
          <span className="flex-1 text-left">Status</span>
          <img src={iconDropdown} alt="" width={20} height={20} />
        </button>
      </div>
      <button type="button" aria-label="Columns" onClick={notBuilt} className={`${FIELD} gap-2 px-3`}>
        <img src={iconColumns} alt="" width={20} height={20} />
        <img src={iconDropdown} alt="" width={20} height={20} />
      </button>
    </div>
  );
}

/** Column widths from the frame: Client 280 · Status (fills) · Activity 440 · Last active 111 · Action 164. */
const COL = { client: 'w-[280px] shrink-0', status: 'min-w-0 flex-1', activity: 'w-[440px] shrink-0', last: 'w-[111px] shrink-0', action: 'w-[164px] shrink-0' };
const HEAD = 'text-[13px] font-semibold leading-[1.5] text-ink/50';

function TableHeader() {
  return (
    <div className="sticky top-0 z-10 flex h-10 items-center rounded-t-lg border-b border-line bg-white">
      <div className={`${COL.client} py-2.5 pl-4 pr-3 ${HEAD}`}>Client</div>
      <div className={`${COL.status} flex items-center gap-1.5 px-4 py-2.5`}>
        <span className="bg-clip-text text-[13px] font-semibold leading-[1.5] text-transparent" style={{ backgroundImage: AI_GRADIENT }}>
          Status
        </span>
        <span
          className="rounded-full border border-black/40 px-[7px] py-0.5 font-display text-[10px] font-bold leading-normal text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.25)]"
          style={{ backgroundImage: 'radial-gradient(100% 160% at 50% 100%, #d64fff 25%, #a052f4 44%, #6b55ea 62%, #3559df 81%, #005cd4 100%)' }}
        >
          AI
        </span>
      </div>
      <div className={`${COL.activity} px-4 py-2.5 ${HEAD}`}>Activity</div>
      <div className={`${COL.last} px-4 py-2.5 ${HEAD}`}>Last active</div>
      <div className={`${COL.action} py-2.5 pl-4 pr-3 text-center ${HEAD}`}>Action</div>
    </div>
  );
}

function Section({ title, rows, open, onToggle, empty }: { title: string; rows: Row[]; open: boolean; onToggle: () => void; empty: string }) {
  return (
    <section>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex h-12 w-full items-center gap-2 rounded-lg bg-surface-secondary p-3 text-left">
        <img src={iconExpand} alt="" width={16} height={16} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="text-[16px] font-semibold leading-[1.5] text-ink">{title}</span>
        <span className="min-w-[19px] rounded-[4px] border border-line-chip bg-white px-[3px] py-0.5 text-center text-[11px] font-semibold leading-normal text-ink/80 tabular-nums">
          {rows.length}
        </span>
      </button>
      {open && (
        <div className="mt-2">
          {rows.length ? rows.map((row) => <ClientRow key={row.client.id} row={row} />) : <p className="px-4 py-4 text-[13px] leading-[1.5] text-ink-muted">{empty}</p>}
        </div>
      )}
    </section>
  );
}

function ClientRow({ row }: { row: Row }) {
  const { state, selectClient } = useStore();
  const { client } = row;
  const selected = state.selectedClientId === client.id;
  const ends = client.programEndsInDays;
  return (
    <div
      role="button"
      tabIndex={0}
      data-client-row
      aria-current={selected ? 'true' : undefined}
      onClick={() => selectClient(client.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectClient(client.id);
        }
      }}
      className={`flex cursor-pointer items-center border-b border-line outline-none focus-visible:bg-surface-secondary ${
        selected ? 'bg-surface-secondary' : 'hover:bg-elevated'
      }`}
    >
      <div className={`${COL.client} flex items-center gap-3 p-3`}>
        <span className={`size-2 shrink-0 rounded-full ${DOT[client.status]}`} />
        <Avatar name={client.name} src={client.avatar} size={40} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] font-bold leading-[1.5] text-ink">{client.name}</span>
          {ends !== undefined && ends >= 0 && (
            <span className="text-[12px] font-semibold leading-[1.5] text-ink-secondary">{ends === 0 ? 'Program ends today' : `Program ends ${ends}d`}</span>
          )}
        </span>
      </div>
      <div className={`${COL.status} flex flex-col items-start gap-1 px-4 py-3`}>
        <StatusChip status={client.status} />
        <p className="text-[13px] leading-[1.5] text-ink">{row.status}</p>
      </div>
      <div className={`${COL.activity} px-4 py-3`}>{row.activity && <Activity client={client} line={row.activity} />}</div>
      <div className={`${COL.last} px-4 py-3 text-[13px] leading-[1.5] text-ink/60`}>{row.lastActive}</div>
      <div className={`${COL.action} flex justify-center px-3 py-2`}>
        <ClientActions client={client} where="list" />
      </div>
    </div>
  );
}

function Activity({ client, line }: { client: Client; line: ActivityLine }) {
  const { showToast } = useStore();
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
              showToast(`The message composer opens beside the list for ${client.firstName}`);
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
            showToast(`Draft with AI opens beside the list with a reach-out to ${client.firstName}`);
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
