import { useState, type ReactNode } from 'react';
import iconClock from '../../assets/figma/icon-clock-booking.svg';
import iconPlus from '../../assets/figma/icon-plus-brand.svg';
import type { Client, Meeting } from '../../data/types';
import { meetingWeeks, meetingWhen, meetingsFor } from '../../lib/meetings';
import { useStore } from '../../state/store';
import { Glyph } from '../Glyph';
import { AddMeetingDialog } from './AddMeetingDialog';
import { TranscriptDialog } from './TranscriptDialog';

/**
 * One meeting (Figma 5731:517688, without its date tile and platform, the user's call): title, then start time and
 * date. On hover (or keyboard focus) the row lifts onto a white card with a light shadow, a few px wider than the list, and shows View summary
 * in brand blue.
 * A click anywhere on the row opens the transcript too.
 */
function MeetingRow({ meeting, onView, children }: { meeting: Meeting; onView: () => void; children?: ReactNode }) {
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
      <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="truncate text-[14px] font-semibold leading-5 text-ink">{meeting.title}</p>
        <div className="flex items-center gap-2 whitespace-nowrap text-[13px] leading-[18px] tracking-[0.13px]">
          <span className="flex items-center gap-1.5 text-[#484848]">
            <Glyph src={iconClock} size={14} inset="8.33%" bleed="-6% -5.99% -6% -6.01%" />
            {meetingWhen(meeting)}
          </span>
        </div>
        {children}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onView();
        }}
        className="relative shrink-0 whitespace-nowrap pr-1 text-[13px] font-semibold leading-5 text-ink opacity-0 focus:opacity-100 group-hover/meeting:text-brand group-hover/meeting:opacity-100"
      >
        {/* The popup opens on Summary for a recorded call; a meeting the coach added has only its transcript. */}
        {meeting.summary ? 'View summary' : 'View transcript'}
      </button>
    </li>
  );
}

/**
 * The newest meeting, on top of the list: a meeting row like the others (the user's call), with the Call Summary's
 * overview and "Discuss" (up to three short takeaways) under its time line. A click opens the popup on Summary, or on
 * Transcript for a meeting the coach added, which has no summary yet.
 */
function LatestCall({ meeting, onOpen }: { meeting: Meeting; onOpen: () => void }) {
  const s = meeting.summary;
  return (
    <section aria-label="Latest call" className="flex flex-col">
      <h5 className="pb-1 pt-3 text-[12px] font-semibold uppercase leading-normal text-ink-muted">Latest call</h5>
      <ul className="flex flex-col">
        <MeetingRow meeting={meeting} onView={onOpen}>
          {s ? (
            <div className="flex flex-col gap-1 pt-1 text-[13px] leading-[1.5] text-[#484848]">
              <p>{s.overview.headline}</p>
              {s.highlights.length > 0 && (
                <>
                  <p className="font-semibold text-ink-secondary">Discuss</p>
                  <ul className="flex list-disc flex-col gap-0.5 marker:text-[#c4c9d4]">
                    {s.highlights.map((h) => (
                      <li key={h} className="ms-5">
                        {h}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <p className="pt-1 text-[13px] leading-[1.5] text-ink-tertiary">No summary for this meeting yet.</p>
          )}
        </MeetingRow>
      </ul>
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
      {/* #f9fafa: the card well, as drawn. Latest call sits on top, outside the scroll; the list under it is capped like
          the Notes list (580 px) and scrolls inside, each week's header pinned while its meetings scroll under it. */}
      {all[0] && (
        <div className="bg-[#f9fafa] px-3">
          <LatestCall meeting={all[0]} onOpen={() => setViewing(all[0])} />
        </div>
      )}
      <div className="scroll-thin flex max-h-[580px] flex-col overflow-y-auto bg-[#f9fafa] px-3 pb-3">
        {weeks.length ? (
          weeks.map((w) => (
            <section key={w.monday} className="flex flex-col">
              <h5 className="sticky top-0 z-[1] bg-[#f9fafa] pb-1 pt-3 text-[12px] font-semibold uppercase leading-normal text-ink-muted">{w.label}</h5>
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
