import { useCallback, useState } from 'react';
import dotSession from '../../assets/figma/dot-session.svg';
import iconCalendar from '../../assets/figma/icon-calendar-days.svg';
import iconClose from '../../assets/figma/icon-close.svg';
import iconCredit from '../../assets/figma/icon-session-credit.svg';
import iconLocation from '../../assets/figma/icon-session-location.svg';
import iconNote from '../../assets/figma/icon-session-note.svg';
import { coachAvatar } from '../../data/mock';
import { getGroupSession, type GroupSession } from '../../data/sessions';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { LOCATION_LABEL, timeSpan } from '../../lib/todos';
import { useStore } from '../../state/store';
import { Avatar } from '../Avatar';
import { peopleIn } from '../GroupSession';
import { DrawerAside, useCloseOnOutside, useDrawerPresence } from './DrawerShell';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "Tue, Sep 1" */
const longDate = (iso: string) => `${WEEKDAYS[parseDay(iso).getUTCDay()]}, ${formatMonthDay(parseDay(iso))}`;

/** An info line: a 16 px icon in a 20 px row, then the text (Figma's "View event" block). */
function InfoLine({ icon, iconClass, children }: { icon: React.ReactNode; iconClass?: string; children: React.ReactNode }) {
  return (
    <div className={`flex w-full gap-3 ${iconClass ?? 'items-start'}`}>
      <span className="flex h-5 w-4 shrink-0 items-center justify-center">{icon}</span>
      {children}
    </div>
  );
}

const Icon = ({ src, inset, bleed }: { src: string; inset: string; bleed: string }) => (
  <span className="relative size-4 overflow-hidden" aria-hidden>
    <span className={`absolute ${inset}`}>
      <span className={`absolute ${bleed}`}>
        <img src={src} alt="" className="block size-full max-w-none" />
      </span>
    </span>
  </span>
);

