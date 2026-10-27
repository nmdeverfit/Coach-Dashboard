import { X } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import iconSparkle from '../../assets/figma/icon-ai-sparkle.svg';
import iconSticky from '../../assets/figma/icon-note-sticky.svg';
import iconVideo from '../../assets/figma/icon-note-video.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientNote } from '../../data/types';
import { TRANSCRIPT_TYPES } from '../../lib/meetings';
import { cleanNoteHtml, noteStamp, noteText } from '../../lib/notes';
import type { NotesVariant } from '../../lib/notesTrial';
import { useStore } from '../../state/store';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { Tooltip } from '../Tooltip';
import { AttachTranscriptButton, MeetingNotesForm, type MeetingDraft } from './MeetingNotesForm';
import { EditorFooter, NoteEditor, NoteHeader, TITLE, TimeLine } from './NoteDialog';

export type NoteKind = 'note' | 'meeting';

/** A note written now: the demo's clock reads 06:00, as for a message sent from the dashboard. */
const NOW = `${DEMO_TODAY}T06:00`;

export const KIND_LABEL: Record<NoteKind, string> = { note: 'Note', meeting: 'Meeting notes' };

/** The timeline's two icons (Figma 6049:170285: energy-icons sticky-note, carbon video-chat), drawn at 16.84 px. */
export function KindIcon({ kind, size = 16.842 }: { kind: NoteKind; size?: number }) {
  return <img src={kind === 'note' ? iconSticky : iconVideo} alt="" width={size} height={size} className="block shrink-0" />;
}

/** The kind over the title: plain (B), or with × to turn meeting notes back into a note (A). */
function KindChip({ kind, onClear }: { kind: NoteKind; onClear?: () => void }) {
  return (
    <span className="flex h-7 items-center gap-1.5 rounded-full border border-line-light bg-white pl-2 pr-2.5 text-[12px] font-semibold leading-none text-ink">
      <KindIcon kind={kind} size={14} />
      {KIND_LABEL[kind]}
      {onClear && (
        <span className="group/tip relative -mr-1 flex">
          <button type="button" aria-label="Change to a note" onClick={onClear} className="flex size-5 items-center justify-center rounded-full text-ink-secondary hover:bg-surface-secondary hover:text-ink">
            <X size={12} aria-hidden />
          </button>
          <Tooltip label="Change to a note" />
        </span>
      )}
    </span>
  );
}

