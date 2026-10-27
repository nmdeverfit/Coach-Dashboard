import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import iconClock from '../../assets/figma/icon-note-clock.svg';
import iconDelete from '../../assets/figma/icon-note-delete.svg';
import iconEditMuted from '../../assets/figma/icon-note-edit-muted.svg';
import iconEdit from '../../assets/figma/icon-note-edit.svg';
import iconBold from '../../assets/figma/icon-rte-bold.svg';
import iconBullet from '../../assets/figma/icon-rte-bullet.svg';
import iconItalic from '../../assets/figma/icon-rte-italic.svg';
import iconOrdered from '../../assets/figma/icon-rte-ordered.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientNote } from '../../data/types';
import { cleanNoteHtml, noteStamp, noteText } from '../../lib/notes';
import { useStore } from '../../state/store';
import { ConfirmDialog } from '../ConfirmDialog';
import { Modal } from '../Modal';
import { Tooltip } from '../Tooltip';
import { AttachedFileCard } from './NoteAttachment';

/** A note written or edited now: the demo's clock reads 06:00, as for a message sent from the dashboard. */
const NOW = `${DEMO_TODAY}T06:00`;

export const TITLE = 'text-[19px] font-semibold leading-[1.5] tracking-[-0.57px] text-[#1a1a1a]';

/** "Created: Apr 10 - 11:25 AM" with the 16 px clock at half opacity. */
export function TimeLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[12px] leading-normal text-ink-tertiary">
      <span className="relative size-4 shrink-0 overflow-hidden opacity-50" aria-hidden>
        <span className="absolute inset-[15.63%]">
          <span className="absolute inset-[-4.55%]">
            <img src={iconClock} alt="" className="block size-full max-w-none" />
          </span>
        </span>
      </span>
      {children}
    </div>
  );
}

/** The popups' header: the title row, then the time lines, over a light border. */
export function NoteHeader({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <header className="flex shrink-0 flex-col gap-0.5 border-b border-black/[0.08] px-8 pb-3 pt-8">
      <div className="flex items-center justify-between gap-4">
        {title}
        {actions}
      </div>
      <div className="flex flex-col gap-1.5 py-2">{children}</div>
    </header>
  );
}

const TOOLS = [
  { command: 'bold', label: 'Bold', icon: iconBold, inset: 'inset-[14.29%_14.28%_14.28%_21.43%]' },
  { command: 'italic', label: 'Italic', icon: iconItalic, inset: 'inset-[14.29%_28.57%_14.28%_28.57%]' },
  { command: 'insertOrderedList', label: 'Numbered list', icon: iconOrdered, inset: 'inset-[7.14%_0_16.39%_0]' },
  { command: 'insertUnorderedList', label: 'Bulleted list', icon: iconBullet, inset: 'inset-[7.14%_7.15%_14.28%_7.15%]' },
] as const;

/**
 * The note editor (Figma 5850:570122): Bold · Italic · Numbered list · Bulleted list over a writing area. The page's
 * own rich-text editing does the formatting; what it writes is cleaned on save (`cleanNoteHtml`). The Notes timeline
 * trial listens for a file dropped on it (`onDropFile`) and adds Attach transcript after the tools (`toolbarEnd`).
 */
