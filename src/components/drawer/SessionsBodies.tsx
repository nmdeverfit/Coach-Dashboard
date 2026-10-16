import { useState } from 'react';
import iconClockSm from '../../assets/figma/icon-clock-sm.svg';
import iconClock from '../../assets/figma/icon-clock.svg';
import iconCoins from '../../assets/figma/icon-coins.svg';
import iconLateCancel from '../../assets/figma/icon-late-cancel.svg';
import iconLocationSm from '../../assets/figma/icon-location-sm.svg';
import iconLocation from '../../assets/figma/icon-location.svg';
import iconCollapsed from '../../assets/figma/icon-row-collapsed.svg';
import iconExpanded from '../../assets/figma/icon-row-expanded.svg';
import iconUserSm from '../../assets/figma/icon-user-sm.svg';
import iconUser from '../../assets/figma/icon-user.svg';
import dotMeta from '../../assets/figma/dot-meta.svg';
import dotTiny from '../../assets/figma/dot-tiny.svg';
import type { Booking, SessionType } from '../../data/types';
import { WEEKDAYS } from '../../lib/checkin';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { LOCATION_LABEL, timeRange, type CreditPoolView, type PrepareView, type UnblockView } from '../../lib/todos';
import { useStore } from '../../state/store';
import { CardHeader } from './NutritionTab';
import { Glyph } from '../Glyph';

/** Exported vectors keep Figma's inset/bleed wrappers so they sit exactly as drawn. */
/** The session type's colour swatch, as Client Sessions draws it. */
export function Swatch({ color }: { color: string }) {
  return <span className="size-[14px] shrink-0 rounded-[4px] border border-black/10" style={{ backgroundColor: color }} />;
}