/** C: Note | Meeting notes, which the coach flips. */
function KindToggle({ kind, onChange }: { kind: NoteKind; onChange: (k: NoteKind) => void }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div role="radiogroup" aria-label="Kind" className="flex shrink-0 rounded-lg bg-surface-secondary p-0.5">
        {(['note', 'meeting'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => kind !== k && onChange(k)}
            className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold leading-none ${
              kind === k ? 'bg-white text-ink shadow-[0_1px_2px_rgba(32,35,83,0.12)]' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            <KindIcon kind={k} size={14} />
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A: why the note became meeting notes (a transcript file was attached), with the way back. */
function SwitchedNotice({ why, onUndo }: { why: string; onUndo: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-secondary px-3 py-2 text-[12px] leading-[18px] text-ink-tertiary">
      <img src={iconSparkle} alt="" width={12} height={12} className="shrink-0" />
      <span className="min-w-0 flex-1">Saved as meeting notes: {why}.</span>
      <button type="button" onClick={onUndo} className="shrink-0 font-semibold text-brand hover:underline">
        Keep as a note
      </button>
    </div>
  );
}

/**
 * New note on the Notes timeline trial (the user's call; no frame), one popup for the three ways being compared
 * (`NotesVariant`). As a note it is the editor (Figma 5850:570122); as meeting notes it is the Add a meeting form
 * (`MeetingNotesForm`: the notes, then the attached transcript). A meeting note is a note with a transcript, so the
 * kind follows the transcript file; the note's own text always stays the coach's notes. Nothing reads what is pasted:
 * the team can't detect a transcript yet (the user's call), so a paste stays where it lands.
 * - A: one New note. Attaching a transcript file (Attach transcript, or dropped on the editor) makes it meeting notes,
 *   with a line saying why and Keep as a note.
 * - B: the coach picked the kind on New note ▾ (`start`).
 * - C: a Note | Meeting notes toggle the coach flips; its Note tab takes no file.
 * Turning meeting notes back into a note keeps the notes; with a file attached it asks first (Switch to a note?),
 * since a note keeps no transcript. The meeting's date and start survive the trip.
 */
export function NewNoteDialog({
  client,
  notes,
  variant,
  start,
  onClose,
}: {
  client: Client;
  notes: ClientNote[];
  variant: NotesVariant;
  start: NoteKind;
  onClose: () => void;
}) {
  const { setNotes } = useStore();
  const [kind, setKind] = useState<NoteKind>(start);
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  // The editor sets its text once, so a note coming back from meeting notes remounts it.
  const [editorKey, setEditorKey] = useState(0);
  const [seed, setSeed] = useState<{ key: number; notes: string; pasted?: string; file?: File; date?: string; time?: string }>({ key: 0, notes: '' });
  // The meeting notes form as it stands (its notes, transcript and time), and what the note handed it. The time
  // outlives a trip to the Note side, so switching back keeps the meeting's date and start.
  const current = useRef<MeetingDraft>({ notes: '', pasted: '', date: DEMO_TODAY, time: '06:00' });
  // Turning meeting notes with an attached file into a note asks first: a note keeps no transcript.
  const [confirmNote, setConfirmNote] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // Only A takes a transcript file on the Note side, its one way into meeting notes; on B and C a note is a note and
  // the coach picks Meeting notes to attach one (the user's call).
  const attaches = variant === 'A';
  const newTitle = `New Note ${1 + notes.filter((n) => /^New Note \d+$/.test(n.title)).length}`;

  /** The note's text goes along as the meeting's notes. */
  const toMeeting = (file: File | undefined, reason: string | null) => {
    const { date, time } = current.current;
    current.current = { notes: html, pasted: '', file: file?.name, date, time };
    setSeed((s) => ({ key: s.key + 1, notes: html, file, date, time }));
    setKind('meeting');
    setWhy(reason);
  };

  const toNote = () => (current.current.file ? setConfirmNote(true) : switchToNote());

  const switchToNote = () => {
    setConfirmNote(false);
    const now = current.current;
    current.current = { ...now, file: undefined };
    setHtml(now.notes);
    setEditorKey((k) => k + 1);
    setKind('note');
    setWhy(null);
  };

  const attach = (file: File) => toMeeting(file, variant === 'A' ? 'a transcript file is attached' : null);
  const track = useCallback((s: MeetingDraft) => {
    current.current = s;
  }, []);

  const above: ReactNode =
    variant === 'C' ? (
      <KindToggle kind={kind} onChange={(k) => (k === 'meeting' ? toMeeting(undefined, null) : toNote())} />
    ) : variant === 'B' ? (
      <KindChip kind={kind} />
    ) : kind === 'meeting' ? (
      <KindChip kind="meeting" onClear={toNote} />
    ) : null;

  const save = () => {
    const added: ClientNote = { id: `c${Date.now()}`, title: title.trim() || newTitle, at: NOW, body: cleanNoteHtml(html) };
    setNotes(client.id, [added, ...notes], 'Note added');
    onClose();
  };

  return (
    <Modal title={kind === 'note' ? 'New note' : 'New meeting notes'} width={600} radius={12} onClose={onClose} header={<></>}>
      {kind === 'meeting' ? (
        <MeetingNotesForm
          key={seed.key}
          client={client}
          title={title}
          onTitle={setTitle}
          initialNotes={seed.notes}
          seed={seed}
          onChange={track}
          above={above}
          notice={variant === 'A' && why ? <SwitchedNotice why={why} onUndo={toNote} /> : undefined}
          onCancel={onClose}
          onSaved={onClose}
        />
      ) : (
        <>
          <NoteHeader
            above={above}
            title={
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={newTitle}
                aria-label="Note title"
                maxLength={100}
                className={`${TITLE} min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#1a1a1a]/50`}
              />
            }
          >
            <TimeLine>Created: {noteStamp(NOW)}</TimeLine>
          </NoteHeader>
          <NoteEditor
            key={editorKey}
            initial={html}
            placeholder={`Type your note for ${client.firstName}...`}
            onChange={setHtml}
            onDropFile={attaches ? attach : undefined}
            toolbarEnd={attaches && <AttachTranscriptButton onClick={() => fileInput.current?.click()} />}
          />
          <EditorFooter
            canSave={Boolean(noteText(html)) || /<li/i.test(html)}
            onCancel={onClose}
            onSave={save}
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
      )}
      {confirmNote &&
        createPortal(
          <ConfirmDialog
            title="Switch to a note?"
            body={`“${current.current.file}” will be removed. A note keeps no transcript; your notes stay.`}
            confirmLabel="Switch to note"
            onCancel={() => setConfirmNote(false)}
            onConfirm={switchToNote}
          />,
          document.body,
        )}
    </Modal>
  );
}