export function NoteEditor({
  initial,
  placeholder,
  onChange,
  onDropFile,
  toolbarEnd,
  height = 'h-[440px] shrink-0',
}: {
  initial: string;
  placeholder: string;
  onChange: (html: string) => void;
  onDropFile?: (file: File) => void;
  toolbarEnd?: ReactNode;
  height?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(!noteText(initial));
  const [active, setActive] = useState<Record<string, boolean>>({});

  const refresh = useCallback(() => {
    const sel = document.getSelection();
    if (!box.current || !sel?.anchorNode || !box.current.contains(sel.anchorNode)) return setActive({});
    setActive(Object.fromEntries(TOOLS.map((t) => [t.command, document.queryCommandState(t.command)])));
  }, []);

  useEffect(() => {
    const el = box.current!;
    el.innerHTML = initial;
    el.focus();
    // The caret goes to the end of what is there.
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    document.getSelection()?.removeAllRanges();
    document.getSelection()?.addRange(range);
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.addEventListener('selectionchange', refresh);
    return () => document.removeEventListener('selectionchange', refresh);
    // The initial text is set once; after that the editor owns it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changed = () => {
    const html = box.current?.innerHTML ?? '';
    setEmpty(!noteText(html) && !/<li/i.test(html));
    onChange(html);
  };

  return (
    <div className={`flex ${height} flex-col gap-2.5 px-3 pb-5 pt-3`}>
      <div
        role="toolbar"
        aria-label="Formatting"
        className="flex shrink-0 gap-3 rounded-lg p-2"
        style={{ backgroundImage: 'linear-gradient(99.28deg, #f6f6f6 27.255%, rgba(246,246,246,0) 50.589%)' }}
      >
        {TOOLS.map((t) => (
          <span key={t.command} className="group/tip relative">
            <button
              type="button"
              aria-label={t.label}
              aria-pressed={Boolean(active[t.command])}
              // Keeps the selection in the writing area.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                box.current?.focus();
                document.execCommand(t.command);
                changed();
                refresh();
              }}
              className={`flex size-[26px] items-center justify-center rounded-[4px] ${active[t.command] ? 'bg-black/[0.08]' : 'hover:bg-black/[0.05]'}`}
            >
              <span className="relative size-5 overflow-hidden">
                <img src={t.icon} alt="" className={`absolute block max-w-none ${t.inset}`} />
              </span>
            </button>
            <Tooltip label={t.label} />
          </span>
        ))}
        {toolbarEnd && (
          <>
            <span aria-hidden className="h-5 w-px self-center bg-black/10" />
            {toolbarEnd}
          </>
        )}
      </div>
      <div className="scroll-thin relative min-h-0 flex-1 overflow-y-auto px-5">
        {empty && <p className="pointer-events-none absolute left-5 top-0 text-[14px] leading-[1.75] text-ink-secondary">{placeholder}</p>}
        <div
          ref={box}
          role="textbox"
          aria-multiline="true"
          aria-label="Note"
          contentEditable
          suppressContentEditableWarning
          onInput={changed}
          onKeyUp={refresh}
          // Pasted text comes in plain, so a note never carries another page's styles.
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
          }}
          onDragOver={onDropFile && ((e) => e.dataTransfer.types.includes('Files') && e.preventDefault())}
          onDrop={
            onDropFile &&
            ((e) => {
              const f = e.dataTransfer.files[0];
              if (!f) return;
              e.preventDefault();
              onDropFile(f);
            })
          }
          className="note-body min-h-full outline-none"
        />
      </div>
    </div>
  );
}

/** Cancel · Save, as on Change Client Status; Save waits for some text. Add a meeting shares it. */
export function EditorFooter({ canSave, onCancel, onSave, start }: { canSave: boolean; onCancel: () => void; onSave: () => void; start?: ReactNode }) {
  return (
    <footer className="flex shrink-0 items-center justify-end gap-[5px] px-8 pb-6 pt-4">
      {start && <div className="mr-auto flex min-w-0 items-center">{start}</div>}
      <button
        type="button"
        onClick={onCancel}
        className="h-[30px] w-[66px] rounded-[6px] border border-[#e0e0e0] bg-white text-[13px] font-semibold leading-[1.5] text-[#4d4d4d] hover:bg-surface-secondary"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={!canSave}
        onClick={onSave}
        className="h-[30px] w-[107px] rounded-[6px] bg-brand text-[13px] font-semibold leading-[1.5] text-white hover:bg-brand/90 disabled:opacity-50 disabled:hover:bg-brand"
      >
        Save
      </button>
    </footer>
  );
}

/** Delete and Edit on the details' title row: 16 px, muted until hovered (Edit turns brand, as drawn). */
export function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <span className="group/tip relative flex">
      <button type="button" aria-label={label} onClick={onClick} className="group relative size-4 overflow-hidden">
        {children}
      </button>
      <Tooltip label={label} />
    </span>
  );
}

/**
 * A note from the Notes tab: Note details (Figma 5850:570056) with Delete and Edit, or the editor (Figma 5850:570122)
 * for a new note (`noteId` null) or an edit. Saving replaces the client's notes in the store (session only).
 */