/** Duration · location · format, as Client Sessions shows a session type. Phase 1 bookings are 1:1 only. */
function SessionMeta({ type, time, small }: { type: SessionType; time?: string; small?: boolean }) {
  const text = small ? 'text-[12px] tracking-[0.12px]' : 'text-[13px] tracking-[0.13px]';
  const dot = <img src={dotTiny} alt="" width={2} height={2} className="shrink-0" />;
  return (
    <div className={`flex items-center gap-1.5 leading-[18px] text-[#4d4d4d] ${text}`}>
      <span className="flex items-center gap-1">
        {small ? (
          <Glyph src={iconClockSm} size={12} inset="8.33%" bleed="-6%" />
        ) : (
          <Glyph src={iconClock} size={14} inset="8.33%" bleed="-6.01% -6.01% -5.99% -5.99%" />
        )}
        {time ?? `${type.minutes} min`}
      </span>
      {dot}
      <span className="flex items-center gap-1">
        {small ? (
          <Glyph src={iconLocationSm} size={12} inset="8.33% 12.5%" bleed="-6% -6.67% -6.57% -6.67%" />
        ) : (
          <Glyph src={iconLocation} size={12} inset="8.33% 12.5%" bleed="-7% -7.78% -7.66% -7.78%" />
        )}
        {LOCATION_LABEL[type.location]}
      </span>
      {dot}
      <span className="flex items-center gap-1">
        {small ? (
          <Glyph src={iconUserSm} size={12} inset="8.33% 12.5%" bleed="-6% -5.46%" />
        ) : (
          <Glyph src={iconUser} size={14} inset="8.33% 12.5%" bleed="-6.01% -5.46% -5.99% -5.46%" />
        )}
        1:1
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- Unblock

/** A session type's balance is at or below LOW_CREDIT_THRESHOLD (Spec 4 AC8.2; the threshold is in review, OQ15). */
export function LowCreditsBadge() {
  return <span className="flex h-[21px] shrink-0 items-center whitespace-nowrap rounded-full bg-[#ffebb0] px-2 text-[12px] font-semibold leading-[15px] text-[#71381d]">Low credits</span>;
}

function CreditRow({ view, open, onToggle, last }: { view: CreditPoolView; open: boolean; onToggle: () => void; last: boolean }) {
  const { pool, balance, batches, expiringSoon, low } = view;
  return (
    <div className={`flex flex-col gap-2 py-3 pl-3 ${open ? 'pr-2' : 'pr-4'} ${last ? '' : 'border-b border-[#f2f2f2]'}`}>
      <button type="button" aria-expanded={open} onClick={onToggle} className={`flex w-full items-center gap-4 text-left ${open ? 'pr-2' : ''}`}>
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {/* Both exports are drawn a quarter-turn back; the component rotates them (› collapsed, ⌄ expanded). */}
          <img src={open ? iconExpanded : iconCollapsed} alt="" width={16} height={16} className="rotate-90" />
          <Swatch color={pool.type.color} />
          <span className="truncate text-[14px] font-semibold leading-[22px] text-[#1a1a1a]">{pool.type.name}</span>
        </span>
        {expiringSoon ? (
          <span className="text-[13px] font-semibold leading-5 tracking-[-0.15px] text-[#ca410a]">{expiringSoon.label}</span>
        ) : (
          low && (
            <LowCreditsBadge />
          )
        )}
        <span className="text-[18px] font-semibold leading-5 text-[#1a1a1a]">{balance}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2.5 rounded-lg bg-[#f5f5f5] py-3 pl-6 pr-3">
          <SessionMeta type={pool.type} />
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 text-[13px] leading-[18px] tracking-[0.13px] text-[#4d4d4d]">
              <Glyph src={iconCoins} size={14} inset="7.69%" bleed="-5.9% -5.91% -5.91% -5.91%" />
              Credit balance: <span className="text-[12px] font-semibold text-[#1a1a1a]">{balance}</span>
            </p>
            <div className="flex w-[316px] gap-2.5 pl-1.5">
              <span className="w-[3px] shrink-0 rounded-[2px] bg-[#e0e0e0]" />
              <ul className="flex flex-1 flex-col gap-1 text-[13px] leading-5 tracking-[-0.15px]">
                {batches.map((b, i) => {
                  const soon = i === 0 && expiringSoon;
                  return (
                    <li key={`${b.expiresOn ?? 'never'}-${i}`} className="flex items-start gap-1">
                      <span className={`flex-1 ${soon ? 'font-semibold text-[#ca410a]' : 'text-[#4d4d4d]'}`}>
                        {soon
                          ? expiringSoon.label
                          : b.expiresOn
                            ? `${b.count} credit${b.count === 1 ? '' : 's'} expiring`
                            : `${b.count} credit${b.count === 1 ? ' doesn’t' : 's don’t'} expire`}
                      </span>
                      {b.expiresOn && (
                        <span className={`w-12 shrink-0 ${soon ? 'font-semibold text-[#ca410a]' : 'text-[#1a1a1a]'}`}>{formatMonthDay(parseDay(b.expiresOn))}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Unblock (issue credit): what is running out, when, and the balance by session type (Spec 4 AC8.3). No assessment,
 * no tabs. The row that raised the to-do opens expanded.
 */
export function UnblockBody({ view }: { view: UnblockView }) {
  return (
    <div className="px-[30px] pb-5">
      <CreditsCard view={view} />
    </div>
  );
}

/** The Session credits card: balance, then one row per session type (shared by Unblock and the Booking tab). */
export function CreditsCard({ view }: { view: UnblockView | null }) {
  const { showToast } = useStore();
  const [open, setOpen] = useState<Set<string>>(() => new Set(view ? [view.focus.pool.type.name] : []));
  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(name)) next.add(name);
      return next;
    });

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-white p-px">
      <CardHeader title="Session credits" link="View credits" onClick={() => showToast('Client Sessions › Credits opens in a new tab')} />
      <div className="flex flex-col gap-3 bg-[#f9fafa] p-4">
        <div className="flex flex-col gap-1">
          <p className="text-[14px] font-semibold leading-[22px] text-[#1a1a1a]">Balance</p>
          <p className="flex h-10 items-baseline gap-1">
            <span className="text-[32px] font-semibold leading-10 tracking-[0.3px] text-[#1a1a1a]">{view?.total ?? 0}</span>
            <span className="text-[12px] leading-[18px] tracking-[0.12px] text-[#4d4d4d]">credits total</span>
          </p>
        </div>
        {view ? (
          <div className="flex flex-col rounded-lg border border-[#e0e0e0] bg-white p-px">
            {view.pools.map((p, i) => (
              <CreditRow
                key={p.pool.type.name}
                view={p}
                open={open.has(p.pool.type.name)}
                onToggle={() => toggle(p.pool.type.name)}
                last={i === view.pools.length - 1}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-[#e0e0e0] bg-white px-4 py-3 text-[13px] leading-[18px] text-ink-muted">No credits on any session type.</p>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Prepare

function SessionCard({ booking, next, last }: { booking: Booking; next: boolean; last: boolean }) {
  const d = parseDay(booking.date);
  return (
    <li className={`flex items-center gap-4 px-1 pb-[11px] pt-2.5 ${last ? '' : 'border-b border-ink/10'}`}>
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-[9px] border border-line bg-white text-[#1a1a1a]">
        <span className="-mb-1 text-[20px] font-semibold leading-[1.5] tracking-[-0.4px]">{d.getUTCDate()}</span>
        <span className="text-[12px] font-semibold leading-[18px]">{WEEKDAYS[d.getUTCDay()]}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="flex items-center gap-1.5">
          {next && <span className="text-[13px] font-semibold leading-[18px] tracking-[0.13px] text-brand">Next session:</span>}
          <span className="flex size-[15px] items-center justify-center">
            <Swatch color={booking.type.color} />
          </span>
          <span className="truncate text-[14px] font-semibold leading-5 text-[#1a1a1a]">{booking.type.name}</span>
        </p>
        <SessionMeta type={booking.type} time={timeRange(booking)} small />
      </div>
    </li>
  );
}

/** Prepare (booking): one Sessions card, upcoming soonest first, then last session and this week (Spec 4 AC7.2). */
export function PrepareBody({ view }: { view: PrepareView }) {
  return (
    <div className="px-[30px] pb-5">
      <SessionsCard view={view} />
    </div>
  );
}

/** The Sessions card (shared by Prepare and the Booking tab). With nothing booked the list says so. */
export function SessionsCard({ view }: { view: PrepareView }) {
  const { showToast } = useStore();
  const { completed, lateCancel, earlyCancel } = view.thisWeek;
  const dot = <img src={dotMeta} alt="" width={4} height={4} className="shrink-0" />;
  return (
    <section className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-white p-px">
      <CardHeader title="Sessions" link="View all Sessions" onClick={() => showToast('Client Sessions › Upcoming opens in a new tab')} />
      {view.upcoming.length ? (
        <ul className="bg-[#f9fafa] px-3">
          {view.upcoming.map((b, i) => (
            <SessionCard key={`${b.date}-${b.start}`} booking={b} next={i === 0} last={i === view.upcoming.length - 1} />
          ))}
        </ul>
      ) : (
        <p className="bg-[#f9fafa] px-5 py-4 text-[13px] leading-[18px] text-ink-muted">No upcoming sessions booked.</p>
      )}
      <div className="flex flex-col border-t border-line bg-[#f9fafa] px-5 py-3 text-[13px] leading-[18px] text-ink">
        <p className="flex items-baseline py-3">
          <span className="w-[180px] shrink-0">Last session</span>
          <span className="font-semibold">{view.lastSession ? formatMonthDay(parseDay(view.lastSession)) : '—'}</span>
        </p>
        <div className="flex items-baseline border-t border-ink/10 pb-3 pt-[13px]">
          <span className="w-[180px] shrink-0">This week</span>
          <span className="flex items-center gap-1.5 font-semibold">
            {completed} completed
            {dot}
            <span className="flex items-center gap-1 text-ink-secondary">
              <img src={iconLateCancel} alt="" width={12} height={12} />
              {lateCancel} late cancel
            </span>
            {dot}
            {earlyCancel} early cancel
          </span>
        </div>
      </div>
    </section>
  );
}
