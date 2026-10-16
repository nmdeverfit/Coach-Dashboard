import { useState } from 'react';
import iconAdd from '../assets/figma/icon-add.svg';
import iconAlarm from '../assets/figma/icon-alarm.svg';
import iconClock from '../assets/figma/icon-clock-booking.svg';
import iconMessage from '../assets/figma/icon-message-dots.svg';
import dotCredit from '../assets/figma/dot-credit.svg';
import dotTiny from '../assets/figma/dot-tiny.svg';
import { DEMO_TODAY, clients } from '../data/mock';
import { getSessions } from '../data/sessions';
import type { Client } from '../data/types';
import { bookingRow, type BookingRow } from '../lib/dashboard';
import { LOCATION_LABEL } from '../lib/todos';
import { useStore } from '../state/store';
import { ClientCell, HEAD, rowProps, SectionHeader } from './ClientListParts';
import { LowCreditsBadge, Swatch } from './drawer/SessionsBodies';
import { Glyph } from './Glyph';
import { Tooltip } from './Tooltip';

/**
 * The client list's Booking tab (Figma 5689:514998): every client with 1:1 bookings or session credits, split into
 * Upcoming sessions (soonest first) and No sessions booked. Columns: Client · Activity (next session) · Session
 * credits (balance, then the pool that needs the coach) · Action. Late cancels raise no to-do; they live here (Spec 4).
 */

const COL = { client: 'w-[320px] shrink-0', activity: 'w-[460px] shrink-0', credits: 'min-w-0 flex-1', action: 'w-[100px] shrink-0' };
/** Client Sessions' greys, as drawn in the frame. */
const LABEL = 'text-[13px] font-semibold leading-[18px] tracking-[0.13px] text-[#4d4d4d]';
const SMALL_BUTTON = 'flex h-7 shrink-0 items-center gap-[5px] rounded-lg border border-[#e0e0e0] text-[12px] font-semibold leading-[18px] text-[#4d4d4d] hover:bg-[#f2f2f2]';

const ROWS = clients
  .filter((c) => getSessions(c.id))
  .map((client) => ({ client, row: bookingRow(client, DEMO_TODAY) }));

export function BookingTable({ query }: { query: string }) {
  const [open, setOpen] = useState({ upcoming: true, none: true });
  const rows = ROWS.filter(({ client }) => !query || client.name.toLowerCase().includes(query));
  const upcoming = rows
    .filter((r) => r.row.next)
    .sort((a, b) => {
      const x = a.row.next!.booking;
      const y = b.row.next!.booking;
      return x.date.localeCompare(y.date) || x.start.localeCompare(y.start);
    });
  const none = rows.filter((r) => !r.row.next);

  return (
    <div className="flex flex-col gap-2">
      <div className="sticky top-0 z-10 flex h-10 items-center rounded-t-lg border-b border-line bg-white">
        <div className={`${COL.client} py-2.5 pl-4 pr-3 ${HEAD}`}>Client</div>
        <div className={`${COL.activity} px-3 py-2.5 ${HEAD}`}>Activity</div>
        <div className={`${COL.credits} px-3 py-2.5 ${HEAD}`}>Session credits</div>
        <div className={`${COL.action} py-2.5 pl-4 pr-3 text-center ${HEAD}`}>Action</div>
      </div>
      <section>
        <SectionHeader title="Upcoming sessions" count={upcoming.length} open={open.upcoming} onToggle={() => setOpen((o) => ({ ...o, upcoming: !o.upcoming }))} />
        {open.upcoming && (
          <div className="mt-2">
            {upcoming.map(({ client, row }) => (
              <BookingClientRow key={client.id} client={client} row={row} />
            ))}
          </div>
        )}
      </section>
      <section>
        <SectionHeader title="No sessions booked" count={none.length} open={open.none} onToggle={() => setOpen((o) => ({ ...o, none: !o.none }))} />
        {open.none && (
          <div className="mt-2">
            {none.map(({ client, row }) => (
              <BookingClientRow key={client.id} client={client} row={row} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BookingClientRow({ client, row }: { client: Client; row: BookingRow }) {
  const { state, selectClient, showToast } = useStore();
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const { next, credits } = row;
  return (
    <div {...rowProps(client, state.selectedClientId === client.id, selectClient)}>
      <ClientCell client={client} className={COL.client} />

      <div className={`${COL.activity} flex min-h-[76px] flex-col justify-center gap-1 p-3`}>
        {next && (
          <>
            <p className="flex items-center gap-2">
              <span className={LABEL}>Next session:</span>
              <span className="flex items-center gap-1.5 text-[14px] font-semibold leading-5 text-[#1a1a1a]">
                <Swatch color={next.booking.type.color} />
                {next.booking.type.name}
              </span>
            </p>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[13px] leading-[18px] tracking-[0.13px]">
                <Glyph src={iconClock} size={14} inset="8.33%" bleed="-6% -5.99% -6% -6.01%" />
                <span className="font-semibold text-black">{next.date}</span>
                <img src={dotTiny} alt="" width={2} height={2} />
                <span className="text-[#4d4d4d]">{next.time}</span>
              </span>
              <button
                type="button"
                onClick={stop(() => showToast(`The ${LOCATION_LABEL[next.booking.type.location].toLowerCase()} session reminder template (v1.11) opens for ${client.firstName}`))}
                className={`${SMALL_BUTTON} bg-[#f9f9f9] pl-3 pr-2`}
              >
                <img src={iconAlarm} alt="" width={13} height={13} />
                Draft a reminder
              </button>
            </div>
          </>
        )}
      </div>

      <div className={`${COL.credits} flex flex-col justify-center gap-1 p-3`}>
        {credits && (
          <>
            <p className="flex items-baseline gap-2 font-semibold">
              <span className={LABEL}>Balance:</span>
              <span className="text-[14px] leading-[1.5] text-[#1a1a1a] tabular-nums">{credits.balance}</span>
            </p>
            {credits.alert && (
              <div className="flex items-center gap-3">
                <span className="flex h-6 items-center gap-1.5">
                  <Swatch color={credits.alert.type.color} />
                  <span className="text-[14px] font-semibold leading-5 text-[#1a1a1a]">{credits.alert.type.name}</span>
                  {credits.alert.kind === 'expiring' ? (
                    <>
                      <img src={dotCredit} alt="" width={4} height={4} />
                      <span className="text-[13px] font-semibold leading-[18px] text-[#ca410a]">{credits.alert.label}</span>
                    </>
                  ) : (
                    <LowCreditsBadge />
                  )}
                </span>
                <button
                  type="button"
                  onClick={stop(() => showToast('Client Sessions › Credits opens in a new tab with the Issue credits popup pre-filled'))}
                  className={`${SMALL_BUTTON} bg-white pl-2 pr-3`}
                >
                  <span className="flex pt-px">
                    <Glyph src={iconAdd} size={12} inset="16.67%" bleed="0" />
                  </span>
                  Issue Credits
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className={`${COL.action} flex justify-center px-3 py-2`}>
        <button
          type="button"
          aria-label="Send message"
          onClick={stop(() => showToast('The message composer opens beside the list, empty'))}
          className="group/tip relative flex size-8 items-center justify-center rounded-md border border-black/15 bg-white hover:bg-surface-secondary"
        >
          <img src={iconMessage} alt="" width={16.2} height={16.2} />
          <Tooltip label="Send message" />
        </button>
      </div>
    </div>
  );
}
