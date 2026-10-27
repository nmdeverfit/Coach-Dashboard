import { Paperclip, X } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import iconSparkle from '../../assets/figma/icon-ai-sparkle.svg';
import iconSticky from '../../assets/figma/icon-note-sticky.svg';
import iconVideo from '../../assets/figma/icon-note-video.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { Client, ClientNote } from '../../data/types';
import { TRANSCRIPT_TYPES } from '../../lib/meetings';
import { detectTranscript, textToHtml, type Detection } from '../../lib/noteKind';
import { cleanNoteHtml, noteStamp, noteText } from '../../lib/notes';
import type { NotesVariant } from '../../lib/notesTrial';
import { useStore } from '../../state/store';
import { Modal } from '../Modal';
import { Tooltip } from '../Tooltip';
import { MeetingNotesForm } from './MeetingNotesForm';
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

/** C: Note | Meeting notes, and what detection read when it picked meeting notes. */
function KindToggle({ kind, hint, onChange }: { kind: NoteKind; hint: string | null; onChange: (k: NoteKind) => void }) {
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
      {hint && kind === 'meeting' && (
        <span className="flex min-w-0 items-center gap-1 text-[12px] leading-[18px] text-ink-tertiary">
          <img src={iconSparkle} alt="" width={12} height={12} />
          <span className="truncate">Detected: {hint}</span>
        </span>
      )}
    </div>
  );
}

/** A: a transcript was likely pasted into a note; the coach says which it is. */
function SuggestBanner({ detection, onKeep, onSwitch }: { detection: Detection; onKeep: () => void; onSwitch: () => void }) {
  return (
    <div className="mx-8 mt-4 flex items-start gap-2.5 rounded-lg border border-brand/20 bg-brand/[0.04] px-3 py-2.5">
      <img src={iconSparkle} alt="" width={16} height={16} className="mt-0.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[13px] leading-[1.5] text-ink">
          <span className="font-semibold">This looks like a meeting transcript</span> ({detection.reason}). Switch to meeting notes to attach
          it as the transcript and keep the rest as your notes.
        </p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onSwitch} className="h-7 rounded-[6px] bg-brand px-3 text-[12px] font-semibold text-white hover:bg-brand/90">
            Switch to meeting notes
          </button>
          <button type="button" onClick={onKeep} className="text-[12px] font-semibold text-ink-secondary hover:text-ink">
            Keep as note
          </button>
        </div>
      </div>
    </div>
  );
}

/** A: why the note became meeting notes on its own, with the way back. */
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
 * kind follows where the text comes from; the note's own text always stays the coach's notes:
 * - A: one New note. A file (Attach transcript, or dropped on the editor) or a paste with subtitle timecodes or timed
 *   speaker lines makes it meeting notes at once, with a line saying why and Keep as a note; a paste of untimed
 *   speaker lines asks first (`SuggestBanner`).
 * - B: the coach picked the kind on New note ▾ (`start`); nothing is detected.
 * - C: a Note | Meeting notes toggle; a file flips it, and a transcript pasted on the Note tab asks first
 *   (`SuggestBanner`), then flips it saying what was detected. The Meeting notes tab asks nothing: there the notes
 *   and the transcript are one thing (the user's call).
 * A transcript found in a paste leaves the note's text and becomes the attached transcript. Turning meeting notes back
 * into a note restores the note as it was, or the notes plus the pasted transcript if the coach changed either.
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
  const [seed, setSeed] = useState<{ key: number; notes: string; pasted?: string; file?: File }>({ key: 0, notes: '' });
  // The meeting notes form as it stands (its notes and pasted transcript), and what the note handed it.
  const current = useRef({ notes: '', pasted: '' });
  const before = useRef<{ html: string; notes: string; text: string } | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  // A paste the coach is asked about (A and C): the text, and the note before and after it.
  const [suggestion, setSuggestion] = useState<{ detection: Detection; text: string; before: string; after: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const detects = variant !== 'B';
  const newTitle = `New Note ${1 + notes.filter((n) => /^New Note \d+$/.test(n.title)).length}`;

  /** `notes`: the note's text that stays the coach's notes; `whole`: the note as it was, for the way back. */
  const toMeeting = (from: { pasted?: string; file?: File }, reason: string | null, notes = html, whole = html) => {
    before.current = { html: whole, notes, text: from.pasted ?? '' };
    current.current = { notes, pasted: from.pasted ?? '' };
    setSeed((s) => ({ key: s.key + 1, notes, ...from }));
    setKind('meeting');
    setWhy(reason);
    setSuggestion(null);
  };

  const toNote = () => {
    const b = before.current;
    const now = current.current;
    setHtml(b && now.notes === b.notes && now.pasted === b.text ? b.html : now.notes + textToHtml(now.pasted));
    setEditorKey((k) => k + 1);
    setKind('note');
    setWhy(null);
  };

  // `html` is still the note from before the paste: it stays the notes, the pasted text becomes the transcript.
  const onPasteText = (text: string, after: string) => {
    const found = detectTranscript(text);
    if (!found) return;
    // C asks on the Note tab for any transcript; A asks only when it is not sure.
    if (variant === 'C' || found.level === 'likely') return setSuggestion({ detection: found, text: text.trim(), before: html, after });
    toMeeting({ pasted: text.trim() }, `the pasted text has ${found.reason}`, html, after);
  };

  const attach = (file: File) => toMeeting({ file }, variant === 'A' ? 'a transcript file is attached' : 'transcript file attached');
  const track = useCallback((s: { notes: string; pasted: string }) => {
    current.current = s;
  }, []);

  const above: ReactNode =
    variant === 'C' ? (
      <KindToggle kind={kind} hint={why} onChange={(k) => (k === 'meeting' ? toMeeting({}, null) : toNote())} />
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
          {suggestion && (
            <SuggestBanner
              detection={suggestion.detection}
              onKeep={() => setSuggestion(null)}
              onSwitch={() =>
                toMeeting({ pasted: suggestion.text }, variant === 'C' ? suggestion.detection.reason : null, suggestion.before, suggestion.after)
              }
            />
          )}
          <NoteEditor
            key={editorKey}
            initial={html}
            placeholder={detects ? `Type your note for ${client.firstName}, or paste a meeting transcript...` : `Type your note for ${client.firstName}...`}
            onChange={setHtml}
            onPasteText={detects ? onPasteText : undefined}
            onDropFile={detects ? attach : undefined}
            height={suggestion ? 'h-[344px] shrink-0' : 'h-[440px] shrink-0'}
          />
          <EditorFooter
            canSave={Boolean(noteText(html)) || /<li/i.test(html)}
            onCancel={onClose}
            onSave={save}
            start={
              detects && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="flex items-center gap-1.5 text-[13px] font-semibold leading-[1.5] text-ink-secondary hover:text-brand"
                >
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
      )}
    </Modal>
  );
}
