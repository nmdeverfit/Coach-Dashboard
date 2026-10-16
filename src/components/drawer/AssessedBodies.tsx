import { useState } from 'react';
import iconMarkDoneChecked from '../../assets/figma/icon-markdone-checked.svg';
import iconMarkDoneDisabled from '../../assets/figma/icon-markdone-disabled.svg';
import iconMarkDone from '../../assets/figma/icon-markdone.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { AcknowledgeDetail, BuildDetail, Client, RemindDetail } from '../../data/types';
import { summarizeNutrition } from '../../lib/checkin';
import { formatDayMonth, parseDay } from '../../lib/dates';
import { daysAgo, type AcknowledgeView, type BuildView, type FormStatusRow, type RemindView } from '../../lib/todos';
import { useStore } from '../../state/store';
import { AiAssessment } from './AiAssessment';
import { CardHeader, NutritionTab } from './NutritionTab';
import { DataArea, TabBar, TabPlaceholder } from './PanelParts';
import { TrainingTab } from './TrainingTab';

function Assessment({ client, assessment }: { client: Client; assessment: BuildView['assessment'] }) {
  const { showToast } = useStore();
  return (
    <div className="px-[30px] pb-[30px] pt-2.5">
      <AiAssessment
        assessment={assessment}
        onTellMeMore={() =>
          showToast(`Olly BI opens beside this panel: “Tell me more about ${client.firstName}’s status on ${formatDayMonth(parseDay(DEMO_TODAY))}”`)
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------- Build

const BUILD_TABS = [
  { key: 'training', label: 'Training' },
  { key: 'notes', label: 'Notes', muted: true },
] as const;

/** Build (assign program): full assessment, no verdict; Training with the Program card inside it, and Notes (AC4.4). */
export function BuildBody({ client, detail, view }: { client: Client; detail: BuildDetail; view: BuildView }) {
  const [tab, setTab] = useState<(typeof BUILD_TABS)[number]['key']>('training');
  return (
    <>
      <Assessment client={client} assessment={view.assessment} />
      <DataArea>
        <TabBar tabs={BUILD_TABS} active={tab} onChange={setTab} />
        {/* The same Session log as Check-in's Training tab, Program card included (AC4.4). */}
        {tab === 'training' ? <TrainingTab log={detail.training} today={DEMO_TODAY} /> : <TabPlaceholder label="Notes" />}
      </DataArea>
    </>
  );
}

// ---------------------------------------------------------------- Remind

function MarkDone({ state, onClick }: { state: 'checked' | 'open' | 'disabled'; onClick?: () => void }) {
  const icon = state === 'checked' ? iconMarkDoneChecked : state === 'disabled' ? iconMarkDoneDisabled : iconMarkDone;
  const box =
    state === 'checked'
      ? 'border border-black/15 bg-checked'
      : state === 'disabled'
        ? 'cursor-default bg-surface-secondary'
        : 'border border-black/15 bg-white hover:border-brand';
  return (
    <button
      type="button"
      disabled={state !== 'open'}
      onClick={onClick}
      aria-label={state === 'checked' ? 'Reviewed' : state === 'open' ? 'Mark form as reviewed' : 'Nothing to review'}
      className={`flex size-8 items-center justify-center rounded-md disabled:cursor-default ${box}`}
    >
      <span className="relative size-4">
        <span className="absolute bottom-[25.73%] left-[16.64%] right-[16.67%] top-1/4">
          <img src={icon} alt="" className="block size-full max-w-none" />
        </span>
      </span>
    </button>
  );
}

/** Form Status table: form name · response status · last submitted · coach action · action (Spec 4 AC12.3). */
function FormStatus({ rows }: { rows: FormStatusRow[] }) {
  const { showToast } = useStore();
  const [reviewed, setReviewed] = useState<Set<string>>(() => new Set(rows.filter((r) => r.reviewed).map((r) => r.name)));
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-elevated p-px">
      <CardHeader title="Form Status" link="View forms" onClick={() => showToast('The client’s Forms tab opens in a new tab')} />
      <div className="px-3 py-1">
        <div className="flex items-baseline border-b border-ink/10 px-1 pb-[11px] pt-2.5 text-[12px] font-semibold leading-[18px] text-ink-muted">
          <span className="w-[234px] shrink-0">Form name</span>
          <span className="w-[120px] shrink-0">Response status</span>
          <span className="w-[100px] shrink-0">Last submitted</span>
          <span className="w-[107px] shrink-0">Coach action</span>
          <span className="w-[68px] shrink-0 text-center">Action</span>
        </div>
        {rows.map((r, i) => {
          const overdue = r.status === 'overdue';
          const done = reviewed.has(r.name);
          return (
            <div key={r.name} className={`flex items-center px-1.5 pb-[13px] pt-3 text-[13px] leading-[18px] ${i < rows.length - 1 ? 'border-b border-ink/10' : ''}`}>
              <span className="w-[234px] shrink-0 pr-3 font-semibold text-ink">{r.name}</span>
              <span className={`w-[120px] shrink-0 font-semibold ${overdue ? 'text-status-risk-fg' : 'text-checked'}`}>{overdue ? 'Overdue' : 'Submitted'}</span>
              <span className="w-[100px] shrink-0 text-ink">{r.lastSubmittedOn ? daysAgo(r.lastSubmittedOn, DEMO_TODAY) : '—'}</span>
              {/* Coach action reads the last submission; an overdue period has nothing new to review. */}
              <span className={`w-[107px] shrink-0 font-semibold ${done ? 'text-[#059669]' : 'text-ink-muted'}`}>
                {r.lastSubmittedOn ? (done ? 'Reviewed' : 'Not yet reviewed') : '—'}
              </span>
              <span className="flex w-[68px] shrink-0 justify-center">
                <MarkDone
                  state={overdue ? 'disabled' : done ? 'checked' : 'open'}
                  onClick={() => {
                    setReviewed((prev) => new Set(prev).add(r.name));
                    showToast(`${r.name} marked as reviewed`);
                  }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const REMIND_TABS = [
  { key: 'training', label: 'Training' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'form', label: 'Form' },
  { key: 'notes', label: 'Notes', muted: true },
] as const;

/**
 * Remind (overdue check-in form): assessment with Tell me more, no status chip and no feedback (AC12.3).
 * Tabs Training · Nutrition · Form · Notes, Form active (BL2).
 */
export function RemindBody({ client, detail, view }: { client: Client; detail: RemindDetail; view: RemindView }) {
  const [tab, setTab] = useState<(typeof REMIND_TABS)[number]['key']>('form');
  return (
    <>
      <Assessment client={client} assessment={view.assessment} />
      <DataArea>
        <TabBar tabs={REMIND_TABS} active={tab} onChange={setTab} />
        {tab === 'form' ? (
          <FormStatus rows={view.rows} />
        ) : tab === 'training' ? (
          <TrainingTab log={detail.training} today={DEMO_TODAY} />
        ) : tab === 'nutrition' ? (
          <NutritionTab log={detail.nutrition} summary={summarizeNutrition(detail.nutrition, DEMO_TODAY)} />
        ) : (
          <TabPlaceholder label="Notes" />
        )}
      </DataArea>
    </>
  );
}

// ---------------------------------------------------------------- Acknowledge (Phase 2, trialled)

const ACKNOWLEDGE_TABS = [
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'training', label: 'Training' },
  { key: 'notes', label: 'Notes', muted: true },
] as const;

/**
 * Acknowledge: no Figma frame, so it borrows the assessed-type layout: the assessment card with Tell me more,
 * no status chip and no feedback; the tab of the win opens first.
 */
export function AcknowledgeBody({ client, detail, view }: { client: Client; detail: AcknowledgeDetail; view: AcknowledgeView }) {
  const [tab, setTab] = useState<(typeof ACKNOWLEDGE_TABS)[number]['key']>('nutrition');
  return (
    <>
      <Assessment client={client} assessment={view.assessment} />
      <DataArea>
        <TabBar tabs={ACKNOWLEDGE_TABS} active={tab} onChange={setTab} />
        {tab === 'nutrition' ? (
          <NutritionTab log={detail.nutrition} summary={summarizeNutrition(detail.nutrition, DEMO_TODAY)} />
        ) : tab === 'training' ? (
          <TrainingTab log={detail.training} today={DEMO_TODAY} />
        ) : (
          <TabPlaceholder label="Notes" />
        )}
      </DataArea>
    </>
  );
}
