import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientNote, Meeting, Transcript } from '../../data/types';
import { TRANSCRIPT_TYPES } from '../../lib/meetings';
import { titleFrom } from '../../lib/noteKind';
import { cleanNoteHtml, noteStamp, noteText } from '../../lib/notes';
import { useStore } from '../../state/store';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { MeetingWhen, TIME_ZONE } from './AddMeetingDialog';
import { INLINE_HEIGHT, KIND_LABEL, NotesCardBar, TranscriptFileCard, UploadTranscriptButton, transcriptCard, useAttachedFile, type NoteKind } from './NoteAttachment';
import { EditorButtons, EditorFooter, KindTag, NOTE_POPUP, NoteEditor, NoteHeader, TITLE_INPUT, TimeLine } from './NoteDialog';

/** The demo's clock reads 06:00, as for a message sent from the dashboard. */
const NOW = '06:00';

/** Note | Meeting notes over the title (the user's pick): text tabs, no icons, the chosen one on a white thumb. */
function KindTabs({ kind, onChange }: { kind: NoteKind; onChange: (k: NoteKind) => void }) {
  return (
    <div role="tablist" aria-label="Note type" className="flex rounded-lg bg-surface-secondary p-0.5">
      {(['note', 'meeting'] as const).map((k) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={kind === k}
          onClick={() => kind !== k && onChange(k)}
          className={`flex h-7 items-center rounded-md px-3 text-[12px] font-semibold leading-none ${
            kind === k ? 'bg-white text-ink shadow-[0_1px_2px_rgba(32,35,83,0.12)]' : 'text-ink-secondary hover:text-ink'
          }`}
        >
          {KIND_LABEL[k]}
        </button>
      ))}
    </div>
  );
}

/**
 * New note on the Notes timeline trial (the user's call; no frame): one form, the note editor (Figma 5850:570122),
 * with Note | Meeting notes tabs over the title. A note is text only, "Created: …". Meeting notes carry the meeting's
 * date and start (editable) and an Upload transcript button on the toolbar (a file dropped on the form works too):
 * the file shows under the text as a preview card (Replace · Remove). The text stays when the tab changes; leaving
 * Meeting notes with a file in asks first, since a note keeps no transcript. Save needs text, or on Meeting notes a
 * file. Nothing reads what is pasted. With `editing` it is Edit meeting notes (the user's call, like a note's Edit):
 * the meeting's own title, time, notes and transcript (a recorded call's lines included), no tabs; with `editingNote`
 * it is Edit note. With `inline` (option B, the user's call) the same form fills the Notes card instead of a popup,
 * its header reading the form's name with Cancel · Save. With `unified` (option C, the user's call) there are no tabs:
 * the form is a note until a transcript is uploaded (or dropped), which makes it meeting notes, with the meeting's date
 * and start; removing the file makes it a note again. That holds on edits too, so an edited note that gains a
 * transcript is saved as meeting notes, and meeting notes that lose theirs as a note (`onConverted` gets the new
 * entry's key, so the card opens it).
 */
