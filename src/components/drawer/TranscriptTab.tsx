import { useState } from 'react';
import dotMeeting from '../../assets/figma/dot-meeting.svg';
import iconClock from '../../assets/figma/icon-clock-booking.svg';
import iconPlus from '../../assets/figma/icon-plus-brand.svg';
import iconVideo from '../../assets/figma/icon-video.svg';
import type { Client, Meeting } from '../../data/types';
import { WEEKDAYS } from '../../lib/checkin';
import { parseDay } from '../../lib/dates';
import { fieldTime, meetingDate, meetingWeeks, meetingWhen, meetingsFor, platformOf } from '../../lib/meetings';
import { useStore } from '../../state/store';
import { Glyph } from '../Glyph';
import { AddMeetingDialog } from './AddMeetingDialog';
import { TranscriptDialog } from './TranscriptDialog';

/**
 * One meeting (Figma 5731:517688): date tile, title, then start time and date · platform. On hover (or keyboard
 * focus) the row lifts onto a white card with a light shadow, a few px wider than the list, and shows View transcript
 * in brand blue.
 * A click anywhere on the row opens the transcript too.
 */
function MeetingRow({ meeting, onView }: { meeting: Meeting; onView: () => void }) {
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
      <DateTile date={meeting.date} />
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
        className="relative shrink-0 whitespace-nowrap pr-1 text-[13px] font-semibold leading-5 text-ink opacity-0 focus:opacity-100 group-hover/meeting:text-brand group-hover/meeting:opacity-100"
      >
        View transcript
      </button>
    </li>
  );
}

/** The 56 px date tile shared by the rows and the Latest call card: day of the month over the weekday. */
function DateTile({ date }: { date: string }) {
  const d = parseDay(date);
  return (
    <div title={meetingDate(date)} className="relative flex size-14 shrink-0 flex-col items-center justify-center rounded-[9px] border border-line bg-white text-ink">
      <span className="-mb-1 text-[20px] font-semibold leading-[1.5] tracking-[-0.4px]">{d.getUTCDate()}</span>
      <span className="text-[12px] font-semibold leading-[18px]">{WEEKDAYS[d.getUTCDay()]}</span>
    </div>
  );
}

/**
 * The newest meeting, on top of the list (the user's mock): date tile, title, "2:00 PM · 45 min · Microsoft Teams",
 * the Call Summary's overview, "Discuss" with up to three short takeaways, then View full summary (the popup on
 * Summary) and Transcript (the popup on Transcript). A meeting the coach added has no summary yet, so it says so and
 * keeps Transcript.
 */
function LatestCall({ meeting, onOpen }: { meeting: Meeting; onOpen: (tab: 'summary' | 'transcript') => void }) {
  const s = meeting.summary;
  const meta = [fieldTime(meeting.start), meeting.minutes && `${meeting.minutes} min`, meeting.link && platformOf(meeting.link)].filter(Boolean).join(' · ');
  return (
    <section aria-label="Latest call" className="flex flex-col gap-2 pt-3">
      <h5 className="text-[12px] font-semibold uppercase leading-normal text-ink-muted">Latest call</h5>
      <article className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
        <div className="flex items-center gap-4">
          <DateTile date={meeting.date} />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-[15px] font-semibold leading-5 text-ink">{meeting.title}</p>
            <p className="text-[13px] leading-[18px] text-ink-tertiary">{meta}</p>
          </div>
        </div>
        {s ? (
          <>
            <p className="text-[14px] font-semibold leading-[1.5] text-ink">{s.overview.headline}</p>
            {s.highlights.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[13px] font-semibold leading-[1.5] text-ink-secondary">Discuss</p>
                <ul className="flex list-disc flex-col gap-1 text-[14px] leading-[1.5] text-[#484848] marker:text-[#c4c9d4]">
                  {s.highlights.map((h) => (
                    <li key={h} className="ms-5">
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-[13px] leading-[1.5] text-ink-tertiary">No summary for this meeting yet.</p>
        )}
        <div className="flex items-center gap-6 border-t border-line pt-3 text-[14px] font-semibold leading-5">
          {s && (
            <button type="button" onClick={() => onOpen('summary')} className="text-brand hover:underline">
              View full summary
            </button>
          )}
          <button type="button" onClick={() => onOpen('transcript')} className="text-ink-secondary hover:text-ink">
            Transcript
          </button>
        </div>
      </article>
    </section>
  );
}

/**
 * Transcript tab of the client detail page (Figma 5731:517688): every meeting the coach has had with the client,
 * newest first, under a header per week (as Notes groups by day), each opening its transcript. "Add meeting" opens
 * the Add a meeting popup (5726:141326 upload, 5729:516037 paste).
 */
export function TranscriptTab({ client }: { client: Client }) {
  const { state } = useStore();
  const all = meetingsFor(client.id, state.meetings[client.id]);
  const weeks = meetingWeeks(all);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<{ meeting: Meeting; tab?: 'summary' | 'transcript' } | null>(null);

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-elevated p-px shadow-[0_1px_3px_rgba(24,78,255,0.07)]">
      <div className="flex items-center justify-between border-b border-ink/10 bg-white px-3 py-[14px]">
        <h4 className="text-[15px] font-semibold leading-[18px] text-ink">Meetings with {client.firstName}</h4>
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-[14px] font-semibold leading-[18px] text-brand hover:underline">
          <img src={iconPlus} alt="" width={16} height={16} />
          Add meeting
        </button>
      </div>
      {/* #f9fafa: the card well, as drawn. Latest call sits on top, outside the scroll; the list under it is capped like
          the Notes list (580 px) and scrolls inside, each week's header pinned while its meetings scroll under it. */}
      {all[0] && (
        <div className="bg-[#f9fafa] px-3">
          <LatestCall meeting={all[0]} onOpen={(tab) => setViewing({ meeting: all[0], tab })} />
        </div>
      )}
      <div className="scroll-thin flex max-h-[580px] flex-col overflow-y-auto bg-[#f9fafa] px-3 pb-3">
        {weeks.length ? (
          weeks.map((w) => (
            <section key={w.monday} className="flex flex-col">
              <h5 className="sticky top-0 z-[1] bg-[#f9fafa] pb-1 pt-3 text-[12px] font-semibold uppercase leading-normal text-ink-muted">{w.label}</h5>
              <ul className="flex flex-col">
                {w.meetings.map((m) => (
                  <MeetingRow key={m.id} meeting={m} onView={() => setViewing({ meeting: m })} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="pt-3 text-[13px] leading-[18px] text-ink-muted">No meetings with {client.firstName} yet.</p>
        )}
      </div>
      {adding && <AddMeetingDialog client={client} onClose={() => setAdding(false)} />}
      {viewing && <TranscriptDialog client={client} meeting={viewing.meeting} initialTab={viewing.tab} onClose={() => setViewing(null)} />}
    </section>
  );
}
