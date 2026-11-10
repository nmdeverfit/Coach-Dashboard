import { Activity, ArrowUpDown, ChevronDown, Dumbbell, Plus, Search, Settings } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_METRICS, bodyMetrics, type MetricDef, type MetricPoint } from '../data/bodyMetrics';
import { DEMO_TODAY, findPerson } from '../data/mock';
import type { Client } from '../data/types';
import { metricView, type MetricRange } from '../lib/bodyMetrics';
import { addDays } from '../lib/checkin';
import { formatMonthDay, parseDay } from '../lib/dates';
import { useStore } from '../state/store';
import { Avatar } from './Avatar';
import { MetricCard, TimeControl } from './drawer/MetricsTab';

/** The profile's tabs, as Everfit draws them; only Metrics is built in the demo. */
const PROFILE_TABS = ['Overview', 'Training', 'Tasks', 'Sessions', 'Metrics', 'Food Journal', 'Macros', 'Meal Plan', 'Documents', 'Settings'];

/** "11.5K steps", "7 h 57 m", "80 kg": a metric's last value as the All Metrics table reads it. */
function tableValue(def: MetricDef, v: number) {
  if (def.key === 'steps') return v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}K steps` : `${v} steps`;
  if (def.key === 'sleep') return `${Math.floor(v / 60)} h ${v % 60} m`;
  return def.unit ? `${v} ${def.unit}` : String(v);
}

const lastUpdate = (iso: string) => (iso === DEMO_TODAY ? 'Today' : iso === addDays(DEMO_TODAY, -1) ? 'Yesterday' : formatMonthDay(parseDay(iso)));

/** The clients the brief has to-dos for, in the list's order (the user's call), with the one opened first if missing. */
function useClientList(openId: string): Client[] {
  const { state } = useStore();
  return useMemo(() => {
    const ids = [...new Set([openId, ...state.todos.map((t) => t.clientId)])];
    return ids.map((id) => findPerson(id)).filter((c): c is Client => Boolean(c));
  }, [openId, state.todos]);
}

/**
 * The client's Metrics page (Metrics & Photos trial, the user's call; from the user's screenshot of Everfit's client
 * profile, no frame): "View all metrics" opens it in the page's place. Left, All Clients (every client with a to-do
 * today, search); then the client's header and profile tabs (Metrics on; the others toast); Body Metrics | Exercise
 * Metrics, the All Metrics table (name · last value · last update; a row scrolls to its chart) and Manage Metrics; right,
 * All Metrics' cards over the time control. Every figure reads `bodyMetrics`, the same logs as the tab's cards.
 */
export function ClientMetricsPage({ clientId, onSelect }: { clientId: string; onSelect: (id: string) => void }) {
  const { showToast } = useStore();
  const list = useClientList(clientId);
  const client = findPerson(clientId)!;
  const [query, setQuery] = useState('');
  const shown = list.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="flex h-full min-w-0 flex-1">
      {/* All Clients */}
      <aside className="flex w-[240px] shrink-0 flex-col border-r border-line bg-[#f7f8fc]">
        <div className="px-5 pb-4 pt-6">
          <p className="text-[11px] font-semibold uppercase leading-[1.5] tracking-[0.2px] text-ink">Clients</p>
          <h1 className="text-[20px] font-bold leading-[1.3] text-ink">All Clients</h1>
        </div>
        <div className="flex gap-1.5 px-3 pb-3">
          <label className="flex h-[30px] min-w-0 flex-1 items-center gap-1.5 rounded-[5px] border border-line-light bg-white px-2">
            <Search size={14} className="shrink-0 text-ink-secondary" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client" aria-label="Search client" className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted" />
          </label>
          <button type="button" aria-label="Sort" onClick={() => showToast('Sorting clients opens in Clients')} className="flex size-[30px] items-center justify-center rounded-[5px] border border-line-light bg-white text-ink-secondary hover:text-ink">
            <ArrowUpDown size={14} />
          </button>
        </div>
        <ul className="scroll-thin flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
          {shown.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                aria-current={c.id === clientId ? 'page' : undefined}
                onClick={() => onSelect(c.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                  c.id === clientId ? 'bg-white shadow-[0_1px_4px_rgba(32,35,83,0.12)]' : 'hover:bg-white/70'
                }`}
              >
                <Avatar name={c.name} src={c.avatar} size={36} />
                <span className="min-w-0 text-[14px] font-semibold leading-[1.4] text-ink">{c.name}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-3 py-4 text-[13px] text-ink-muted">No client matches “{query}”.</li>}
        </ul>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        {/* The client's header and profile tabs */}
        <header className="flex shrink-0 items-center gap-4 border-b border-line px-8 pt-3">
          <span className="pb-3">
            <Avatar name={client.name} src={client.avatar} size={50} />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h2 className="text-[22px] font-semibold leading-[1.3] text-ink">{client.name}</h2>
            <nav className="flex gap-9">
              {PROFILE_TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-current={t === 'Metrics' ? 'page' : undefined}
                  onClick={() => t !== 'Metrics' && showToast(`${t} opens in ${client.firstName}’s profile`)}
                  className={`flex items-center gap-1 whitespace-nowrap border-b-2 pb-2.5 text-[13px] leading-[1.5] ${
                    t === 'Metrics' ? 'border-brand font-semibold text-brand' : 'border-transparent text-ink-secondary hover:text-ink'
                  }`}
                >
                  {t}
                  {t === 'Sessions' && <span className="rounded-[3px] bg-[#e14ce7] px-1 text-[9px] font-semibold leading-[14px] text-white">NEW</span>}
                </button>
              ))}
            </nav>
          </div>
        </header>
        <MetricsBody key={client.id} client={client} />
      </section>
    </div>
  );
}