/** Enrolled 17/23 | Canceled 1: the pill tabs over the roster. */
function RosterTab({ label, count, active, onClick }: { label: string; count: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border py-1.5 pl-3 pr-1.5 text-[12px] font-semibold leading-[18px] ${
        active ? 'border-[#1a1a1a] text-[#1a1a1a]' : 'border-transparent text-[#8c8c8c] hover:text-[#1a1a1a]'
      }`}
    >
      {label}
      <span className="rounded-2xl bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-bold uppercase leading-[14px] tracking-[0.4px]">{count}</span>
    </button>
  );
}

/** Figma 5825:544656: the details of a group session, opened from its row on the Upcoming bookings card. */
function SessionBody({ session, onClose }: { session: GroupSession; onClose: () => void }) {
  const { selectClient, showToast } = useStore();
  const [tab, setTab] = useState<'enrolled' | 'canceled'>('enrolled');
  const enrolled = peopleIn(session.enrolled);
  const canceled = peopleIn(session.canceled);
  const shown = tab === 'enrolled' ? enrolled : canceled;
  const credits = `${session.creditsPerSpot} credit${session.creditsPerSpot === 1 ? '' : 's'}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5 pb-2.5 pt-[15px]">
        <p className="text-[13px] font-semibold leading-[1.5] text-ink-secondary">SESSION DETAILS</p>
        <button type="button" aria-label="Close session details" onClick={onClose} className="relative size-5 overflow-hidden rounded hover:opacity-70">
          <img src={iconClose} alt="" className="absolute left-1/2 top-1/2 size-6 max-w-none -translate-x-1/2 -translate-y-1/2" />
        </button>
      </header>
      <div key={session.id} className="scroll-thin flex-1 overflow-y-auto">
        <div className="flex items-start gap-2.5 px-[30px] py-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1 border-b border-[#f2f2f2] pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-[19.2px] shrink-0 items-center justify-center">
                <span className="size-[16.8px] rounded-[4.8px] border-[1.2px] border-black/10" style={{ backgroundColor: session.type.color }} />
              </span>
              <h2 className="truncate text-[18px] font-bold leading-[1.5] text-[#1a1a1a]">{session.type.name}</h2>
            </div>
            <p className="flex items-center gap-1.5 pl-7 pt-0.5 text-[14px] leading-[22px] text-[#1a1a1a]">
              {longDate(session.date)}
              <img src={dotSession} alt="" width={3} height={3} />
              {timeSpan(session)} ({session.type.minutes}min)
            </p>
          </div>
          <button
            type="button"
            onClick={() => showToast(`The calendar opens on ${longDate(session.date)}`)}
            className="flex h-8 shrink-0 items-center gap-2 rounded border border-line-light bg-white px-4 text-[13px] font-semibold leading-5 tracking-[-0.26px] text-ink hover:bg-surface-secondary"
          >
            <span className="relative size-5 overflow-hidden" aria-hidden>
              <span className="absolute inset-[10%_14.01%]">
                <span className="absolute inset-[-4.5%_-5%]">
                  <img src={iconCalendar} alt="" className="block size-full max-w-none" />
                </span>
              </span>
            </span>
            View calendar
          </button>
        </div>

        <div className="flex flex-col gap-2 px-[30px] pb-5 pl-[38px] text-[14px] leading-[22px] text-ink">
          <InfoLine icon={<Icon src={iconLocation} inset="inset-[8.33%_12.5%]" bleed="inset-[-4.88%_-5.42%_-5.33%_-5.42%]" />}>
            <div className="flex flex-col gap-0.5">
              <p>
                {LOCATION_LABEL[session.type.location]} ({session.address})
              </p>
              <p className="flex items-center gap-1 text-[12px] leading-[18px] tracking-[0.12px] text-[#4d4d4d]">
                <span className="h-3 w-[3px] rounded-[3px] bg-[#d9d9d9]" />
                {session.directions}
              </p>
            </div>
          </InfoLine>
          <InfoLine iconClass="items-center" icon={<Icon src={iconCredit} inset="inset-[7.69%]" bleed="inset-[-4.8%]" />}>
            <p>{credits} used (per spot)</p>
          </InfoLine>
          <InfoLine
            icon={
              <span className="flex size-4 items-center justify-center p-0.5" aria-hidden>
                <span className="relative h-[8.5px] w-2.5">
                  <img src={iconNote} alt="" className="absolute inset-y-[-7.65%] left-0 block h-[115.3%] w-full max-w-none" />
                </span>
              </span>
            }
          >
            <p className="min-w-0 flex-1">{session.description}</p>
          </InfoLine>
          <InfoLine iconClass="items-center pt-px" icon={<img src={coachAvatar} alt="" width={16} height={16} className="size-4 rounded-full object-cover" />}>
            <p>Trainer: You</p>
          </InfoLine>
        </div>

        <div className="flex flex-col gap-4 border-t border-line px-[30px] pb-2 pt-5">
          <div role="tablist" className="flex items-center gap-1 pl-1">
            <RosterTab label="Enrolled" count={`${enrolled.length}/${session.capacity}`} active={tab === 'enrolled'} onClick={() => setTab('enrolled')} />
            <RosterTab label="Canceled" count={String(canceled.length)} active={tab === 'canceled'} onClick={() => setTab('canceled')} />
          </div>
          <ul className="flex flex-col gap-0.5 pb-5">
            {shown.length === 0 && <li className="px-1 py-1.5 text-[13px] leading-[1.5] text-ink-muted">No cancellations for this session.</li>}
            {shown.map((c) => (
              <li key={c.id}>
                {/* A client opens their detail page on the Booking tab, in this panel's place. */}
                <button
                  type="button"
                  onClick={() => selectClient(c.id, 'booking')}
                  className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-surface-secondary"
                >
                  <Avatar name={c.name} src={c.avatar} size={28} />
                  <span className="truncate text-[14px] leading-[22px] text-[#1a1a1a]">{c.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** The session details panel: slides in from the right like the other panels; ×, Esc or a click outside closes it. */
export function SessionDrawer() {
  const { state, selectSession } = useStore();
  const { shown, closing } = useDrawerPresence(state.selectedSessionId);
  const close = useCallback(() => selectSession(null), [selectSession]);
  useCloseOnOutside(Boolean(state.selectedSessionId), close);
  const session = shown ? getGroupSession(shown) : undefined;
  if (!session) return null;
  return (
    <DrawerAside label="Session details" closing={closing} narrow>
      <SessionBody session={session} onClose={close} />
    </DrawerAside>
  );
}
