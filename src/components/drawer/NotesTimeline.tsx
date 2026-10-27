import { useState } from 'react';
import iconChevronDown from '../../assets/figma/icon-chevron-down.svg';
import dotMeta from '../../assets/figma/dot-note-meta.svg';
import iconPlus from '../../assets/figma/icon-plus-brand.svg';
import iconSearch from '../../assets/figma/icon-search-note.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientNote, Meeting } from '../../data/types';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { createdAt, meetingsFor } from '../../lib/meetings';
import { noteStamp, noteText } from '../../lib/notes';
import { useStore } from '../../state/store';
import { KIND_LABEL, KindIcon, NewNoteDialog } from './NewNoteDialog';
import { NoteDialog } from './NoteDialog';
import { TranscriptDialog } from './TranscriptDialog';

type Entry = { kind: 'note'; key: string; title: string; at: string; note: ClientNote } | { kind: 'meeting'; key: string; title: string; at: string; meeting: Meeting };

/** Everything a meeting's search reads: its title, the coach's notes and the transcript (the trial shows no summary). */
function meetingText(m: Meeting) {
  const t = m.transcript;
  const body = !t ? '' : t.kind === 'lines' ? t.lines.map((l) => l.text).join(' ') : (t.text ?? '');
  return [m.title, noteText(m.notes ?? ''), body].join(' ');
}

/** Notes and meeting notes in one list, by created time, split by day. */
function timeline(notes: ClientNote[], meetings: Meeting[], newestFirst: boolean, query: string) {
  const q = query.trim().toLowerCase();
  const entries: Entry[] = [
    ...notes.map((n): Entry => ({ kind: 'note', key: `note:${n.id}`, title: n.title, at: n.at, note: n })),
    ...meetings.map((m): Entry => ({ kind: 'meeting', key: `meeting:${m.id}`, title: m.title, at: createdAt(m), meeting: m })),
  ]
    .filter((e) => !q || (e.kind === 'note' ? `${e.title} ${noteText(e.note.body)}` : meetingText(e.meeting)).toLowerCase().includes(q))
    .sort((a, b) => (newestFirst ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)));
  const days: { date: string; entries: Entry[] }[] = [];
  for (const e of entries) {
    const date = e.at.slice(0, 10);
    const last = days[days.length - 1];
    if (last?.date === date) last.entries.push(e);
    else days.push({ date, entries: [e] });
  }
  return days;
}

/**
 * One entry (Figma 6049:170285): the timeline's rail (a 1 px Border/Light line through a 32 px ring with the kind's
 * icon), then a bordered card with "Note • Apr 10 - 3:25 PM" over the title. Hover lifts the card onto white.
 */
function EntryRow({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  return (
    <li className="flex gap-3">
      <div aria-hidden className="flex shrink-0 flex-col items-center self-stretch">
        <span className="w-px flex-1 bg-line-light" />
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-[0.842px] border-line-light">
          <KindIcon kind={entry.kind} />
        </span>
        <span className="w-px flex-1 bg-line-light" />
      </div>
      <div className="min-w-0 flex-1 py-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full flex-col items-start gap-1 rounded-lg border border-line p-4 text-left transition-[background-color,box-shadow] duration-150 hover:bg-white hover:shadow-[0_0_10px_rgba(0,0,0,0.05)] focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[13px] leading-normal text-[#636f7a]">
            {KIND_LABEL[entry.kind]}
            <img src={dotMeta} alt="" width={4} height={4} />
            {noteStamp(entry.at)}
          </span>
          <span className="w-full truncate text-[15px] font-semibold leading-[1.5] text-ink">{entry.title}</span>
        </button>
      </div>
    </li>
  );
}

/**
 * Notes timeline trial (the user's call; Figma 6049:170285): Notes and Meetings as one Notes tab. Notes and meeting
 * notes (a meeting with its transcript) run in one list by created time, split by day ("Today", "Aug 27"), each on a
 * timeline with its kind's icon. Search reads the text and any attached file. A note opens Note details, meeting
 * notes their one-page popup (no Summary on this trial). New note is one form with a Label (Note | Meeting notes).
 */
export function NotesTimeline({ client, notes: profileNotes }: { client: Client; notes: ClientNote[] }) {
  const { state } = useStore();
  const notes = state.notes[client.id] ?? profileNotes;
  const meetings = meetingsFor(client.id, state.meetings[client.id]);
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const days = timeline(notes, meetings, newestFirst, query);
  const total = notes.length + meetings.length;
  // Looked up in the whole list, so a search never closes what is open.
  const opened = open ? timeline(notes, meetings, true, '').flatMap((d) => d.entries).find((e) => e.key === open) : undefined;

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-elevated p-px">
      <div className="flex h-11 items-center justify-between rounded-t-lg border-b border-ink/10 bg-white p-3">
        <h4 className="text-[15px] font-semibold leading-[18px] text-ink">Notes ({total})</h4>
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-[14px] font-semibold leading-[18px] text-brand hover:underline">
          <img src={iconPlus} alt="" width={16} height={16} />
          New note
        </button>
      </div>
      <div className="scroll-thin flex max-h-[580px] flex-col gap-3 overflow-y-auto p-3">
        <label className="flex h-[38px] shrink-0 items-center gap-2.5 rounded-[5px] border border-[#dbdce3] px-3 focus-within:border-brand">
          <span className="relative size-5 shrink-0 overflow-hidden">
            <span className="absolute inset-[15%_14.69%_14.69%_15%]">
              <span className="absolute inset-[-3.56%]">
                <img src={iconSearch} alt="" className="block size-full max-w-none" />
              </span>
            </span>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search note"
            className="min-w-0 flex-1 bg-transparent text-[13px] leading-[1.5] text-ink outline-none placeholder:text-ink-tertiary"
          />
        </label>

        {days.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-secondary">{query ? `No notes match “${query}”.` : 'No notes yet.'}</p>
        ) : (
          <div className="flex flex-col">
            {days.map((d, i) => (
              <section key={d.date} className="flex flex-col">
                <div className="flex items-center gap-2 py-2">
                  <h5 className="flex-1 text-[13px] font-semibold uppercase leading-normal text-ink-muted">
                    {d.date === DEMO_TODAY ? 'Today' : formatMonthDay(parseDay(d.date))}
                  </h5>
                  {i === 0 && (
                    <button
                      type="button"
                      onClick={() => setNewestFirst((v) => !v)}
                      title={newestFirst ? 'Newest first' : 'Oldest first'}
                      className="flex items-center gap-1 text-[13px] font-semibold leading-normal text-[#323c47]"
                    >
                      <span className="text-[#636f7a]">Sort by:</span> Created Date
                      <img src={iconChevronDown} alt="" width={16} height={16} className={newestFirst ? '' : 'rotate-180'} />
                    </button>
                  )}
                </div>
                <ul className="flex flex-col">
                  {d.entries.map((e) => (
                    <EntryRow key={e.key} entry={e} onOpen={() => setOpen(e.key)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      {opened?.kind === 'note' && <NoteDialog key={opened.key} client={client} notes={notes} noteId={opened.note.id} onClose={() => setOpen(null)} />}
      {opened?.kind === 'meeting' && <TranscriptDialog client={client} meeting={opened.meeting} onClose={() => setOpen(null)} />}
      {adding && <NewNoteDialog client={client} notes={notes} onClose={() => setAdding(false)} />}
    </div>
  );
}
