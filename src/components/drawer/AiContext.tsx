import { useState, type ReactNode } from 'react';
import iconChevron from '../../assets/figma/icon-chevron-down-small.svg';
import iconCheck from '../../assets/figma/icon-circle-check-brand.svg';
import iconListPlus from '../../assets/figma/icon-list-plus.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { AiContext, Client, CoachingStyle, UntrackedArea } from '../../data/types';
import { Tooltip } from '../Tooltip';

/**
 * Add context for AI Assessment (Figma: button 5746:520123, open 5744:519377, saved 5746:519756). The coach tells
 * Olly how they coach the client, what the client doesn't track, and a time-boxed note, so the assessment, Tell me
 * more and drafts can read the client the way the coach does.
 */

const STYLES: { key: CoachingStyle; label: string; hint: string }[] = [
  { key: 'high_touch', label: 'High touch', hint: 'Weekly check-ins. Olly flags anything that slips.' },
  { key: 'low_touch', label: 'Low touch', hint: 'Check-ins every few weeks. Olly flags only what keeps slipping.' },
  { key: 'self_guided', label: 'Self-guided', hint: 'The client runs the plan. Olly flags only big changes.' },
];
const UNTRACKED: { key: UntrackedArea; label: string }[] = [
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'tasks_habits', label: 'Tasks & Habit' },
];
const WEEKS = [1, 2, 4, 8];
const MAX_NOTE = 255;

const weeks = (n: number) => `${n} week${n === 1 ? '' : 's'}`;

/** Add context: 36 px, white, Border/Light, list-plus icon + 13 px semibold Text/Tertiary, with a tooltip on hover. */
export function AddContextButton({ firstName, onClick }: { firstName: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/tip relative flex h-9 items-center gap-2 rounded-[4px] border border-line-light bg-white p-2 text-[13px] font-semibold leading-[1.5] text-ink-tertiary hover:bg-surface-secondary hover:text-ink"
    >
      <img src={iconListPlus} alt="" width={20} height={20} />
      Add context
      <Tooltip wide start label={`Tell the AI how you coach ${firstName}, so the assessment matches your approach.`} />
    </button>
  );
}

/**
 * After saving: a brand-tinted chip, "✓ Context added | Edit". Context added for many clients at once (Dashboard
 * Settings) names where it came from: "Context added · From Online coaching".
 */
export function ContextAddedChip({ summary, source, onEdit }: { summary: string; source?: string; onEdit: () => void }) {
  return (
    <div title={summary} className="flex h-9 items-center gap-3 rounded-[4px] bg-brand/5 px-3">
      <span className="flex items-center gap-1.5 text-[12px] font-semibold leading-[1.5] text-ink">
        <img src={iconCheck} alt="" width={16} height={16} />
        Context added
        {source && <span className="font-normal text-ink-secondary">· From {source}</span>}
      </span>
      <span aria-hidden className="h-4 w-px bg-line-light" />
      <button type="button" onClick={onEdit} className="text-[12px] font-semibold leading-[1.5] text-ink-secondary underline hover:text-ink">
        Edit
      </button>
    </div>
  );
}

