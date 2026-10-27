import { useRef, useState, type ReactNode } from 'react';
import iconClipboard from '../../assets/figma/icon-clipboard.svg';
import iconUpload from '../../assets/figma/icon-upload.svg';
import type { Transcript } from '../../data/types';
import { fileSize } from '../../lib/meetings';
import { statsLine, transcriptStats } from '../../lib/noteKind';
import { FileTypeIcon, fileExtension } from '../FileTypeIcon';
import { Glyph } from '../Glyph';
import { SPEAKER, transcriptFileError, transcriptFileText } from './AddMeetingDialog';

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

/** An attached file's card: "5 KB · TXT · 61 lines · Long and Malcom · ~30 min" and its lines. */
export function AttachedFileCard({ file, reading, actions, className }: { file: AttachedFile; reading?: boolean; actions?: ReactNode; className?: string }) {
  const stats = file.text ? statsLine(transcriptStats(file.text)) : '';
  return (
    <TranscriptFileCard
      icon={<FileTypeIcon name={file.name} />}
      name={file.name}
      meta={[fileSize(file.size), fileExtension(file.name).toUpperCase(), stats].filter(Boolean).join(' · ')}
      lines={file.text?.split(/\r?\n/).filter((l) => l.trim()) ?? []}
      reading={reading}
      empty={fileExtension(file.name) === 'pdf' ? 'No preview for .pdf files in the demo. The file is kept with the meeting notes.' : 'No text found in this file.'}
      actions={actions}
      className={className}
    />
  );
}

/** Attaching one file: checks it, reads .txt / .srt / .docx in the page, keeps the name and size of any other. */
export function useAttachedFile() {
  const [file, setFile] = useState<AttachedFile | null>(null);
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
