import { useEffect, useRef, useState, type ReactNode } from 'react';
import iconChevron from '../../assets/figma/icon-chevron-down.svg';
import iconSearch from '../../assets/figma/icon-search-note.svg';
import { COACH_FIRST_NAME } from '../../data/mock';
import type { Client, Meeting } from '../../data/types';
import { fieldTime, fileSize, meetingDate, platformOf } from '../../lib/meetings';
import { useStore } from '../../state/store';
import { FileTypeIcon, fileExtension } from '../FileTypeIcon';
import { Avatar } from '../Avatar';
import { Modal } from '../Modal';
import { AiCard } from './AiAssessment';
import { TabBar } from './PanelParts';

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

/** One list section of the Summary tab; a leading "Topic:" is set in semibold. */
function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="text-[15px] font-semibold leading-[1.5] text-ink">{title}</h4>
      <ul className="flex list-disc flex-col gap-1.5 text-[13px] leading-[1.5] text-[#484848]">
        {items.map((it) => {
          const at = it.indexOf(': ');
          const lead = at > 0 && at < 24 ? it.slice(0, at) : null;
          return (
            <li key={it} className="ms-5">
              {lead ? (
                <>
                  <span className="font-semibold text-ink">{lead}:</span> {it.slice(at + 2)}
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
 * What "View transcript" opens (no Figma frame): the meeting's date, start and platform, then two tabs. Summary (the
 * user's brief): a Call Summary card drawn like the AI Assessment without its buttons, then Discuss and Your Follow
 * Up. Transcript: the lines, with a search box pinned on top; matches are highlighted as you type and ↑ / ↓ (or
 * Enter / Shift+Enter) step through them, the current one in a stronger tint and scrolled into view.
 */
export function TranscriptDialog({ client, meeting, onClose }: { client: Client; meeting: Meeting; onClose: () => void }) {
  const { showToast } = useStore();
  const summary = meeting.summary;
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>(summary ? 'summary' : 'transcript');
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const t = meeting.transcript;

  const lines: Line[] | null =
    t.kind === 'lines'
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

  return (
    <Modal
      title={meeting.title}
      subtitle={
        <span className="flex items-center gap-2">
          <span className="flex shrink-0 items-center gap-1.5 font-semibold text-ink">
            <Avatar name={client.name} src={client.avatar} size={20} />
            {client.name}
          </span>
          <span aria-hidden className="size-1 shrink-0 rounded-full bg-[#d9d9d9]" />
          {[meetingDate(meeting.date), fieldTime(meeting.start), meeting.link && platformOf(meeting.link)].filter(Boolean).join(' · ')}
        </span>
      }
      width={600}
      onClose={onClose}
      closeOnBackdrop
    >
      {/* One height for both tabs (up to the window's), so switching never resizes the popup. */}
      <div ref={body} className="min-h-[640px]">
        {/* Tabs, and on Transcript the search, stay pinned while the body scrolls. */}
        <div className="sticky top-0 z-[1] bg-white px-[30px] pt-3">
          <TabBar tabs={TABS} active={tab} onChange={setTab} />
          {tab === 'transcript' && lines && (
            <div className="pb-3 pt-4">
              {/* The Notes tab's search field. */}
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
            </div>
          )}
        </div>
        {tab === 'summary' && (
          <div className="flex flex-col gap-5 px-[30px] pb-[30px] pt-5">
            {summary ? (
              <>
                <AiCard title="Call Summary" assessment={{ headline: { before: summary.overview.headline }, bullets: summary.overview.bullets }} />
                <SummaryList title="Discuss" items={summary.discuss} />
                <SummaryList title="Your Follow Up" items={summary.followUp} />
              </>
            ) : (
              <p className="text-[13px] leading-[1.5] text-ink-tertiary">
                No summary for this meeting yet. Summaries are written for recorded calls; the transcript you added is on the Transcript tab.
              </p>
            )}
          </div>
        )}
        {tab === 'transcript' && (
          <div className={`px-[30px] pb-[30px] ${lines ? 'pt-2' : 'pt-5'}`}>
            {t.kind === 'file' && (
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
            {!lines ? (
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
          </div>
        )}
      </div>
    </Modal>
  );
}
