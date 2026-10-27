import { useRef, useState, type ReactNode } from 'react';
import iconChevronLeft from '../../assets/figma/icon-chevron-left.svg';
import iconClipboard from '../../assets/figma/icon-clipboard.svg';
import iconSticky from '../../assets/figma/icon-note-sticky.svg';
import iconVideo from '../../assets/figma/icon-note-video.svg';
import iconUpload from '../../assets/figma/icon-upload.svg';
import { COACH_FIRST_NAME } from '../../data/mock';
import type { Client, Transcript } from '../../data/types';
import { fileSize } from '../../lib/meetings';
import { FileTypeIcon, fileExtension } from '../FileTypeIcon';
import { Glyph } from '../Glyph';
import { SPEAKER, transcriptFileError, transcriptFileText } from './AddMeetingDialog';

export type NoteKind = 'note' | 'meeting';

export const KIND_LABEL: Record<NoteKind, string> = { note: 'Note', meeting: 'Meeting notes' };

/** The timeline's two icons (Figma 6049:170285: energy-icons sticky-note, carbon video-chat), drawn at 16.84 px. */
export function KindIcon({ kind, size = 16.842 }: { kind: NoteKind; size?: number }) {
  return <img src={kind === 'note' ? iconSticky : iconVideo} alt="" width={size} height={size} className="block shrink-0" />;
}

/** Option B: the Notes card's body is one height on the list, a note's details and the form (the user's call). */
export const INLINE_HEIGHT = 'h-[580px]';

/** The Notes card's 44 px white header: Notes (N) + New note on the list; ‹ Back or Cancel · Save in the section (option B). */
export function NotesCardBar({ children }: { children: ReactNode }) {
  return <div className="flex h-11 shrink-0 items-center justify-between gap-3 rounded-t-lg border-b border-ink/10 bg-white px-3">{children}</div>;
}

/** ‹ Back on the Notes card's header, from a note's details to the list (option B, the user's call). */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-ml-1 flex items-center gap-0.5 text-[14px] font-semibold leading-[18px] text-ink hover:text-brand">
      <img src={iconChevronLeft} alt="" width={20} height={20} />
      Back
    </button>
  );
}

/** A transcript file attached to meeting notes (Notes timeline trial): read in the page when it can be. */
export type AttachedFile = Extract<Transcript, { kind: 'file' }>;

/** Upload transcript on the note editor's toolbar, beside the formatting tools, on the Meeting notes tab only (the user's call). */
export function UploadTranscriptButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      // Keeps the selection in the writing area, like the tools beside it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-[26px] items-center gap-1.5 rounded-[4px] px-2 text-[12px] font-semibold leading-none text-ink-secondary hover:bg-black/[0.05] hover:text-ink"
    >
      <img src={iconUpload} alt="" width={16} height={16} className="opacity-70" />
      Upload transcript
    </button>
  );
}

/**
 * A file as a preview (no frame): a white head with the file's icon, name and what it holds, its actions at the
 * right, then the lines on `#f9fafa`, speakers semibold, scrolling inside. Used by New note's Meeting notes tab
 * (Replace · Remove) and the meeting popup (Download, capped height).
 */
export function TranscriptFileCard({
  icon,
  name,
  meta,
  lines,
  reading = false,
  empty,
  actions,
  className = 'min-h-0 flex-1',
}: {
  icon: ReactNode;
  name: string;
  meta: string;
  lines: string[];
  reading?: boolean;
  /** What the preview says when there is no text to show. */
  empty: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label="Attached file" className={`flex flex-col overflow-hidden rounded-lg border-[1.5px] border-[#e0e0e0] ${className}`}>
      <div className="flex shrink-0 items-center gap-3 border-b border-[#e0e0e0] bg-white px-3 py-2.5 text-[13px] leading-[1.5]">
        {icon}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="truncate font-semibold text-ink" title={name}>
            {name}
          </p>
          <p className="truncate text-[12px] leading-[18px] text-ink-tertiary">{reading ? 'Reading the file…' : meta}</p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-3 font-semibold">{actions}</div>}
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
          <p className="text-ink-tertiary">{empty}</p>
        )}
      </div>
    </section>
  );
}

/** A tile for a transcript that is not a file (a recorded call's, or pasted text). */
export function TranscriptTile({ children }: { children?: ReactNode }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
      {children ?? <Glyph src={iconClipboard} size={20} inset="15.13% 15.43% 14.87% 20.43%" bleed="-4.78% -5.22%" />}
    </span>
  );
}

const textLines = (text?: string) => text?.split(/\r?\n/).filter((l) => l.trim()) ?? [];

/**
 * What a transcript's card shows: a file's icon, name and "TXT · 5 KB" (the user's call: type and size only); a
 * recorded call's "Call transcript" and length, its lines as "Long (00:12): …"; pasted text as "Pasted transcript".
 */
export function transcriptCard(t: Transcript, client: Client, minutes?: number) {
  if (t.kind === 'file')
    return {
      icon: <FileTypeIcon name={t.name} />,
      name: t.name,
      meta: `${fileExtension(t.name).toUpperCase()} · ${fileSize(t.size)}`,
      lines: textLines(t.text),
      empty: fileExtension(t.name) === 'pdf' ? 'No preview for .pdf files in the demo. Download it to read the transcript.' : 'No text found in this file.',
    };
  if (t.kind === 'lines')
    return {
      icon: (
        <TranscriptTile>
          <KindIcon kind="meeting" size={18} />
        </TranscriptTile>
      ),
      name: 'Call transcript',
      meta: minutes ? `${minutes} min` : '',
      lines: t.lines.map((l) => `${l.from === 'coach' ? COACH_FIRST_NAME : client.firstName} (${l.at}): ${l.text}`),
      empty: 'No lines in this transcript.',
    };
  return { icon: <TranscriptTile />, name: 'Pasted transcript', meta: '', lines: textLines(t.text), empty: 'No text in this transcript.' };
}

/** Attaching one file: checks it, reads .txt / .srt / .docx in the page, keeps the name and size of any other. */
export function useAttachedFile(initial: AttachedFile | null = null) {
  const [file, setFile] = useState<AttachedFile | null>(initial);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef('');
  const attach = (f: File) => {
    const problem = transcriptFileError(f);
    setError(problem ?? '');
    if (problem) return;
    latest.current = f.name;
    setFile({ kind: 'file', name: f.name, size: f.size });
    const read = transcriptFileText(f);
    setReading(Boolean(read));
    read?.then((text) => {
      if (latest.current !== f.name) return;
      setReading(false);
      if (text) setFile((cur) => (cur?.name === f.name ? { ...cur, text } : cur));
    });
  };
  const remove = () => {
    latest.current = '';
    setFile(null);
    setReading(false);
  };
  return { file, reading, error, attach, remove };
}