function MetricsBody({ client }: { client: Client }) {
  const { showToast } = useStore();
  const logs = bodyMetrics(client);
  const [kind, setKind] = useState<'body' | 'exercise'>('body');
  const [open, setOpen] = useState(true);
  const [searching, setSearching] = useState(false);
  const [find, setFind] = useState('');
  const [weeks, setWeeks] = useState<MetricRange>(4);
  const grid = useRef<HTMLDivElement>(null);
  const [cardW, setCardW] = useState(520);
  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCardW((el.clientWidth - 16) / 2));
    ro.observe(el);
    return () => ro.disconnect();
  }, [logs]);

  const rows = ALL_METRICS.map((def) => ({ def, last: (logs ? logs[def.key][logs[def.key].length - 1] : undefined) as MetricPoint | undefined })).filter(
    (r) => r.def.label.toLowerCase().includes(find.trim().toLowerCase()),
  );
  const flash = (key: string) => {
    const el = document.getElementById(`metric-${key}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.animate([{ boxShadow: '0 0 0 0 rgba(24,78,255,0)' }, { boxShadow: '0 0 0 3px rgba(24,78,255,0.35)', offset: 0.3 }, { boxShadow: '0 0 0 0 rgba(24,78,255,0)' }], {
      duration: 1600,
      delay: 250,
    });
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left: Body | Exercise Metrics and the table */}
      <div className="flex w-[410px] shrink-0 flex-col border-r border-line px-6 pb-6 pt-5">
        <div className="grid grid-cols-2 overflow-hidden rounded-[5px] border border-brand">
          {(
            [
              ['body', 'Body Metrics', <Activity key="a" size={16} />],
              ['exercise', 'Exercise Metrics', <Dumbbell key="d" size={16} />],
            ] as const
          ).map(([k, label, icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`flex h-10 items-center justify-center gap-2 text-[13px] font-semibold ${kind === k ? 'bg-brand text-white' : 'bg-white text-brand hover:bg-brand/5'}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold leading-[1.5] text-ink">{kind === 'body' ? 'Body Metrics' : 'Exercise Metrics'}</h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Search metrics"
              aria-pressed={searching}
              onClick={() => {
                setSearching((s) => !s);
                setFind('');
              }}
              className={`flex size-[30px] items-center justify-center rounded-[5px] text-ink hover:bg-surface-secondary ${searching ? 'bg-surface-secondary' : 'bg-[#f3f4f6]'}`}
            >
              <Search size={15} />
            </button>
            <button type="button" onClick={() => showToast('Adding a metric opens in Manage Metrics')} className="flex h-[30px] items-center gap-1.5 rounded-[5px] bg-[#f3f4f6] px-3 text-[13px] font-semibold text-ink hover:bg-surface-secondary">
              <Plus size={14} />
              Add New
              <ChevronDown size={14} className="text-ink-secondary" />
            </button>
          </div>
        </div>
        {searching && (
          <input
            autoFocus
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder="Search metrics"
            className="mt-3 h-8 rounded-[5px] border border-line-light px-2.5 text-[13px] text-ink outline-none focus:border-brand"
          />
        )}
        {kind === 'exercise' ? (
          <p className="mt-6 text-center text-[13px] leading-[1.5] text-ink-muted">No exercise metrics for {client.firstName} yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[5px] border border-brand">
            <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 border-b border-line px-5 py-3 text-[13px] font-semibold text-brand">
              <ChevronDown size={16} className={open ? '' : '-rotate-90'} />
              All Metrics ({ALL_METRICS.length})
            </button>
            {open && (
              <div className="scroll-thin max-h-[290px] overflow-y-auto px-7 pb-2">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-x-4 py-2.5 text-[10px] font-semibold uppercase text-ink-secondary">
                  <span>Name</span>
                  <span>Value</span>
                  <span>Last update</span>
                </div>
                {rows.map(({ def, last }) => (
                  <button
                    key={def.key}
                    type="button"
                    disabled={!last}
                    onClick={() => flash(def.key)}
                    className="grid w-full grid-cols-[1fr_1fr_auto] items-center gap-x-4 rounded py-3 text-left text-[13px] leading-[1.5] hover:bg-surface-secondary/60 disabled:hover:bg-transparent"
                  >
                    <span className="font-semibold text-ink">{def.label}</span>
                    <span className="text-ink">{last ? tableValue(def, last.value) : '—'}</span>
                    <span className="w-[68px] text-right text-ink-secondary">{last ? lastUpdate(last.date) : '—'}</span>
                  </button>
                ))}
                {rows.length === 0 && <p className="py-3 text-[13px] text-ink-muted">No metric matches “{find}”.</p>}
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={() => showToast('Manage Metrics opens in Settings')} className="mt-auto flex items-center justify-center gap-1.5 self-center pt-6 text-[12px] font-semibold text-ink-secondary hover:text-ink">
          <Settings size={14} />
          Manage Metrics
        </button>
      </div>

      {/* Right: All Metrics */}
      <div className="scroll-thin min-w-0 flex-1 overflow-y-auto px-8 pb-10 pt-7">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-[20px] font-semibold leading-[1.4] text-ink">All Metrics</h3>
          <div className="flex items-center gap-2">
            <TimeControl value={weeks} onChange={setWeeks} />
            <button type="button" onClick={() => showToast(`Update Results opens ${client.firstName}’s metric entry`)} className="flex h-[30px] items-center rounded-[5px] border border-brand px-3 text-[12px] font-semibold text-brand hover:bg-brand/5">
              Update Results
            </button>
          </div>
        </div>
        {!logs ? (
          <p className="py-16 text-center text-[13px] leading-[1.5] text-ink-muted">No body metrics from {client.firstName} yet.</p>
        ) : (
          <div ref={grid} className="grid grid-cols-2 gap-4">
            {ALL_METRICS.map((def) => (
              <div key={def.key} id={`metric-${def.key}`} className="rounded-[5px]">
                <MetricCard def={def} view={metricView(def.key, logs[def.key], weeks)} weeks={weeks} height={296} plotW={Math.max(200, cardW - 2 - 5 - 20 - 42)} plotH={150} zoom />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