/** One line for the chip's hover: what the coach has told Olly. */
export function contextSummary(ctx: AiContext): string {
  const parts = [
    ctx.style && STYLES.find((s) => s.key === ctx.style)!.label,
    ctx.untracked.length > 0 && `Doesn't track ${ctx.untracked.map((k) => UNTRACKED.find((u) => u.key === k)!.label.toLowerCase()).join(' or ')}`,
    ctx.nextNote && `Next ${weeks(ctx.nextWeeks)}: ${ctx.nextNote}`,
  ];
  return parts.filter(Boolean).join(' · ');
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-9 items-center rounded-full border px-5 text-[13px] ${
        on ? 'border-brand bg-brand/5 font-semibold text-brand' : 'border-[#e0e0e0] bg-white text-black/60 hover:border-brand/40 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/** The design's note box: #fafbfc fill, #d4d7d9 stroke, 80 px, with a 0/255 counter. */
function NoteBox({ value, placeholder, label, onChange }: { value: string; placeholder: string; label: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-20 w-full flex-col rounded-[5px] border border-[#d4d7d9] bg-[#fafbfc] px-2.5 py-2 focus-within:border-brand">
      <textarea
        aria-label={label}
        value={value}
        maxLength={MAX_NOTE}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-0 flex-1 resize-none bg-transparent text-[13px] leading-normal text-ink outline-none placeholder:text-black/60"
      />
      <span className="text-right text-[12px] leading-[1.5] text-ink/50">
        {value.length}/{MAX_NOTE}
      </span>
    </label>
  );
}

function Question({ n, title, aside, last, children }: { n: number; title: string; aside?: ReactNode; last?: boolean; children: ReactNode }) {
  return (
    <div className={`flex flex-col gap-3 ${last ? '' : 'border-b border-line-light pb-4'}`}>
      <div className="flex items-center gap-3">
        <p className="text-[14px] font-semibold leading-[1.5] text-ink">
          {n}. {title}
        </p>
        {aside}
      </div>
      {children}
    </div>
  );
}

export const EMPTY_CONTEXT = (): AiContext => ({ untracked: [], untrackedNote: '', nextWeeks: 2, nextNote: '', savedOn: DEMO_TODAY });

export const isEmptyContext = (ctx: AiContext) => !ctx.style && ctx.untracked.length === 0 && !ctx.untrackedNote.trim() && !ctx.nextNote.trim();

/** The answers as saved: notes trimmed, dated today. */
export const finishContext = (ctx: AiContext): AiContext => ({ ...ctx, untrackedNote: ctx.untrackedNote.trim(), nextNote: ctx.nextNote.trim(), savedOn: DEMO_TODAY });

/**
 * The three questions, shared by one client's form and Dashboard Settings' Add context to clients. `who` names the
 * client ("Ali") or the group ("these clients"), so each question reads right.
 */
export function ContextQuestions({ ctx, set, who }: { ctx: AiContext; set: (patch: Partial<AiContext>) => void; who: { one: boolean; name: string } }) {
  const style = STYLES.find((s) => s.key === ctx.style);
  return (
    <>
      <Question n={1} title={`How do you coach ${who.name}?`}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <Chip key={s.key} on={ctx.style === s.key} onClick={() => set({ style: ctx.style === s.key ? undefined : s.key })}>
                {s.label}
              </Chip>
            ))}
          </div>
          {style && <p className="text-[13px] leading-[1.5] text-ink-tertiary">{style.hint}</p>}
        </div>
      </Question>
      <Question n={2} title={who.one ? `What doesn't ${who.name} track?` : `What don't ${who.name} track?`}>
        <div className="flex flex-wrap gap-2">
          {UNTRACKED.map((u) => {
            const on = ctx.untracked.includes(u.key);
            return (
              <Chip key={u.key} on={on} onClick={() => set({ untracked: on ? ctx.untracked.filter((k) => k !== u.key) : [...ctx.untracked, u.key] })}>
                {u.label}
              </Chip>
            );
          })}
        </div>
        <NoteBox value={ctx.untrackedNote} label="Additional note" placeholder="Additional note for context..." onChange={(v) => set({ untrackedNote: v })} />
      </Question>
      <Question
        n={3}
        title="Note for the next"
        last
        aside={
          <span className="relative flex h-8 items-center gap-2.5 rounded-[5px] border border-[#d4d7d9] bg-[#fafbfc] px-3 text-[13px] font-semibold text-ink focus-within:border-brand">
            {weeks(ctx.nextWeeks)}
            <img src={iconChevron} alt="" width={16} height={16} />
            {/* A native select under the design's field; selects open fine inside the artifact's iframe. */}
            <select
              aria-label="Note applies for"
              value={ctx.nextWeeks}
              onChange={(e) => set({ nextWeeks: Number(e.target.value) })}
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              {WEEKS.map((w) => (
                <option key={w} value={w}>
                  {weeks(w)}
                </option>
              ))}
            </select>
          </span>
        }
      >
        <NoteBox value={ctx.nextNote} label="Note for the next weeks" placeholder="Moving house, expect less logging..." onChange={(v) => set({ nextNote: v })} />
      </Question>
    </>
  );
}

/**
 * The questionnaire, inside the AI Assessment card. Save keeps the answers (clearing every answer removes the
 * context); Cancel drops the edits.
 */
export function ContextForm({
  client,
  initial,
  onSave,
  onCancel,
}: {
  client: Client;
  initial?: AiContext;
  onSave: (ctx: AiContext | null) => void;
  onCancel: () => void;
}) {
  const [ctx, setCtx] = useState<AiContext>(() => initial ?? EMPTY_CONTEXT());
  const set = (patch: Partial<AiContext>) => setCtx((c) => ({ ...c, ...patch }));
  const empty = isEmptyContext(ctx);

  return (
    <section aria-label="Add context for AI Assessment" className="flex animate-fade-in flex-col gap-3 rounded-lg border border-line-light bg-surface-secondary">
      <div className="flex items-center justify-between border-b border-line-light py-3 pl-4 pr-3">
        <h4 className="text-[16px] font-semibold leading-[1.5] text-ink">Add context for AI Assessment</h4>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="h-8 w-[88px] rounded-[5px] border border-black/10 bg-white text-[13px] font-semibold leading-[1.5] text-ink hover:bg-surface-secondary">
            Cancel
          </button>
          <button
            type="button"
            disabled={empty && !initial}
            onClick={() => onSave(empty ? null : finishContext(ctx))}
            className="h-8 w-[88px] rounded-lg border border-black/10 bg-brand text-[13px] font-semibold tracking-[-0.26px] text-white hover:bg-brand/90 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <ContextQuestions ctx={ctx} set={set} who={{ one: true, name: client.firstName }} />
      </div>
    </section>
  );
}
