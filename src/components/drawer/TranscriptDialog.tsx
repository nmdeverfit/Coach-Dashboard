import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import iconChevron from '../../assets/figma/icon-chevron-down.svg';
import iconSearch from '../../assets/figma/icon-search-note.svg';
import iconSparkle from '../../assets/figma/icon-ai-sparkle.svg';
import { COACH_FIRST_NAME } from '../../data/mock';
import type { Client, Meeting } from '../../data/types';
import { NOTES_TIMELINE } from '../../lib/flags';
import { ConfirmDialog } from '../ConfirmDialog';
import { DetailActions, KindTag, NOTE_POPUP, NoteHeader, TITLE, TimeLine } from './NoteDialog';
import { KIND_LABEL, TranscriptFileCard, transcriptCard } from './NoteAttachment';
import { noteStamp } from '../../lib/notes';
import { fieldTime, fileSize, meetingDate } from '../../lib/meetings';
import { useStore } from '../../state/store';
import { FileTypeIcon, fileExtension } from '../FileTypeIcon';
import { Avatar } from '../Avatar';
import { Modal } from '../Modal';

interface Line {
  speaker?: string;
  at?: string;
  text: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'transcript', label: 'Transcript' },
] as const;

/** One list section of the Summary tab (Figma 5925:146302): 16 px title, 13 px bullets, "Topic:" in bold; `ruled` adds the rule under it. */
function SummaryList({ title, items, ruled = false }: { title: string; items: string[]; ruled?: boolean }) {
  return (
    <section className={`flex flex-col gap-2 px-2 pb-4 ${ruled ? 'border-b border-line' : ''}`}>
      <h4 className="text-[16px] font-semibold tracking-[-0.32px] text-ink">{title}</h4>
      <ul className="list-disc text-[13px] leading-[1.5] text-ink">
        {items.map((it) => {
          const at = it.indexOf(': ');
          const lead = at > 0 && at < 24 ? it.slice(0, at) : null;
          return (
            <li key={it} className="ms-[19.5px]">
              {lead ? (
                <>
                  <span className="font-bold">{lead}:</span> {it.slice(at + 2)}
                </>
              ) : (
                it
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * What "View details" opens (Figma 5759:161235, Summary redrawn in 5925:146302): the meeting's title, then client ·
 * date · start at 14 px (no platform, the user's call), then two tabs on a full-width bar. Summary: Discuss, a rule, then Your Follow Up. Transcript: the lines, with a search box pinned on top; matches are highlighted as you type and ↑ / ↓ (or
 * Enter / Shift+Enter) step through them, the current one in a stronger tint and scrolled into view.
 */
export function TranscriptDialog({
  client,
  meeting,
  initialTab,
  onEdit,
  onDelete,
  onClose,
}: {
  client: Client;
  meeting: Meeting;
  /** Opens on this tab; by default Summary when the call has one. */
  initialTab?: 'summary' | 'transcript';
  /** Notes timeline trial: Edit and Delete on the title row. */
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { showToast } = useStore();
  const summary = meeting.summary;
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>(initialTab ?? (summary ? 'summary' : 'transcript'));
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const t = meeting.transcript;

  const lines: Line[] | null = !t
    ? null
    : t.kind === 'lines'
      ? t.lines.map((l) => ({ speaker: l.from === 'coach' ? COACH_FIRST_NAME : client.firstName, at: l.at, text: l.text }))
      : t.kind === 'text' || t.text !== undefined
        ? (t.kind === 'text' ? t.text : t.text!).split('\n').map((text) => ({ text }))
        : null;

  const q = query.trim();
  const pattern = q ? new RegExp(`(${escape(q)})`, 'gi') : null;
  const total = pattern && lines ? lines.reduce((n, l) => n + (l.text.match(pattern)?.length ?? 0), 0) : 0;

  // A new query starts at its first match; stepping wraps around.
  useEffect(() => setCurrent(0), [q]);
  useEffect(() => {
    body.current?.querySelector('[data-match-current]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [current, q]);
  const step = (by: number) => total && setCurrent((c) => (c + by + total) % total);

  // Pasted or uploaded text: a line that opens with the coach's or the client's name ("Long:", "Malcom (04:12):")
  // gets that name in bold, like the recorded lines.
  const names = [client.name, client.firstName, COACH_FIRST_NAME].map(escape).join('|');
  const speakerAt = new RegExp(`^(?:${names})(?=\\s*(?:\\([^)]*\\))?\\s*:)`, 'i');
  const speakerOf = (text: string) => text.match(speakerAt)?.[0];

  // Rendered in order, so a running counter numbers every match.
  let seen = 0;
  const highlight = (text: string): ReactNode => {
    if (!pattern) return text;
    return text.split(pattern).map((part, i) => {
      if (i % 2 === 0) return part;
      const index = seen++;
      const on = index === current;
      return (
        <mark key={i} data-match-current={on || undefined} className={`rounded-sm px-px text-ink ${on ? 'bg-[#ffd666]' : 'bg-[#fff1b8]'}`}>
          {part}
        </mark>
      );
    });
  };

  // The transcript's search field (the Notes tab's) and its lines, shared by the tabbed popup and the trial's page.
  const search = lines && (
    <label className="flex h-[38px] items-center gap-2.5 rounded-[5px] border border-[#dbdce3] px-3 focus-within:border-brand">
      <span className="relative size-5 shrink-0 overflow-hidden">
        <span className="absolute inset-[15%_14.69%_14.69%_15%]">
          <span className="absolute inset-[-3.56%]">
            <img src={iconSearch} alt="" className="block size-full max-w-none" />
          </span>
        </span>
      </span>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            step(e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey) ? -1 : 1);
          }
        }}
        placeholder="Search transcript"
        aria-label="Search transcript"
        className="min-w-0 flex-1 bg-transparent text-[13px] leading-[1.5] text-ink outline-none placeholder:text-ink-tertiary"
      />
      {q && (
        <span className="flex shrink-0 items-center gap-1">
          <span className="whitespace-nowrap text-[12px] tabular-nums leading-[18px] text-ink-secondary" aria-live="polite">
            {total ? `${current + 1} of ${total}` : 'No matches'}
          </span>
          {[-1, 1].map((by) => (
            <button
              key={by}
              type="button"
              aria-label={by < 0 ? 'Previous match' : 'Next match'}
              disabled={!total}
              onClick={() => step(by)}
              className="flex size-6 items-center justify-center rounded hover:bg-surface-secondary disabled:opacity-40"
            >
              <img src={iconChevron} alt="" width={16} height={16} className={by < 0 ? 'rotate-180' : ''} />
            </button>
          ))}
        </span>
      )}
    </label>
  );
  const transcriptLines = (
    <>
      {t?.kind === 'file' && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#e0e0e0] p-3">
          <FileTypeIcon name={t.name} />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-[13px] font-semibold leading-[1.5] text-ink">{t.name}</p>
            <p className="text-[12px] leading-[18px] text-ink-tertiary">
              {fileSize(t.size)} · {fileExtension(t.name).toUpperCase()}
            </p>
          </div>
          <button type="button" onClick={() => showToast(`${t.name} downloads`)} className="shrink-0 text-[13px] font-semibold text-brand hover:underline">
            Download
          </button>
        </div>
      )}
      {!t ? null : !lines ? (
        <p className="text-[13px] leading-[1.5] text-ink-tertiary">There’s no preview for this file type. Download it to read the transcript.</p>
      ) : t.kind === 'lines' ? (
        <ol className="flex flex-col gap-4">
          {lines.map((l, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <p className="flex items-baseline gap-2">
                <span className="text-[13px] font-bold leading-[18px] text-ink">{l.speaker}</span>
                <span className="text-[12px] tabular-nums leading-[18px] text-ink-muted">{l.at}</span>
              </p>
              <p className="text-[13px] leading-[1.5] text-[#484848]">{highlight(l.text)}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="break-words text-[13px] leading-[1.5] text-[#484848]">
          {lines.map((l, i) => (
            <p key={i} className="min-h-[1.5em] whitespace-pre-wrap">
              {speakerOf(l.text) ? (
                <>
                  <span className="font-bold text-ink">{highlight(speakerOf(l.text)!)}</span>
                  {highlight(l.text.slice(speakerOf(l.text)!.length))}
                </>
              ) : (
                highlight(l.text)
              )}
            </p>
          ))}
        </div>
      )}
    </>
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const when = (
    <span className="mt-1 flex items-center gap-2 text-[14px] leading-[22px]">
      <span className="flex shrink-0 items-center gap-2 font-semibold text-ink">
        <Avatar name={client.name} src={client.avatar} size={20} />
        {client.name}
      </span>
      <span aria-hidden className="size-1 shrink-0 rounded-full bg-[#d9d9d9]" />
      {meetingDate(meeting.date)} · {fieldTime(meeting.start)}
    </span>
  );

  return (
    <Modal
      title={meeting.title}
      subtitle={when}
      // Notes timeline trial: Note details' header (the user's call): the kind over the title, Delete · Edit on the
      // title row, then the meeting's date and the last edit; no client name.
      header={
        NOTES_TIMELINE && onEdit && onDelete ? (
          <NoteHeader
            above={<KindTag label={KIND_LABEL.meeting} />}
            title={<h2 className={`${TITLE} min-w-0 break-words`}>{meeting.title}</h2>}
            actions={<DetailActions what="meeting notes" onDelete={() => setConfirmingDelete(true)} onEdit={onEdit} />}
          >
            <TimeLine>Meeting date: {noteStamp(`${meeting.date}T${meeting.start}`)}</TimeLine>
            {meeting.editedAt && <TimeLine>Last edited: {noteStamp(meeting.editedAt)}</TimeLine>}
          </NoteHeader>
        ) : undefined
      }
      {...(NOTES_TIMELINE ? NOTE_POPUP : { width: 620 })}
      onClose={onClose}
      closeOnBackdrop
      headerBorder={false}
    >
      {NOTES_TIMELINE ? (
        // Notes timeline trial (the user's call): one plain page, no tabs, headings, rule or search. The coach's notes
        // come first; under them the transcript as a file preview, each only when the meeting has it.
        <div ref={body} className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8 pb-8 pt-5">
          {meeting.notes && <div className="note-body shrink-0" dangerouslySetInnerHTML={{ __html: meeting.notes }} />}
          {t && (
            <TranscriptFileCard
              {...transcriptCard(t, client, meeting.minutes)}
              actions={
                t.kind === 'file' && (
                  <button type="button" onClick={() => showToast(`${t.name} downloads`)} className="text-brand hover:underline">
                    Download
                  </button>
                )
              }
              className="min-h-[240px] flex-1"
            />
          )}
        </div>
      ) : (
        /* One height for both tabs (up to the window's), so switching never resizes the popup. */
        <div ref={body} className="min-h-[640px]">
          {/* Tabs, and on Transcript the search, stay pinned while the body scrolls. */}
          <div className="sticky top-0 z-[1] bg-white">
            <div role="tablist" aria-label="Meeting" className="flex items-center border-b border-line px-5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={
                    tab === t.key
                      ? '-mb-px border-b-2 border-brand px-5 pb-2 pt-1.5 text-[13px] font-semibold text-brand'
                      : 'px-5 py-1.5 text-[13px] font-semibold tracking-[-0.26px] text-ink/40 hover:text-ink/70'
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === 'transcript' && search && <div className="px-5 pb-3 pt-4">{search}</div>}
          </div>
          {tab === 'summary' && (
            <div className="flex flex-col gap-4 px-5 pb-5 pt-5">
              {meeting.summaryPending ? (
                <div role="status" className="flex flex-col gap-3 px-2">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold leading-[1.5] text-ink-secondary">
                    <img src={iconSparkle} alt="" width={14} height={14} />
                    Generating summary from the transcript…
                  </p>
                  {[92, 80, 86, 64].map((w) => (
                    <span key={w} className="h-3 animate-pulse rounded bg-surface-secondary" style={{ width: `${w}%` }} />
                  ))}
                </div>
              ) : summary ? (
                <>
                  {summary.discuss.length > 0 && <SummaryList title="Discuss" items={summary.discuss} ruled />}
                  <SummaryList title="Your Follow Up" items={summary.followUp} />
                </>
              ) : (
                <p className="text-[13px] leading-[1.5] text-ink-tertiary">
                  No summary for this meeting. The demo can’t read .pdf files, so summaries are written from .txt, .srt and
                  .docx files and pasted text.
                </p>
              )}
            </div>
          )}
          {tab === 'transcript' && <div className={`px-[30px] pb-[30px] ${lines ? 'pt-2' : 'pt-5'}`}>{transcriptLines}</div>}
        </div>
      )}
      {confirmingDelete &&
        onDelete &&
        createPortal(
          <ConfirmDialog
            title="Delete these meeting notes?"
            body={`“${meeting.title}” will be removed from ${client.firstName}’s notes.`}
            confirmLabel="Delete"
            onCancel={() => setConfirmingDelete(false)}
            onConfirm={onDelete}
          />,
          document.body,
        )}
    </Modal>
  );
}