export function NewNoteDialog({
  client,
  notes,
  editing,
  editingNote,
  inline = false,
  unified = false,
  onClose,
  onConverted,
}: {
  client: Client;
  notes: ClientNote[];
  editing?: Meeting;
  editingNote?: ClientNote;
  inline?: boolean;
  unified?: boolean;
  onClose: () => void;
  onConverted?: (key: string) => void;
}) {
  const { state, setNotes, addMeeting, editMeeting, deleteMeeting } = useStore();
  const [kindTab, setKind] = useState<NoteKind>(editing ? 'meeting' : 'note');
  const [title, setTitle] = useState(editing?.title ?? editingNote?.title ?? '');
  const [html, setHtml] = useState(editing?.notes ?? editingNote?.body ?? '');
  // A note that gains a transcript (option C) becomes meeting notes held when the note was written.
  const [date, setDate] = useState(editing?.date ?? editingNote?.at.slice(0, 10) ?? DEMO_TODAY);
  const [time, setTime] = useState(editing?.start ?? editingNote?.at.slice(11, 16) ?? NOW);
  const [dragging, setDragging] = useState(false);
  const { file, reading, error, attach: attachFile, remove: removeFile } = useAttachedFile(editing?.transcript?.kind === 'file' ? editing.transcript : null);
  // A transcript that is not a file (a recorded call's lines, or pasted text) can only be kept or removed.
  const [other, setOther] = useState<Transcript | null>(editing?.transcript && editing.transcript.kind !== 'file' ? editing.transcript : null);
  const transcript: Transcript | null = file ?? other;
  const attach = (f: File) => {
    setOther(null);
    attachFile(f);
  };
  const remove = () => {
    removeFile();
    setOther(null);
  };
  // Leaving Meeting notes with a transcript in asks first.
  const [confirmNote, setConfirmNote] = useState(false);
  // Option C: no tabs, the transcript decides.
  const kind: NoteKind = unified ? (transcript ? 'meeting' : 'note') : kindTab;
  const meeting = kind === 'meeting';
  const canAttach = meeting || unified;
  const takeFile = (f: File) => canAttach && attach(f);
  const fileInput = useRef<HTMLInputElement>(null);
  // A new note opens with the caret in its title (the user's call); an edit opens at the end of the text.
  const isNew = !editing && !editingNote;
  const toBody = useRef<(() => void) | null>(null);
  const browse = () => fileInput.current?.click();
  const hasText = Boolean(noteText(html)) || /<li/i.test(html);
  const meetings = state.meetings[client.id] ?? [];
  const placeholder = editing
    ? editing.title
    : editingNote
      ? editingNote.title
      : kind === 'meeting'
      ? (file && titleFrom(file.text, file.name)) || `New Meeting ${1 + meetings.filter((m) => /^New Meeting \d+$/.test(m.title)).length}`
      : `New Note ${1 + notes.filter((n) => /^New Note \d+$/.test(n.title)).length}`;

  const switchTo = (k: NoteKind) => (k === 'note' && file ? setConfirmNote(true) : setKind(k));

  const save = () => {
    if (reading || (!hasText && !transcript)) return;
    const body = hasText ? cleanNoteHtml(html) : '';
    const name = title.trim() || placeholder;
    const stamp = `${DEMO_TODAY}T${NOW}`;
    if (editingNote && transcript) {
      // Option C: the note gained a transcript, so it is saved as meeting notes in its place.
      const id = `${client.id}-added-${Date.now()}`;
      addMeeting(client.id, { id, title: name, date, start: time, timeZone: TIME_ZONE, transcript, notes: body || undefined, createdAt: editingNote.at, editedAt: stamp });
      setNotes(client.id, notes.filter((n) => n.id !== editingNote.id), 'Saved as meeting notes');
      onConverted?.(`meeting:${id}`);
    } else if (editing && unified && !transcript) {
      // Option C: the meeting notes lost their transcript, so they are saved as a note in their place.
      const note: ClientNote = { id: `c${Date.now()}`, title: name, at: editing.createdAt ?? `${editing.date}T${editing.start}`, body, editedAt: stamp };
      deleteMeeting(editing.id);
      setNotes(client.id, [note, ...notes], 'Saved as a note');
      onConverted?.(`note:${note.id}`);
    } else if (editingNote) {
      const edited: ClientNote = { ...editingNote, title: name, body, editedAt: stamp };
      setNotes(client.id, notes.map((n) => (n.id === editingNote.id ? edited : n)), 'Note saved');
    } else if (editing) {
      editMeeting({ ...editing, title: name, date, start: time, notes: body || undefined, transcript: transcript ?? undefined });
    } else if (kind === 'note') {
      const added: ClientNote = { id: `c${Date.now()}`, title: name, at: stamp, body };
      setNotes(client.id, [added, ...notes], 'Note added');
    } else {
      addMeeting(client.id, {
        id: `${client.id}-added-${Date.now()}`,
        title: name,
        date,
        start: time,
        timeZone: TIME_ZONE,
        transcript: file ?? undefined,
        notes: body || undefined,
        createdAt: stamp,
      });
    }
    onClose();
  };

  // One heading for a new note whichever tab is on: "New note" / "New meeting notes" read as the note's own title
  // (the user's call).
  // Option C names an edit by what it will be saved as.
  const heading = editing || editingNote ? (unified ? (meeting ? 'Edit meeting notes' : 'Edit note') : editing ? 'Edit meeting notes' : 'Edit note') : 'Add new note';
  const canSave = (hasText || Boolean(transcript)) && !reading;

  const form = (
    <>
      <NoteHeader
        compact={inline}
        above={!editing && !editingNote && !unified && <KindTabs kind={kind} onChange={switchTo} />}
        title={
          <input
            autoFocus={isNew}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              toBody.current?.();
            }}
            placeholder={placeholder}
            aria-label="Title"
            maxLength={100}
            className={TITLE_INPUT}
          />
        }
      >
        {/* The kind beside the time, as the details show it (the user's call), on new notes and edits alike. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* On option C the tag turns over when a transcript goes in or out, so the change is seen. */}
          <span key={kind} className={unified ? 'animate-pop-in' : undefined}>
            <KindTag label={KIND_LABEL[kind]} />
          </span>
          {kind === 'meeting' ? (
            <MeetingWhen date={date} time={time} onDate={setDate} onTime={setTime} />
          ) : (
            <TimeLine>Created: {noteStamp(editingNote?.at ?? (editing && (editing.createdAt ?? `${editing.date}T${editing.start}`)) ?? `${DEMO_TODAY}T${NOW}`)}</TimeLine>
          )}
        </div>
      </NoteHeader>

      <div
        className={`relative flex min-h-0 flex-1 flex-col ${dragging ? 'bg-brand/[0.03]' : ''}`}
        onDragOver={(e) => {
          if (!canAttach || !e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
        onDrop={(e) => {
          const f = e.dataTransfer.files[0];
          setDragging(false);
          if (!f) return;
          e.preventDefault();
          takeFile(f);
        }}
      >
        <NoteEditor
          initial={editing?.notes ?? editingNote?.body ?? ''}
          placeholder={kind === 'meeting' ? `Type your notes from the meeting with ${client.firstName}...` : `Type your note for ${client.firstName}...`}
          onChange={setHtml}
          toolbarEnd={
            canAttach && !transcript && <UploadTranscriptButton onClick={browse} hint={unified ? 'A transcript saves this as meeting notes' : undefined} />
          }
          height={transcript ? (inline ? 'h-[180px] shrink-0' : 'h-[240px] shrink-0') : 'min-h-0 flex-1'}
          compact={inline}
          focusOnMount={!isNew}
          focusRef={toBody}
        />
        {meeting && transcript && (
          <div className={`flex min-h-0 flex-1 flex-col pb-2 pt-1 ${inline ? 'px-5' : 'px-8'}`}>
            <TranscriptFileCard
              {...transcriptCard(transcript, client, editing?.minutes)}
              reading={reading}
              actions={
                <>
                  <button type="button" onClick={browse} className="text-brand hover:underline">
                    Replace
                  </button>
                  <button type="button" onClick={remove} className="text-ink-secondary hover:text-ink">
                    Remove
                  </button>
                </>
              }
            />
          </div>
        )}
        {error && <p className={`${inline ? 'mx-5' : 'mx-8'} shrink-0 pb-1 text-[12px] leading-[18px] text-danger`}>{error}</p>}
        {dragging && (
          <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-lg border-[1.5px] border-dashed border-brand text-[13px] font-semibold text-brand">
            Drop the file to attach it
          </div>
        )}
      </div>
    </>
  );

  const extras = (
    <>
      {confirmNote &&
        file &&
        createPortal(
          <ConfirmDialog
            title="Switch to a note?"
            body={`“${file.name}” will be removed: a note keeps no transcript. What you typed stays.`}
            confirmLabel="Switch to note"
            onCancel={() => setConfirmNote(false)}
            onConfirm={() => {
              remove();
              setConfirmNote(false);
              setKind('note');
            }}
          />,
          document.body,
        )}
      <input
        ref={fileInput}
        type="file"
        accept={TRANSCRIPT_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) takeFile(f);
        }}
      />
    </>
  );

  if (inline)
    return (
      <>
        <NotesCardBar>
          <h4 className="min-w-0 truncate text-[15px] font-semibold leading-[18px] text-ink">{heading}</h4>
          <div className="flex shrink-0 items-center gap-[5px]">
            <EditorButtons canSave={canSave} onCancel={onClose} onSave={save} />
          </div>
        </NotesCardBar>
        <div className={`flex ${INLINE_HEIGHT} flex-col rounded-b-lg bg-white`}>{form}</div>
        {extras}
      </>
    );

  return (
    <Modal title={heading} {...NOTE_POPUP} radius={12} onClose={onClose} header={<></>}>
      {form}
      <EditorFooter canSave={canSave} onCancel={onClose} onSave={save} />
      {extras}
    </Modal>
  );
}
