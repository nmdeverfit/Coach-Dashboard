import { useState } from 'react';
import iconSparkle from '../../assets/figma/icon-ai-sparkle.svg';
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
 * date, and "Generating summary…" while a meeting the coach just added has its summary written. On hover (or
 * keyboard focus) the row lifts onto a white card with a light shadow, a few px wider than the list, and shows View
 * summary in brand blue. A click anywhere on the row opens the popup too.
 */
function MeetingRow({ meeting, onView }: { meeting: Meeting; onView: () => void }) {
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
          {meeting.summaryPending && (
            <span className="flex animate-pulse items-center gap-1 text-ink-tertiary">
              <img src={iconSparkle} alt="" width={12} height={12} />
              Generating summary…
            </span>
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
        {/* The popup opens on Summary whenever the meeting has one, or is about to. */}
        {meeting.summary ? 'View summary' : 'View transcript'}
      </button>
    </li>
  );
}

/**
 * Meetings tab of the client detail page (Figma 5731:517688): every meeting the coach has had with the client,
 * newest created first, under a header per week they were created in (as Notes groups by day), each opening its popup. "Add meeting" opens
 * the Add a meeting popup (5726:141326 upload, 5729:516037 paste).
 */
export function TranscriptTab({ client }: { client: Client }) {
  const { state } = useStore();
  const all = meetingsFor(client.id, state.meetings[client.id]);
  const weeks = meetingWeeks(all);
  const [adding, setAdding] = useState(false);
  // By id, so an open popup follows the meeting when its summary comes in.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const viewing = all.find((m) => m.id === viewingId);

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-elevated p-px shadow-[0_1px_3px_rgba(24,78,255,0.07)]">
      <div className="flex items-center justify-between border-b border-ink/10 bg-white px-3 py-[14px]">
        <h4 className="text-[15px] font-semibold leading-[18px] text-ink">Meetings with {client.firstName}</h4>
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-[14px] font-semibold leading-[18px] text-brand hover:underline">
          <img src={iconPlus} alt="" width={16} height={16} />
          Add meeting
        </button>
      </div>
      {/* #f9fafa: the card well, as drawn. The list is capped like the Notes list (580 px) and scrolls inside, each
          week's header pinned while its meetings scroll under it. */}
      <div className="scroll-thin flex max-h-[580px] flex-col overflow-y-auto bg-[#f9fafa] px-3 pb-3">
        {weeks.length ? (
          weeks.map((w) => (
            <section key={w.monday} className="flex flex-col">
              <h5 className="sticky top-0 z-[1] bg-[#f9fafa] pb-1 pt-3 text-[12px] font-semibold uppercase leading-normal text-ink-muted">{w.label}</h5>
              <ul className="flex flex-col">
                {w.meetings.map((m) => (
                  <MeetingRow key={m.id} meeting={m} onView={() => setViewingId(m.id)} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="pt-3 text-[13px] leading-[18px] text-ink-muted">No meetings with {client.firstName} yet.</p>
        )}
      </div>
      {adding && <AddMeetingDialog client={client} onClose={() => setAdding(false)} />}
      {viewing && <TranscriptDialog client={client} meeting={viewing} onClose={() => setViewingId(null)} />}
    </section>
  );
}
