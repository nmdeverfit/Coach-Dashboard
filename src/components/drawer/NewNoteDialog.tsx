import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import iconChevronDown from '../../assets/figma/icon-chevron-down.svg';
import iconSticky from '../../assets/figma/icon-note-sticky.svg';
import iconVideo from '../../assets/figma/icon-note-video.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientNote } from '../../data/types';
import { TRANSCRIPT_TYPES } from '../../lib/meetings';
import { titleFrom } from '../../lib/noteKind';
import { cleanNoteHtml, noteStamp, noteText } from '../../lib/notes';
import { useStore } from '../../state/store';
import { Modal } from '../Modal';
import { Tooltip } from '../Tooltip';
import { MeetingWhen, TIME_ZONE } from './AddMeetingDialog';
import { AttachFileButton, AttachedFileCard, useAttachedFile } from './NoteAttachment';
import { EditorFooter, NoteEditor, NoteHeader, TITLE, TimeLine } from './NoteDialog';

export type NoteKind = 'note' | 'meeting';

/** The demo's clock reads 06:00, as for a message sent from the dashboard. */
const NOW = '06:00';

export const KIND_LABEL: Record<NoteKind, string> = { note: 'Note', meeting: 'Meeting notes' };

/** The timeline's two icons (Figma 6049:170285: energy-icons sticky-note, carbon video-chat), drawn at 16.84 px. */
export function KindIcon({ kind, size = 16.842 }: { kind: NoteKind; size?: number }) {
  return <img src={kind === 'note' ? iconSticky : iconVideo} alt="" width={size} height={size} className="block shrink-0" />;
}

const TYPE_HINT: Record<NoteKind, string> = {
  note: 'A note about the client',
  meeting: 'Notes from a call, with its date and transcript',
};

/**
 * The note type under the time line (the user's pick of where it goes): a chip showing the type with its icon, no
 * label ("Note type" is its tooltip), opening a menu of the two types with a line each. Esc and a click outside close
 * the menu without closing the popup.
 */
function NoteTypePicker({ kind, onChange }: { kind: NoteKind; onChange: (k: NoteKind) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc, true);
    };
  }, [open]);
  return (
    <div ref={root} className="relative w-fit">
      <span className="group/tip relative flex">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Note type: ${KIND_LABEL[kind]}`}
          onClick={() => setOpen((o) => !o)}
          className={`flex h-7 items-center gap-1.5 rounded-full border bg-white pl-2.5 pr-2 text-[12px] font-semibold leading-none text-ink hover:border-brand/40 ${
            open ? 'border-brand' : 'border-line-light'
          }`}
        >
          <KindIcon kind={kind} size={14} />
          {KIND_LABEL[kind]}
          <img src={iconChevronDown} alt="" width={14} height={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {!open && <Tooltip label="Note type" />}
      </span>
      {open && (
        <ul role="menu" aria-label="Note type" className="absolute left-0 top-full z-10 mt-1.5 w-[280px] rounded-lg border border-line bg-white p-1 shadow-[0_4px_16px_rgba(32,35,83,0.12)]">
          {(['note', 'meeting'] as const).map((k) => (
            <li key={k}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={kind === k}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-surface-secondary"
              >
                <span className="mt-px flex size-7 shrink-0 items-center justify-center rounded-full border-[0.842px] border-line-light">
                  <KindIcon kind={k} size={14} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] font-semibold leading-[1.5] text-ink">{KIND_LABEL[k]}</span>
                  <span className="text-[12px] leading-[18px] text-ink-tertiary">{TYPE_HINT[k]}</span>
                </span>
                {kind === k && <Check size={16} aria-hidden className="mt-1 shrink-0 text-brand" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * New note on the Notes timeline trial (the user's call, one way for every note; no frame): one layout, the note
 * editor (Figma 5850:570122) with Attach file on its toolbar, and the note type (Note | Meeting notes) under the time
 * line (`NoteTypePicker`). The type only classifies the note: the form stays the same, except that meeting notes carry the meeting's date and start
 * (editable) where a note says when it was created. A file shows under the text as a preview card (Replace ·
 * Remove), and dropping one anywhere on the form attaches it too. Save needs text or a file; a note keeps its file
 * as an attachment, meeting notes keep it as the transcript. Nothing reads what is pasted.
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
  const fileInput = useRef<HTMLInputElement>(null);
  const browse = () => fileInput.current?.click();
  const hasText = Boolean(noteText(html)) || /<li/i.test(html);
  const meetings = state.meetings[client.id] ?? [];
  const placeholder =
    kind === 'meeting'
      ? (file && titleFrom(file.text, file.name)) || `New Meeting ${1 + meetings.filter((m) => /^New Meeting \d+$/.test(m.title)).length}`
      : `New Note ${1 + notes.filter((n) => /^New Note \d+$/.test(n.title)).length}`;

  const save = () => {
    if (reading || (!hasText && !file)) return;
    const body = hasText ? cleanNoteHtml(html) : '';
    const name = title.trim() || placeholder;
    if (kind === 'note') {
      const added: ClientNote = { id: `c${Date.now()}`, title: name, at: `${DEMO_TODAY}T${NOW}`, body, attachment: file ?? undefined };
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
        <NoteTypePicker kind={kind} onChange={setKind} />
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
        <NoteEditor
          initial=""
          placeholder={kind === 'meeting' ? `Type your notes from the meeting with ${client.firstName}...` : `Type your note for ${client.firstName}...`}
          onChange={setHtml}
          toolbarEnd={!file && <AttachFileButton onClick={browse} />}
          height={file ? 'h-[176px] shrink-0' : 'min-h-0 flex-1'}
        />
        {file && (
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
    </Modal>
  );
}
