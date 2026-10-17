import { useState } from 'react';
import dotMeeting from '../../assets/figma/dot-meeting.svg';
import iconClock from '../../assets/figma/icon-clock-booking.svg';
import iconPlus from '../../assets/figma/icon-plus-brand.svg';
import iconVideo from '../../assets/figma/icon-video.svg';
import type { Client, Meeting } from '../../data/types';
import { WEEKDAYS } from '../../lib/checkin';
import { parseDay } from '../../lib/dates';
import { meetingDate, meetingWeeks, meetingWhen, meetingsFor, platformOf } from '../../lib/meetings';
import { useStore } from '../../state/store';
import { Glyph } from '../Glyph';
import { AddMeetingDialog } from './AddMeetingDialog';
import { TranscriptDialog } from './TranscriptDialog';

/**
 * One meeting (Figma 5731:517688): date tile, title, then start time and date · platform. On hover (or keyboard
 * focus) the row lifts onto a white card with a light shadow, a few px wider than the list, and shows View transcript.
 * A click anywhere on the row opens the transcript too.
 */
function MeetingRow({ meeting, onView }: { meeting: Meeting; onView: () => void }) {
  const d = parseDay(meeting.date);
  const platform = meeting.link && platformOf(meeting.link);
  return (
    <li
      onClick={onView}
      className="group/meeting relative flex cursor-pointer items-center gap-4 border-b border-ink/10 px-1 pb-[13px] pt-3 hover:border-transparent focus-within:border-transparent"
    >
      {/* The hover card: white, rounded 4, 0 0 10px black/5, 644 px of the list's 634 (5 px past each side). */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-x-[5px] inset-y-0 rounded-[4px] bg-white opacity-0 shadow-[0_0_10px_rgba(0,0,0,0.05)] transition-opacity duration-150 group-hover/meeting:opacity-100 group-focus-within/meeting:opacity-100"
      />
      <div
        title={meetingDate(meeting.date)}
        className="relative flex size-14 shrink-0 flex-col items-center justify-center rounded-[9px] border border-line bg-white text-ink"
      >
        <span className="-mb-1 text-[20px] font-semibold leading-[1.5] tracking-[-0.4px]">{d.getUTCDate()}</span>
        <span className="text-[12px] font-semibold leading-[18px]">{WEEKDAYS[d.getUTCDay()]}</span>
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-[14px] font-semibold leading-5 text-ink">{meeting.title}</p>
        <div className="flex items-center gap-2 whitespace-nowrap text-[13px] leading-[18px] tracking-[0.13px]">
          <span className="flex items-center gap-1.5 text-[#484848]">
            <Glyph src={iconClock} size={14} inset="8.33%" bleed="-6% -5.99% -6% -6.01%" />
            {meetingWhen(meeting)}
          </span>
          {platform && (
            <>
              <img src={dotMeeting} alt="" width={4} height={4} className="shrink-0" />
              <span className="flex items-center gap-1.5 text-ink">
                <img src={iconVideo} alt="" width={14} height={14} />
                {platform}
              </span>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onView();
        }}
        className="relative shrink-0 whitespace-nowrap pr-1 text-[13px] font-semibold leading-5 text-ink opacity-0 hover:text-brand focus:opacity-100 group-hover/meeting:opacity-100"
      >
        View transcript
      </button>
    </li>
  );
}

/**
 * Transcript tab of the client detail page (Figma 5731:517688): every meeting the coach has had with the client,
 * newest first, under a header per week (as Notes groups by day), each opening its transcript. "Add meeting" opens
 * the Add a meeting popup (5726:141326 upload, 5729:516037 paste).
 */
export function TranscriptTab({ client }: { client: Client }) {
  const { state } = useStore();
  const weeks = meetingWeeks(meetingsFor(client.id, state.meetings[client.id]));
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Meeting | null>(null);

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-elevated p-px shadow-[0_1px_3px_rgba(24,78,255,0.07)]">
      <div className="flex items-center justify-between border-b border-ink/10 bg-white px-3 py-[14px]">
        <h4 className="text-[15px] font-semibold leading-[18px] text-ink">Meetings with {client.firstName}</h4>
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-[14px] font-semibold leading-[18px] text-brand hover:underline">
          <img src={iconPlus} alt="" width={16} height={16} />
          Add meeting
        </button>
      </div>
      {/* #f9fafa: the card well, as drawn. */}
      <div className="flex flex-col bg-[#f9fafa] px-3 pb-3">
        {weeks.length ? (
          weeks.map((w) => (
            <section key={w.monday} className="flex flex-col">
              <h5 className="pb-1 pt-3 text-[12px] font-semibold uppercase leading-normal text-ink-muted">{w.label}</h5>
              <ul className="flex flex-col">
                {w.meetings.map((m) => (
                  <MeetingRow key={m.id} meeting={m} onView={() => setViewing(m)} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="pt-3 text-[13px] leading-[18px] text-ink-muted">No meetings with {client.firstName} yet.</p>
        )}
      </div>
      {adding && <AddMeetingDialog client={client} onClose={() => setAdding(false)} />}
      {viewing && <TranscriptDialog client={client} meeting={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