export function NoteDialog({
  client,
  notes,
  noteId,
  onClose,
}: {
  client: Client;
  notes: ClientNote[];
  noteId: string | null;
  onClose: () => void;
}) {
  const { setNotes, showToast } = useStore();
  const note = noteId ? notes.find((n) => n.id === noteId) : undefined;
  const [editing, setEditing] = useState(!note);
  const [title, setTitle] = useState(note?.title ?? '');
  const [html, setHtml] = useState(note?.body ?? '');
  const [confirming, setConfirming] = useState(false);
  const newTitle = `New Note ${1 + notes.filter((n) => /^New Note \d+$/.test(n.title)).length}`;
  const canSave = Boolean(noteText(html)) || /<li/i.test(html);

  const save = () => {
    const body = cleanNoteHtml(html);
    if (!note) {
      const added: ClientNote = { id: `c${Date.now()}`, title: title.trim() || newTitle, at: NOW, body };
      setNotes(client.id, [added, ...notes], 'Note added');
      onClose();
      return;
    }
    const edited: ClientNote = { ...note, title: title.trim() || note.title, body, editedAt: NOW };
    setNotes(client.id, notes.map((n) => (n.id === note.id ? edited : n)), 'Note saved');
    setEditing(false);
  };

  const startEdit = () => {
    setTitle(note!.title);
    setHtml(note!.body);
    setEditing(true);
  };

  if (noteId && !note) return null;

  return (
    <Modal title={note ? note.title : 'New note'} width={600} radius={12} onClose={onClose} header={<></>}>
      {editing ? (
        <>
          <NoteHeader
            title={
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={note?.title ?? newTitle}
                aria-label="Note title"
                maxLength={100}
                className={`${TITLE} min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#1a1a1a]/50`}
              />
            }
          >
            <TimeLine>Created: {noteStamp(note?.at ?? NOW)}</TimeLine>
          </NoteHeader>
          <NoteEditor initial={note?.body ?? ''} placeholder={`Type your note for ${client.firstName}...`} onChange={setHtml} />
          <EditorFooter canSave={canSave} onCancel={note ? () => setEditing(false) : onClose} onSave={save} />
        </>
      ) : (
        note && (
          <>
            <NoteHeader
              title={<h2 className={`${TITLE} min-w-0 break-words`}>{note.title}</h2>}
              actions={
                <div className="flex shrink-0 items-center gap-5">
                  <IconAction label="Delete note" onClick={() => setConfirming(true)}>
                    <span className="absolute inset-[6.67%_7.24%_3.67%_7.32%] opacity-60 group-hover:opacity-100">
                      <span className="absolute inset-[-1.05%_-1.1%]">
                        <img src={iconDelete} alt="" className="block size-full max-w-none" />
                      </span>
                    </span>
                  </IconAction>
                  <IconAction label="Edit note" onClick={startEdit}>
                    <img src={iconEditMuted} alt="" className="absolute inset-0 block size-full max-w-none opacity-60 group-hover:hidden" />
                    <img src={iconEdit} alt="" className="absolute inset-0 hidden size-full max-w-none group-hover:block" />
                  </IconAction>
                </div>
              }
            >
              <TimeLine>Created: {noteStamp(note.at)}</TimeLine>
              {note.editedAt && <TimeLine>Last Edited: {noteStamp(note.editedAt)}</TimeLine>}
            </NoteHeader>
            <div className="scroll-thin h-[440px] shrink-0 overflow-y-auto px-8 py-5">
              <div className="note-body" dangerouslySetInnerHTML={{ __html: note.body }} />
              {/* Notes timeline trial: a file attached in New note, as the meeting popup shows a transcript. */}
              {note.attachment && (
                <AttachedFileCard
                  file={note.attachment}
                  className={`max-h-[300px] ${note.body ? 'mt-4' : ''}`}
                  actions={
                    <button type="button" onClick={() => showToast(`${note.attachment!.name} downloads`)} className="text-brand hover:underline">
                      Download
                    </button>
                  }
                />
              )}
            </div>
            <div className="h-8 shrink-0" />
          </>
        )
      )}
      {confirming &&
        note &&
        createPortal(
          <ConfirmDialog
            title="Delete this note?"
            body={`“${note.title}” will be removed from ${client.firstName}’s notes.`}
            confirmLabel="Delete"
            onCancel={() => setConfirming(false)}
            onConfirm={() => {
              setNotes(client.id, notes.filter((n) => n.id !== note.id), 'Note deleted');
              onClose();
            }}
          />,
          document.body,
        )}
    </Modal>
  );
}
