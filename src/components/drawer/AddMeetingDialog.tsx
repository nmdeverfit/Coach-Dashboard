import { useRef, useState, type ReactNode } from 'react';
import iconClipboardBrand from '../../assets/figma/icon-clipboard-brand.svg';
import iconClipboard from '../../assets/figma/icon-clipboard.svg';
import iconCloud from '../../assets/figma/icon-cloud-upload.svg';
import iconEditMuted from '../../assets/figma/icon-note-edit-muted.svg';
import iconEdit from '../../assets/figma/icon-note-edit.svg';
import iconUploadBrand from '../../assets/figma/icon-upload-brand.svg';
import iconUpload from '../../assets/figma/icon-upload.svg';
import { COACH_FIRST_NAME, DEMO_TODAY } from '../../data/mock';
import type { Client, Transcript } from '../../data/types';
import { TRANSCRIPT_MAX_BYTES, TRANSCRIPT_TYPES, fileSize } from '../../lib/meetings';
import { summarizeTranscript } from '../../lib/meetingSummary';
import { docxText } from '../../lib/docx';
import { noteStamp } from '../../lib/notes';
import { useStore } from '../../state/store';
import { FileTypeIcon, fileExtension } from '../FileTypeIcon';
import { Glyph } from '../Glyph';
import { Modal } from '../Modal';
import { EditorFooter, IconAction, NoteHeader, TITLE, TimeLine } from './NoteDialog';
import { DatePicker, TimePicker } from './Pickers';

/** The demo's "now" (the brief is generated at 06:00): the form starts on it, and a meeting can't start later. */
const NOW = '06:00';
/** Meetings the coach adds keep the generated calls' time zone; the form no longer asks for one. */
const TIME_ZONE = 'UTC-7';
/** .txt and .srt are read as text and .docx through its XML, so the transcript can be previewed and summarised; .pdf is kept as a file. */
const READABLE = ['.txt', '.srt'];

type Mode = 'upload' | 'paste';

