import { useState } from 'react';
import dotMeeting from '../../assets/figma/dot-meeting.svg';
import iconClock from '../../assets/figma/icon-clock-booking.svg';
import iconPlus from '../../assets/figma/icon-plus-brand.svg';
import iconVideo from '../../assets/figma/icon-video.svg';
import type { Client, Meeting } from '../../data/types';
import { WEEKDAYS } from '../../lib/checkin';
import { parseDay } from '../../lib/dates';
import { meetingDate, meetingTime, meetingsFor, platformOf } from '../../lib/meetings';
import { useStore } from '../../state/store';
import { Glyph } from '../Glyph';
import { AddMeetingDialog } from './AddMeetingDialog';
import { TranscriptDialog } from './TranscriptDialog';

function MeetingRow({ meeting, onView }: { meeting: Meeting; onView: () => void }) {
  const { showToast } = useStore();
  const d = parseDay(meeting.date);
  const dot = <img src={dotMeeting} alt="" width={4} height={4} className="shrink-0" />;
  const platform = meeting.link && platformOf(meeting.link);
  return (
    <li className="flex items-center gap-4 border-b border-ink/10 px-1 pb-[17px] pt-4">
      <div
        title={meetingDate(meeting.date)}
        className="flex size-14 shrink-0 flex-col items-center justify-center rounded-[9px] border border-line bg-white text-ink"
      >
        <span className="-mb-1 text-[20px] font-semibold leading-[1.5] tracking-[-0.4px]">{d.getUTCDate()}</span>
        <span className="text-[12px] font-semibold leading-[18px]">{WEEKDAYS[d.getUTCDay()]}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-[14px] font-semibold leading-5 text-ink">{meeting.title}</p>
        <div className="flex items-center gap-2 whitespace-nowrap text-[12px] leading-[18px] tracking-[0.12px] text-[#484848]">
          <span className="flex items-center gap-1.5">
            <Glyph src={iconClock} size={14} inset="8.33%" bleed="-6% -5.99% -6% -6.01%" />
            {meetingTime(meeting)}
          </span>
          {platform && (
            <>
              {dot}
              <button type="button" onClick={() => showToast(`The ${platform} link opens in a new tab`)} className="flex items-center gap-1.5 hover:text-ink">
                <img src={iconVideo} alt="" width={14} height={14} />
                <span className="underline">{platform}</span>
              </button>
            </>
          )}
          {dot}
          <button type="button" onClick={onView} className="font-semibold tracking-normal text-ink underline hover:text-brand">
            View transcript
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * Transcript tab of the client detail page (Figma 5731:517688): the coach's meetings with the client, newest first,
 * each opening its transcript. "Add meeting" opens the Add a meeting popup (5726:141326 upload, 5729:516037 paste).
 */
export function TranscriptTab({ client }: { client: Client }) {
  const { state } = useStore();
  const meetings = meetingsFor(client.id, state.meetings[client.id]);
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
      <div className="bg-[#f9fafa] px-3 pb-3">
        {meetings.length ? (
          <ul className="flex flex-col">
            {meetings.map((m) => (
              <MeetingRow key={m.id} meeting={m} onView={() => setViewing(m)} />
            ))}
          </ul>
        ) : (
          <p className="pt-3 text-[13px] leading-[18px] text-ink-muted">No meetings with {client.firstName} yet.</p>
        )}
      </div>
      {adding && <AddMeetingDialog client={client} onClose={() => setAdding(false)} />}
      {viewing && <TranscriptDialog client={client} meeting={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
