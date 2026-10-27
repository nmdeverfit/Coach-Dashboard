import { Paperclip, Plus } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import iconClipboard from '../../assets/figma/icon-clipboard.svg';
import iconSparkle from '../../assets/figma/icon-ai-sparkle.svg';
import { COACH_FIRST_NAME, DEMO_TODAY } from '../../data/mock';
import type { Client, Transcript } from '../../data/types';
import { TRANSCRIPT_TYPES, fileSize } from '../../lib/meetings';
import { summarizeTranscript } from '../../lib/meetingSummary';
import { detectTranscript, statsLine, titleFrom, transcriptStats, type Detection } from '../../lib/noteKind';
import { cleanNoteHtml, noteText } from '../../lib/notes';
import { useStore } from '../../state/store';
import { FileTypeIcon, fileExtension } from '../FileTypeIcon';
import { Glyph } from '../Glyph';
import { MeetingWhen, SPEAKER, TIME_ZONE, transcriptFileError, transcriptFileText } from './AddMeetingDialog';
import { EditorFooter, NoteEditor, NoteHeader, TITLE } from './NoteDialog';

const NOW = '06:00';

type Attached = { kind: 'text'; text: string } | { kind: 'file'; name: string; size: number; text?: string };

const textOf = (t: Attached | null) => t?.text;

