import iconBell from '../assets/figma/icon-bell.svg';
import iconCalendar from '../assets/figma/icon-calendar.svg';
import iconChevronLeft from '../assets/figma/icon-chevron-left.svg';
import iconChevronDisabled from '../assets/figma/icon-chevron-right.svg';
import iconRocket from '../assets/figma/icon-rocket.svg';
import iconSearch from '../assets/figma/icon-search.svg';
import iconSettingsBrand from '../assets/figma/icon-settings-brand.svg';
import iconSettingsHome from '../assets/figma/icon-settings-home.svg';
import iconSettingsStatus from '../assets/figma/icon-settings-status.svg';
import iconSettingsUndo from '../assets/figma/icon-settings-undo.svg';
import iconSettingsWidget from '../assets/figma/icon-settings-widget.svg';
import iconSettings from '../assets/figma/icon-settings.svg';
import iconTasks from '../assets/figma/icon-tasks.svg';
import iconTour from '../assets/figma/icon-tour.svg';
import iconWhatsNew from '../assets/figma/icon-whats-new.svg';
import { DEMO_TODAY } from '../data/mock';
import iconHistory from '../assets/figma/icon-history.svg';
import { weekLabel } from '../lib/dates';
import { MIN_WEEK_OFFSET, weekRange } from '../lib/week';
import { useEffect, useRef, useState } from 'react';
import { useStore, type View } from '../state/store';

const VIEWS: { key: View; label: string }[] = [
  { key: 'brief', label: 'Today’s Brief' },
  { key: 'dashboard', label: 'Dashboard' },
];

function WeekSelector() {
  const { state, shiftWeek, resetWeek } = useStore();
  const isCurrentWeek = state.weekOffset === 0;
  const isFirstWeek = state.weekOffset <= MIN_WEEK_OFFSET;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Previous week"
        disabled={isFirstWeek}
        onClick={() => shiftWeek(-1)}
        className="flex size-7 items-center justify-center rounded-md border border-line-nav bg-white text-ink hover:bg-surface-secondary disabled:border-transparent disabled:bg-surface-secondary"
      >
        {/* The back-filled weeks start on 10 Aug (MIN_WEEK_OFFSET); before that Back is disabled like Next. */}
        <img src={isFirstWeek ? iconChevronDisabled : iconChevronLeft} alt="" width={20} height={20} className={isFirstWeek ? '-scale-x-100' : ''} />
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
        className="flex h-7 items-center rounded-[5px] border border-line-nav bg-white px-2 text-[12px] font-semibold leading-[1.4] text-ink/80 hover:bg-surface-secondary disabled:border-transparent disabled:bg-surface-secondary disabled:text-ink-muted"
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

/**
 * Dashboard Settings and its menu (Figma 5749:521870): Home screen settings · About Client status & data · Customize
 * · Switch back to old dashboard. Customize opens Customize cards on the tab of the view on screen, so it reads
 * "Customize cards" on both views, the popup's own title (the user's call); it opens on the tab of the view it comes
 * from. The other three only toast.
 */
function SettingsMenu() {
  const { state, showToast, openCustomize } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const brief = state.view === 'brief';
  const items = [
    { icon: iconSettingsHome, label: 'Home screen settings', run: () => showToast('Home screen settings open here') },
    { icon: iconSettingsStatus, label: 'About Client status & data', run: () => showToast('About Client status & data opens here') },
    { icon: iconSettingsWidget, label: 'Customize cards', run: () => openCustomize(brief ? 'brief' : 'dashboard') },
    { icon: iconSettingsUndo, label: 'Switch back to old dashboard', run: () => showToast('Switch back to the old dashboard happens here') },
  ];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-[30px] items-center gap-2 rounded-[4px] border px-[13px] text-[12px] font-semibold leading-[15px] ${
          open ? 'rounded-md border-black/15 bg-brand/10 text-brand' : 'border-line-button text-ink-tertiary hover:bg-surface-secondary'
        }`}
      >
        <img src={open ? iconSettingsBrand : iconSettings} alt="" width={16} height={16} />
        Dashboard Settings
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-[34px] z-30 w-[252px] animate-fade-in">
          {/* The dropdown's arrow, pointing at the button. */}
          <span aria-hidden className="absolute -top-[4px] right-[60px] size-2 rotate-45 rounded-tl-[1px] bg-white shadow-[-1px_-1px_1px_rgba(176,186,200,0.6)]" />
          <div className="flex flex-col rounded-[4px] bg-white py-3 shadow-[0_0_2px_#b0bac8,0_4px_16px_rgba(37,40,48,0.1)]">
            {items.map((it) => (
              <button
                key={it.icon}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.run();
                }}
                className="flex h-[34px] items-center gap-2.5 px-5 text-left text-[13px] leading-normal text-[#333] hover:bg-surface-secondary"
              >
                <img src={it.icon} alt="" width={16} height={16} />
                {it.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const topActions = [
  { label: 'What’s new', icon: iconWhatsNew, width: 20, height: 20 },
  { label: 'Search', icon: iconSearch, width: 24, height: 24 },
  { label: 'Tasks', icon: iconTasks, width: 20, height: 20 },
  { label: 'Getting started', icon: iconRocket, width: 18, height: 19 },
  { label: 'Notifications', icon: iconBell, width: 16, height: 20 },
];

/**
 * Past-week banner (Figma 4780:125157 / 4798:172414): under the header on any week but this one. The brief's version
 * says why the to-dos are gone; the client list's says the statuses are that week's.
 */
function PastWeekBanner() {
  const { state, resetWeek } = useStore();
  if (state.weekOffset === 0) return null;
  const note = state.view === 'brief' ? 'To-dos are only shown for today.' : 'Current client status may differ.';
  return (
    // #f3f6ff and #484848 are the frame's banner fill and Text/Dark.
    <div className="flex shrink-0 items-center gap-1.5 border-y border-line bg-[#f3f6ff] px-5 py-2 text-[13px] leading-[1.5]">
      <img src={iconHistory} alt="" width={16} height={16} />
      <p className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-[#484848]">
          Looking back at {weekRange(state.weekOffset)}. {note}
        </span>
        <button type="button" onClick={resetWeek} className="font-semibold text-ink underline hover:opacity-80">
          Back to this week
        </button>
      </p>
    </div>
  );
}

export function Header() {
  const { showToast } = useStore();
  return (
    <div className="flex shrink-0 flex-col">
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
          <SettingsMenu />
        </div>
      </div>
    </header>
    <PastWeekBanner />
    </div>
  );
}
