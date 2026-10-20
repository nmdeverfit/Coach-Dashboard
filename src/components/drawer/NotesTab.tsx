import { useState } from 'react';
import iconChevronDown from '../../assets/figma/icon-chevron-down.svg';
import iconPlus from '../../assets/figma/icon-plus-brand.svg';
import iconSearch from '../../assets/figma/icon-search-note.svg';
import type { Client, ClientNote } from '../../data/types';
import { groupNotes } from '../../lib/client';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { useStore } from '../../state/store';
import { NoteDialog } from './NoteDialog';

/**
 * Notes tab (Figma 5671:141582): search (titles and text), day groups, sort by created date. A note opens Note details;
 * New note opens the editor (`NoteDialog`). The coach's changes replace the profile's notes for the session.
 */
export function NotesTab({ client, notes: profileNotes }: { client: Client; notes: ClientNote[] }) {
  const { state } = useStore();
  const notes = state.notes[client.id] ?? profileNotes;
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  // The open popup: a note's id, 'new' for the editor, or null.
  const [open, setOpen] = useState<string | null>(null);
  const groups = groupNotes(notes, newestFirst, query);

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-elevated p-px">
      <div className="flex h-11 items-center justify-between rounded-t-lg border-b border-ink/10 bg-white p-3">
        <h4 className="text-[15px] font-semibold leading-[18px] text-ink">Notes ({notes.length})</h4>
        <button
          type="button"
          onClick={() => setOpen('new')}
          className="flex items-center gap-1 text-[14px] font-semibold leading-[18px] text-brand hover:underline"
        >
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

        {groups.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-ink-secondary">{query ? `No notes match “${query}”.` : 'No notes yet.'}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((g, gi) => (
              <section key={g.date} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 py-1">
                  <h5 className="flex-1 text-[12px] font-semibold uppercase leading-normal text-ink-muted">{formatMonthDay(parseDay(g.date))}</h5>
                  {gi === 0 && (
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
                  {g.notes.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(n.id)}
                        className="flex w-full flex-col items-start gap-1 rounded-lg border-b border-ink/10 px-3 py-2 text-left hover:border-transparent hover:bg-[#e1e1ea]/60"
                      >
                        <span className="text-[14px] font-semibold leading-[1.5] text-ink">{n.title}</span>
                        <span className="text-[11px] leading-normal text-[#636f7a]">{n.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      {open && <NoteDialog key={open} client={client} notes={notes} noteId={open === 'new' ? null : open} onClose={() => setOpen(null)} />}
    </div>
  );
}