/** The attached transcript (no frame): what it is and what is in it, then the lines, speakers in bold, scrolling. */
function TranscriptCard({ attached, reading, onReplace, onRemove }: { attached: Attached; reading: boolean; onReplace: () => void; onRemove: () => void }) {
  const text = textOf(attached);
  const lines = text?.split(/\r?\n/).filter((l) => l.trim()) ?? [];
  const stats = text ? statsLine(transcriptStats(text)) : '';
  const meta = attached.kind === 'file' ? [fileSize(attached.size), fileExtension(attached.name).toUpperCase(), stats].filter(Boolean).join(' · ') : stats;
  return (
    <section aria-label="Transcript" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-[1.5px] border-[#e0e0e0]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#e0e0e0] bg-white px-3 py-2.5 text-[13px] leading-[1.5]">
        {attached.kind === 'file' ? (
          <FileTypeIcon name={attached.name} />
        ) : (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
            <Glyph src={iconClipboard} size={20} inset="15.13% 15.43% 14.87% 20.43%" bleed="-4.78% -5.22%" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate font-semibold text-ink" title={attached.kind === 'file' ? attached.name : undefined}>
            {attached.kind === 'file' ? attached.name : 'Pasted transcript'}
          </p>
          <p className="truncate text-[12px] leading-[18px] text-ink-tertiary">{reading ? 'Reading the file…' : meta}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-semibold">
          {attached.kind === 'file' && (
            <button type="button" onClick={onReplace} className="text-brand hover:underline">
              Replace
            </button>
          )}
          <button type="button" onClick={onRemove} className="text-ink-secondary hover:text-ink">
            Remove
          </button>
        </div>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto bg-[#f9fafa] px-3 py-2.5 text-[13px] leading-[1.6] text-ink">
        {reading ? (
          <p className="animate-pulse text-ink-tertiary">Reading the file…</p>
        ) : lines.length ? (
          lines.map((l, i) => {
            const m = l.match(SPEAKER);
            return (
              <p key={i} className="mb-1 break-words last:mb-0">
                {m ? (
                  <>
                    <span className="font-semibold">{m[1]}</span>
                    {m[2]}
                  </>
                ) : (
                  l
                )}
              </p>
            );
          })
        ) : (
          <p className="text-ink-tertiary">
            {attached.kind === 'file' && fileExtension(attached.name) === 'pdf'
              ? 'No preview for .pdf files in the demo. The file is kept with the meeting notes, without a summary.'
              : 'No text found in this file.'}
          </p>
        )}
      </div>
    </section>
  );
}

/** A transcript pasted into the notes: one click moves it out into the attached transcript. */
function MoveBanner({ detection, onMove, onKeep }: { detection: Detection; onMove: () => void; onKeep: () => void }) {
  return (
    <div className="mx-8 mt-4 flex shrink-0 items-center gap-2.5 rounded-lg border border-brand/20 bg-brand/[0.04] px-3 py-2">
      <img src={iconSparkle} alt="" width={14} height={14} className="shrink-0" />
      <p className="min-w-0 flex-1 text-[12px] leading-[18px] text-ink">
        <span className="font-semibold">That looks like the transcript</span> ({detection.reason}).
      </p>
      <button type="button" onClick={onMove} className="h-7 shrink-0 rounded-[6px] bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand/90">
        Move to transcript
      </button>
      <button type="button" onClick={onKeep} className="shrink-0 text-[12px] font-semibold text-ink-secondary hover:text-ink">
        Keep in notes
      </button>
    </div>
  );
}

/**
 * Meeting notes on the Notes timeline trial (the user's call; no frame): a note about a call, with its transcript
 * attached. The coach's notes come first, in the note editor; Attach transcript (or a file dropped anywhere on the
 * form) adds the transcript, shown as a card with what it holds and a scrolling preview. Once one is attached and the
 * notes are empty, the notes fold into "Add your notes (optional)" so the transcript takes the room; notes already
 * typed stay open above it. A transcript pasted into the notes offers Move to transcript. Save needs notes or a
 * transcript; the summary is written from the transcript's text (none for a .pdf or without a transcript).
 */
export function MeetingNotesForm({
  client,
  title,
  onTitle,
  initialNotes = '',
  seed,
  above,
  notice,
  onChange,
  onCancel,
  onSaved,
}: {
  client: Client;
  title: string;
  onTitle: (title: string) => void;
  initialNotes?: string;
  seed?: { pasted?: string; file?: File };
  /** The kind chip or toggle over the title. */
  above?: ReactNode;
  /** A line over the form, e.g. why a note became meeting notes. */
  notice?: ReactNode;
  /** The notes and the pasted transcript as they stand, so the form can turn back into a note. */
  onChange?: (s: { notes: string; pasted: string }) => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { state, addMeeting } = useStore();
  const [date, setDate] = useState(DEMO_TODAY);
  const [time, setTime] = useState(NOW);
  const [notes, setNotes] = useState(initialNotes);
  const [editorKey, setEditorKey] = useState(0);
  const [attached, setAttached] = useState<Attached | null>(seed?.pasted ? { kind: 'text', text: seed.pasted } : null);
  const [reading, setReading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [notesOpen, setNotesOpen] = useState(Boolean(noteText(initialNotes)) || !seed?.pasted);
  const [move, setMove] = useState<{ detection: Detection; text: string; before: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const added = state.meetings[client.id] ?? [];
  const newTitle = `New Meeting ${1 + added.filter((m) => /^New Meeting \d+$/.test(m.title)).length}`;
  const suggested = attached ? titleFrom(textOf(attached), attached.kind === 'file' ? attached.name : undefined) : undefined;
  const hasNotes = Boolean(noteText(notes)) || /<li/i.test(notes);

  useEffect(() => {
    onChange?.({ notes, pasted: attached?.kind === 'text' ? attached.text : '' });
  }, [notes, attached, onChange]);

  const attach = (f: File) => {
    const error = transcriptFileError(f);
    setFileError(error ?? '');
    if (error) return;
    setAttached({ kind: 'file', name: f.name, size: f.size });
    if (!hasNotes) setNotesOpen(false);
    const read = transcriptFileText(f);
    if (!read) return;
    setReading(true);
    read.then((text) => {
      setReading(false);
      if (text) setAttached((cur) => (cur?.kind === 'file' && cur.name === f.name ? { ...cur, text } : cur));
    });
  };

  // A seeded file is read as if the coach had just attached it.
  useEffect(() => {
    if (seed?.file) attach(seed.file);
    // Once, on the seed the form opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    if (reading || (!hasNotes && !attached)) return;
    const text = textOf(attached);
    const summary = text ? summarizeTranscript(text, client.firstName, COACH_FIRST_NAME) : undefined;
    const transcript: Transcript | undefined = attached ?? undefined;
    addMeeting(client.id, {
      id: `${client.id}-added-${Date.now()}`,
      title: title.trim() || suggested || newTitle,
      date,
      start: time,
      timeZone: TIME_ZONE,
      transcript,
      notes: hasNotes ? cleanNoteHtml(notes) : undefined,
      createdAt: `${DEMO_TODAY}T${NOW}`,
      summary,
      summaryPending: Boolean(summary),
    });
    onSaved();
  };

  const editor = (height: string) => (
    <NoteEditor
      key={editorKey}
      initial={notes}
      placeholder={`Type your notes from the meeting with ${client.firstName}...`}
      onChange={setNotes}
      onPasteText={(text) => {
        const found = !attached && detectTranscript(text);
        // `notes` is still the text from before the paste.
        if (found) setMove({ detection: found, text, before: notes });
      }}
      height={height}
    />
  );

  return (
    <>
      <NoteHeader
        above={above}
        title={
          <input
            autoFocus
            value={title}
            onChange={(e) => onTitle(e.target.value)}
            placeholder={suggested ?? newTitle}
            aria-label="Meeting title"
            maxLength={100}
            className={`${TITLE} min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#1a1a1a]/50`}
          />
        }
      >
        <MeetingWhen date={date} time={time} onDate={setDate} onTime={setTime} />
      </NoteHeader>

      <div
        className={`relative flex h-[440px] shrink-0 flex-col ${dragging ? 'bg-brand/[0.03]' : ''}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
        onDrop={(e) => {
          const f = e.dataTransfer.files[0];
          setDragging(false);
          if (!f) return;
          e.preventDefault();
          attach(f);
        }}
      >
        {notice && <div className="mx-8 mt-4 shrink-0">{notice}</div>}
        {move && (
          <MoveBanner
            detection={move.detection}
            onKeep={() => setMove(null)}
            onMove={() => {
              setNotes(move.before);
              setEditorKey((k) => k + 1);
              setAttached({ kind: 'text', text: move.text.trim() });
              setNotesOpen(Boolean(noteText(move.before)));
              setMove(null);
            }}
          />
        )}
        {!attached ? (
          editor('min-h-0 flex-1')
        ) : (
          <>
            {notesOpen ? (
              editor('h-[176px] shrink-0')
            ) : (
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                className="mx-8 mt-4 flex shrink-0 items-center gap-1.5 self-start text-[13px] font-semibold leading-[1.5] text-brand hover:underline"
              >
                <Plus size={14} aria-hidden />
                Add your notes <span className="font-normal text-ink-tertiary">(optional)</span>
              </button>
            )}
            <div className={`flex min-h-0 flex-1 flex-col px-8 pb-2 ${notesOpen ? 'pt-1' : 'pt-3'}`}>
              <TranscriptCard
                attached={attached}
                reading={reading}
                onReplace={() => fileInput.current?.click()}
                onRemove={() => {
                  setAttached(null);
                  setReading(false);
                  setNotesOpen(true);
                }}
              />
            </div>
          </>
        )}
        {fileError && <p className="mx-8 shrink-0 pb-1 text-[12px] leading-[18px] text-danger">{fileError}</p>}
        {dragging && (
          <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-lg border-[1.5px] border-dashed border-brand text-[13px] font-semibold text-brand">
            Drop the transcript to attach it
          </div>
        )}
      </div>
      <EditorFooter
        canSave={(hasNotes || Boolean(attached)) && !reading}
        onCancel={onCancel}
        onSave={save}
        start={
          !attached && (
            <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 text-[13px] font-semibold leading-[1.5] text-ink-secondary hover:text-brand">
              <Paperclip size={14} aria-hidden />
              Attach transcript
            </button>
          )
        }
      />
      <input
        ref={fileInput}
        type="file"
        accept={TRANSCRIPT_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) attach(f);
        }}
      />
    </>
  );
}
