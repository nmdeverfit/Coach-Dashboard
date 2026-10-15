import iconBell from '../assets/figma/icon-bell.svg';
import iconCalendar from '../assets/figma/icon-calendar.svg';
import iconChevronLeft from '../assets/figma/icon-chevron-left.svg';
import iconChevronDisabled from '../assets/figma/icon-chevron-right.svg';
import iconRocket from '../assets/figma/icon-rocket.svg';
import iconSearch from '../assets/figma/icon-search.svg';
import iconSettings from '../assets/figma/icon-settings.svg';
import iconTasks from '../assets/figma/icon-tasks.svg';
import iconTour from '../assets/figma/icon-tour.svg';
import iconWhatsNew from '../assets/figma/icon-whats-new.svg';
import { DEMO_TODAY } from '../data/mock';
import { weekLabel } from '../lib/dates';
import { useStore, type View } from '../state/store';

const VIEWS: { key: View; label: string }[] = [
  { key: 'brief', label: 'Today’s Brief' },
  { key: 'dashboard', label: 'Dashboard' },
];

function WeekSelector() {
  const { state, shiftWeek, resetWeek } = useStore();
  const isCurrentWeek = state.weekOffset === 0;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Previous week"
        onClick={() => shiftWeek(-1)}
        className="flex size-7 items-center justify-center rounded-md border border-line-nav bg-white text-ink hover:bg-surface-secondary"
      >
        <img src={iconChevronLeft} alt="" width={20} height={20} />
      </button>
      <div className="flex h-7 items-center gap-2 px-[7px]">
        <img src={iconCalendar} alt="" width={16} height={16} />
        <span className="whitespace-pre text-[14px] font-semibold leading-[1.4] text-ink tabular-nums">
          {weekLabel(DEMO_TODAY, state.weekOffset).replace(' - ', ' -  ')}
        </span>
      </div>
      <button
        type="button"
        aria-label="Next week"
        disabled={isCurrentWeek}
        onClick={() => shiftWeek(1)}
        className="flex size-7 items-center justify-center rounded-md border border-line-nav bg-white hover:bg-surface-secondary disabled:border-transparent disabled:bg-surface-secondary"
      >
        {/* The design only draws the disabled Next; the enabled one mirrors Back. */}
        <img src={isCurrentWeek ? iconChevronDisabled : iconChevronLeft} alt="" width={20} height={20} className="-scale-x-100" />
      </button>
      <button
        type="button"
        disabled={isCurrentWeek}
        onClick={resetWeek}
        className="flex h-7 items-center rounded-md bg-surface-secondary p-2 text-[12px] font-semibold leading-[1.4] text-ink opacity-80 hover:bg-line-light disabled:text-ink-muted disabled:hover:bg-surface-secondary"
      >
        Today
      </button>
    </div>
  );
}

function ViewToggle() {
  const { state, setView } = useStore();
  return (
    <div role="tablist" aria-label="Dashboard view" className="flex items-center rounded-md border border-line-light bg-white">
      {VIEWS.map((v) => {
        const active = state.view === v.key;
        return (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setView(v.key)}
            className={
              active
                ? 'flex h-7 items-center rounded-[5px] border border-ink bg-ink px-4 text-[12px] font-semibold leading-[1.4] text-white'
                : 'flex h-7 items-center rounded-[5px] px-4 text-[12px] font-semibold leading-[1.4] text-ink/80 hover:text-ink'
            }
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

function OutlineButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[30px] items-center gap-2 rounded-[4px] border border-line-button px-[13px] text-[12px] font-semibold leading-[15px] text-ink-tertiary hover:bg-surface-secondary"
    >
      <img src={icon} alt="" width={16} height={16} />
      {label}
    </button>
  );
}

const topActions = [
  { label: 'What’s new', icon: iconWhatsNew, width: 20, height: 20 },
  { label: 'Search', icon: iconSearch, width: 24, height: 24 },
  { label: 'Tasks', icon: iconTasks, width: 20, height: 20 },
  { label: 'Getting started', icon: iconRocket, width: 18, height: 19 },
  { label: 'Notifications', icon: iconBell, width: 16, height: 20 },
];

export function Header() {
  const { showToast } = useStore();
  return (
    <header className="flex shrink-0 flex-col gap-5 bg-white px-5 pb-3 pt-5">
      <div className="flex h-[26px] items-center justify-between">
        <h1 className="text-[20px] font-bold leading-none tracking-[-0.4px] text-ink">Check-in Dashboard</h1>
        <div className="flex items-center gap-5">
          {topActions.map(({ label, icon, width, height }) => (
            <button key={label} type="button" title={label} aria-label={label} className="rounded hover:opacity-70">
              <img src={icon} alt="" width={width} height={height} />
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <WeekSelector />
          <ViewToggle />
        </div>
        <div className="flex items-center gap-2">
          <OutlineButton icon={iconTour} label="Dashboard Tour" onClick={() => showToast('Dashboard Tour is coming in a later build')} />
          <OutlineButton icon={iconSettings} label="Dashboard Settings" onClick={() => showToast('Dashboard Settings is coming in a later build')} />
        </div>
      </div>
    </header>
  );
}
