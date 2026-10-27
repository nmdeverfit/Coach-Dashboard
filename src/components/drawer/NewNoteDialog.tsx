import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import iconSticky from '../../assets/figma/icon-note-sticky.svg';
import iconVideo from '../../assets/figma/icon-note-video.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientNote } from '../../data/types';
import { TRANSCRIPT_TYPES } from '../../lib/meetings';
import { titleFrom } from '../../lib/noteKind';
import { cleanNoteHtml, noteStamp, noteText } from '../../lib/notes';
import { useStore } from '../../state/store';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { MeetingWhen, TIME_ZONE } from './AddMeetingDialog';
import { AttachedFileCard, UploadTranscriptButton, useAttachedFile } from './NoteAttachment';
import { EditorFooter, NoteEditor, NoteHeader, TITLE, TimeLine } from './NoteDialog';

export type NoteKind = 'note' | 'meeting';

/** The demo's clock reads 06:00, as for a message sent from the dashboard. */
const NOW = '06:00';

export const KIND_LABEL: Record<NoteKind, string> = { note: 'Note', meeting: 'Meeting notes' };

/** The timeline's two icons (Figma 6049:170285: energy-icons sticky-note, carbon video-chat), drawn at 16.84 px. */
export function KindIcon({ kind, size = 16.842 }: { kind: NoteKind; size?: number }) {
  return <img src={kind === 'note' ? iconSticky : iconVideo} alt="" width={size} height={size} className="block shrink-0" />;
}

/** Note | Meeting notes over the title (the user's pick): tabs, the chosen one on a white thumb. */
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
          className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-semibold leading-none ${
            kind === k ? 'bg-white text-ink shadow-[0_1px_2px_rgba(32,35,83,0.12)]' : 'text-ink-secondary hover:text-ink'
          }`}
        >
          <KindIcon kind={k} size={14} />
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
 * file. Nothing reads what is pasted.
 */
export function NewNoteDialog({ client, notes, onClose }: { client: Client; notes: ClientNote[]; onClose: () => void }) {
  const { state, setNotes, addMeeting } = useStore();
  const [kind, setKind] = useState<NoteKind>('note');
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [date, setDate] = useState(DEMO_TODAY);
  const [time, setTime] = useState(NOW);
  const [dragging, setDragging] = useState(false);
  const { file, reading, error, attach, remove } = useAttachedFile();
  // Leaving Meeting notes with a transcript in asks first.
  const [confirmNote, setConfirmNote] = useState(false);
  const meeting = kind === 'meeting';
  const takeFile = (f: File) => meeting && attach(f);
  const fileInput = useRef<HTMLInputElement>(null);
  const browse = () => fileInput.current?.click();
  const hasText = Boolean(noteText(html)) || /<li/i.test(html);
  const meetings = state.meetings[client.id] ?? [];
  const placeholder =
    kind === 'meeting'
      ? (file && titleFrom(file.text, file.name)) || `New Meeting ${1 + meetings.filter((m) => /^New Meeting \d+$/.test(m.title)).length}`
      : `New Note ${1 + notes.filter((n) => /^New Note \d+$/.test(n.title)).length}`;

  const switchTo = (k: NoteKind) => (k === 'note' && file ? setConfirmNote(true) : setKind(k));

  const save = () => {
    if (reading || (!hasText && !file)) return;
    const body = hasText ? cleanNoteHtml(html) : '';
    const name = title.trim() || placeholder;
    if (kind === 'note') {
      const added: ClientNote = { id: `c${Date.now()}`, title: name, at: `${DEMO_TODAY}T${NOW}`, body };
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
        createdAt: `${DEMO_TODAY}T${NOW}`,
      });
    }
    onClose();
  };

  return (
    <Modal title={kind === 'note' ? 'New note' : 'New meeting notes'} width={600} radius={12} onClose={onClose} header={<></>}>
      <NoteHeader
        above={<KindTabs kind={kind} onChange={switchTo} />}
        title={
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={placeholder}
            aria-label="Title"
            maxLength={100}
            className={`${TITLE} min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#1a1a1a]/50`}
          />
        }
      >
        {kind === 'meeting' ? (
          <MeetingWhen date={date} time={time} onDate={setDate} onTime={setTime} />
        ) : (
          <TimeLine>Created: {noteStamp(`${DEMO_TODAY}T${NOW}`)}</TimeLine>
        )}
      </NoteHeader>

      <div
        className={`relative flex h-[440px] shrink-0 flex-col ${dragging ? 'bg-brand/[0.03]' : ''}`}
        onDragOver={(e) => {
          if (!meeting || !e.dataTransfer.types.includes('Files')) return;
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
          initial=""
          placeholder={kind === 'meeting' ? `Type your notes from the meeting with ${client.firstName}...` : `Type your note for ${client.firstName}...`}
          onChange={setHtml}
          toolbarEnd={meeting && !file && <UploadTranscriptButton onClick={browse} />}
          height={file ? 'h-[176px] shrink-0' : 'min-h-0 flex-1'}
        />
        {meeting && file && (
          <div className="flex min-h-0 flex-1 flex-col px-8 pb-2 pt-1">
            <AttachedFileCard
              file={file}
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
        {error && <p className="mx-8 shrink-0 pb-1 text-[12px] leading-[18px] text-danger">{error}</p>}
        {dragging && (
          <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-lg border-[1.5px] border-dashed border-brand text-[13px] font-semibold text-brand">
            Drop the file to attach it
          </div>
        )}
      </div>
      <EditorFooter canSave={(hasText || Boolean(file)) && !reading} onCancel={onClose} onSave={save} />
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
    </Modal>
  );
}