/** Upload file / Paste text. The design sets the first label semibold and the second regular, in both states. */
function SourceButton({ on, icon, label, semibold, onClick }: { on: boolean; icon: ReactNode; label: string; semibold?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border p-2 text-[13px] leading-[22px] ${
        on ? 'border-brand bg-brand/[0.03] text-brand' : 'border-[#e0e0e0] text-ink hover:bg-surface-secondary'
      } ${semibold ? 'font-semibold' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

/** "Long (04:12):" or "Malcom:" at the start of a line, set in bold like the meeting popup's speakers. */
const SPEAKER = /^([^():\n]{1,40}?(?:\s*\([^)]*\))?\s*:)(\s.*)$/;

/**
 * What the chosen file says, read in the page before Save: one row per line, speakers in bold. A .pdf can't be read
 * in the demo, so it says so; the file is still kept with the meeting.
 */
function TranscriptPreview({ text, reading, ext }: { text?: string; reading: boolean; ext: string }) {
  const lines = text?.split(/\r?\n/).filter((l) => l.trim()) ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <p className="flex items-baseline justify-between text-[12px] leading-[18px]">
        <span className="font-semibold text-ink">Preview</span>
        {lines.length > 0 && <span className="text-ink-tertiary">{lines.length} lines</span>}
      </p>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto rounded-lg border-[1.5px] border-[#e0e0e0] bg-[#f9fafa] px-3 py-2.5 text-[13px] leading-[1.6] text-ink">
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
            {ext === 'pdf' ? 'No preview for .pdf files in the demo. The file is kept with the meeting, without a summary.' : 'No text found in this file.'}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Add a meeting, laid out like New note (Figma 5850:570122; the user's call): the meeting's name as the title (empty
 * saves "New Meeting N"), its date and time (now, until the edit icon picks another day up to today and a start up to
 * now), then the transcript as a file (.txt, .docx, .srt, .pdf, up to 10 MB) or pasted text (Figma 5726:141326,
 * 5729:516037). Save waits for the transcript; the meeting is created now, and its summary is written from the text
 * right after (`summarizeTranscript`).
 */
export function AddMeetingDialog({ client, onClose }: { client: Client; onClose: () => void }) {
  const { state, addMeeting } = useStore();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(DEMO_TODAY);
  const [time, setTime] = useState(NOW);
  const [mode, setMode] = useState<Mode>('upload');
  const [file, setFile] = useState<{ name: string; size: number; text?: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [pasted, setPasted] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  // Picking a day goes straight on to its start time; the date picker closes itself after its pick.
  const next = useRef<'time' | null>(null);
  const closePicker = () => {
    setPicker(next.current);
    next.current = null;
  };
  const when = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const added = state.meetings[client.id] ?? [];
  const newTitle = `New Meeting ${1 + added.filter((m) => /^New Meeting \d+$/.test(m.title)).length}`;

  const transcript: Transcript | null =
    mode === 'upload' ? file && { kind: 'file', ...file } : pasted.trim() ? { kind: 'text', text: pasted.trim() } : null;

  const pick = (f: File | undefined) => {
    if (!f) return;
    const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
    if (!TRANSCRIPT_TYPES.includes(ext) || f.size > TRANSCRIPT_MAX_BYTES) {
      setFileError('Use a .txt, .docx, .srt or .pdf file up to 10 MB.');
      return;
    }
    setFileError('');
    setFile({ name: f.name, size: f.size });
    const read = READABLE.includes(ext) ? f.text() : ext === '.docx' ? docxText(f) : null;
    if (!read) return;
    setReading(true);
    read.then((text) => {
      setReading(false);
      if (text) setFile((cur) => (cur?.name === f.name ? { ...cur, text } : cur));
    });
  };

  const save = () => {
    if (!transcript || reading) return;
    // The summary is written from whatever text there is (pasted, or a .txt / .srt / .docx file); a .pdf gets none.
    const text = transcript.kind === 'text' ? transcript.text : transcript.kind === 'file' ? transcript.text : undefined;
    const summary = text ? summarizeTranscript(text, client.firstName, COACH_FIRST_NAME) : undefined;
    addMeeting(client.id, {
      id: `${client.id}-added-${Date.now()}`,
      title: title.trim() || newTitle,
      date,
      start: time,
      timeZone: TIME_ZONE,
      transcript,
      createdAt: `${DEMO_TODAY}T${NOW}`,
      summary,
      summaryPending: Boolean(summary),
    });
    onClose();
  };

  return (
    <Modal title="Add a meeting" width={600} radius={12} onClose={onClose} header={<></>}>
      <NoteHeader
        title={
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={newTitle}
            aria-label="Meeting title"
            maxLength={100}
            className={`${TITLE} min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#1a1a1a]/50`}
          />
        }
      >
        <div ref={when} className="w-fit">
          <TimeLine>
            {noteStamp(`${date}T${time}`)}
            <IconAction label="Edit date and time" onClick={() => setPicker((p) => (p ? null : 'date'))}>
              <img src={iconEditMuted} alt="" className={`absolute inset-0 block size-full max-w-none opacity-60 group-hover:hidden ${picker ? '!hidden' : ''}`} />
              <img src={iconEdit} alt="" className={`absolute inset-0 hidden size-full max-w-none group-hover:block ${picker ? '!block' : ''}`} />
            </IconAction>
          </TimeLine>
        </div>
        {picker === 'date' && (
          <DatePicker
            anchor={when}
            value={date}
            max={DEMO_TODAY}
            onPick={(v) => {
              setDate(v);
              // Today allows a start up to now only.
              if (v === DEMO_TODAY && time > NOW) setTime(NOW);
              next.current = 'time';
            }}
            onClose={closePicker}
          />
        )}
        {picker === 'time' && (
          <TimePicker anchor={when} value={time} latest={date === DEMO_TODAY ? NOW : undefined} onPick={setTime} onClose={closePicker} />
        )}
      </NoteHeader>

      <div className="flex h-[440px] shrink-0 flex-col gap-2 px-8 pb-2 pt-5">
        <p className="text-[12px] font-semibold leading-[18px] text-ink">Transcript</p>
        <div className="flex gap-2">
          <SourceButton
            on={mode === 'upload'}
            icon={<img src={mode === 'upload' ? iconUploadBrand : iconUpload} alt="" width={20} height={20} />}
            label="Upload file"
            semibold
            onClick={() => setMode('upload')}
          />
          <SourceButton
            on={mode === 'paste'}
            icon={<Glyph src={mode === 'paste' ? iconClipboardBrand : iconClipboard} size={20} inset="15.13% 15.43% 14.87% 20.43%" bleed="-4.78% -5.22%" />}
            label="Paste text"
            onClick={() => setMode('paste')}
          />
        </div>
        {mode === 'upload' ? (
          file ? (
            <>
              {/* The chosen file: type icon, name over size, then Replace and Remove at the right edge. */}
              <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-[#e0e0e0] p-3 text-[13px] leading-[1.5]">
                <FileTypeIcon name={file.name} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-semibold text-ink" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[12px] leading-[18px] text-ink-tertiary">
                    {fileSize(file.size)} · {fileExtension(file.name).toUpperCase()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 font-semibold">
                  <button type="button" onClick={() => fileInput.current?.click()} className="text-brand hover:underline">
                    Replace
                  </button>
                  <button type="button" onClick={() => setFile(null)} className="text-ink-secondary hover:text-ink">
                    Remove
                  </button>
                </div>
              </div>
              <TranscriptPreview text={file.text} reading={reading} ext={fileExtension(file.name)} />
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files[0]);
              }}
              className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed p-3 text-center text-[13px] leading-[1.5] tracking-[-0.26px] ${
                dragging ? 'border-brand bg-brand/[0.03]' : fileError ? 'border-danger' : 'border-[#e0e0e0] hover:border-brand/60'
              }`}
            >
              <img src={iconCloud} alt="" width={36} height={36} />
              <span className="text-ink">
                Drop a transcript, or <span className="font-semibold underline">browse</span>
              </span>
              <span className="text-ink-tertiary">.txt, .docx, .srt, .pdf — up to 10 MB.</span>
            </button>
          )
        ) : (
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={`Paste the transcript of the meeting with ${client.firstName}...`}
            className="min-h-0 flex-1 resize-none rounded-lg border-[1.5px] border-[#e0e0e0] p-3 text-[14px] leading-[22px] text-ink outline-none placeholder:text-ink-muted focus:border-brand"
          />
        )}
        {mode === 'upload' && fileError && <p className="text-[12px] leading-[18px] text-danger">{fileError}</p>}
        <input
          ref={fileInput}
          type="file"
          accept={TRANSCRIPT_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      <EditorFooter canSave={Boolean(transcript) && !reading} onCancel={onClose} onSave={save} />
    </Modal>
  );
}
