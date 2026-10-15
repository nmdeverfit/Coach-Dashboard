import { useState } from 'react';
import iconMarkDoneChecked from '../../assets/figma/icon-markdone-checked.svg';
import iconMarkDoneDisabled from '../../assets/figma/icon-markdone-disabled.svg';
import iconMarkDone from '../../assets/figma/icon-markdone.svg';
import iconSessionDone from '../../assets/figma/icon-session-done.svg';
import iconSessionPartial from '../../assets/figma/icon-session-partial.svg';
import iconSessionRest from '../../assets/figma/icon-session-rest.svg';
import { DEMO_TODAY } from '../../data/mock';
import type { BuildDetail, Client, RemindDetail } from '../../data/types';
import { summarizeNutrition } from '../../lib/checkin';
import { formatDayMonth, formatMonthDay, parseDay } from '../../lib/dates';
import { daysAgo, type BuildView, type FormStatusRow, type RemindView } from '../../lib/todos';
import type { SessionCell, TrainingSummary } from '../../lib/training';
import { useStore } from '../../state/store';
import { AiAssessment } from './AiAssessment';
import { CardHeader, NutritionTab } from './NutritionTab';
import { DataArea, TabBar, TabPlaceholder } from './PanelParts';
import { ProgramCard, Row, TrainingTab, ago, pct } from './TrainingTab';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Build and Remind draw the assessment card with the red border in their frames (5647:133017, 5647:133214). */
const ASSESSMENT_BORDER = 'border-status-risk-line';

function Assessment({ client, assessment }: { client: Client; assessment: BuildView['assessment'] }) {
  const { showToast } = useStore();
  return (
    <div className="px-[30px] pb-[30px] pt-2.5">
      <AiAssessment
        border={ASSESSMENT_BORDER}
        assessment={assessment}
        onTellMeMore={() =>
          showToast(`Olly BI opens beside this panel: “Tell me more about ${client.firstName}’s status on ${formatDayMonth(parseDay(DEMO_TODAY))}”`)
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------- Build

type StripState = 'completed' | 'partial' | 'missed' | 'rest' | 'unassigned';

/** Day status circles from the Build frame's session log. Missed has no drawn state; it borrows the Check-in log's red. */
const STRIP: Record<StripState, { circle: string; label: string; text: string }> = {
  completed: { circle: 'border border-[#059669]/20 bg-[#059669]/10', label: 'Completed', text: 'font-bold text-[#059669]' },
  partial: { circle: 'border-[1.077px] border-brand/10 bg-surface-secondary', label: 'Partial', text: 'font-bold text-brand' },
  missed: { circle: 'border-[1.077px] border-[#feeff2] bg-[#f2617d]/10', label: 'Missed', text: 'font-bold text-[#f03358]' },
  rest: { circle: 'border-[1.077px] border-line bg-white', label: 'Rest day', text: 'font-semibold text-ink-secondary' },
  unassigned: { circle: 'border-[1.077px] border-line bg-[#eaeef1]', label: 'Not assigned', text: 'font-semibold text-ink-secondary' },
};

function stripState(cell: SessionCell): StripState {
  if (!cell.assigned || cell.state === 'paused' || cell.state === 'today' || cell.state === 'upcoming') return 'unassigned';
  return cell.state === 'completed' || cell.state === 'partial' || cell.state === 'missed' ? cell.state : 'rest';
}

function DayStatus({ cell, weekday }: { cell: SessionCell; weekday: string }) {
  const state = stripState(cell);
  const s = STRIP[state];
  const date = formatMonthDay(parseDay(cell.date));
  const tip = cell.day ? `${weekday}, ${date} · ${cell.day.name} · ${cell.day.completed} of ${cell.day.sections} sections` : `${weekday}, ${date} · ${s.label}`;
  return (
    <div title={tip} className="flex h-11 flex-col items-center gap-1">
      <span className={`flex size-7 items-center justify-center rounded-full ${s.circle}`}>
        {state === 'completed' && <img src={iconSessionDone} alt="" width={14} height={14} />}
        {state === 'partial' && <img src={iconSessionPartial} alt="" width={14} height={14} />}
        {state === 'rest' && <img src={iconSessionRest} alt="" width={14} height={14} />}
        {(state === 'unassigned' || state === 'missed') && (
          <span className={`text-[9.692px] font-bold leading-[14.538px] ${state === 'missed' ? 'text-[#f03358]' : 'text-ink-secondary'}`}>–</span>
        )}
      </span>
      <span className={`text-[11px] uppercase leading-[13.5px] ${s.text}`}>{weekday}</span>
    </div>
  );
}

/** The Build frame's compact 4-week columns: 109 × 66, no grid lines, bars to scale (50 px is 100%). */
function MiniTrend({ trend }: { trend: TrainingSummary['trend'] }) {
  const full = 50;
  const centers = [8.87, 39.62, 70.38, 101.13];
  return (
    <div className="relative h-[66px] w-[109px] shrink-0" role="img" aria-label={trend.map((w) => `${w.label} ${w.pct ?? 0}%`).join(', ')}>
      {trend.map((w, i) => (
        <div key={w.label}>
          <div
            title={`${w.label}: ${w.pct ?? 0}%`}
            className="absolute bottom-[12.46px] w-4 -translate-x-1/2 rounded-t-[0.622px] bg-[#0e9cff]"
            style={{ left: centers[i], height: ((w.pct ?? 0) / 100) * full }}
          />
          <span className="absolute bottom-0 -translate-x-1/2 text-[9px] font-semibold leading-none text-ink/60" style={{ left: centers[i] }}>
            {w.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function BuildTraining({ training }: { training: TrainingSummary }) {
  const lastWeek = training.weeks[0];
  const first = parseDay(lastWeek[0].date);
  const last = parseDay(lastWeek[6].date);
  return (
    <div className="flex w-full flex-col gap-[15px]">
      <div className="flex flex-col overflow-hidden rounded-lg border border-ink/15 bg-elevated p-px">
        <CardHeader title="Session log" link="Workout history" />
        <div className="flex flex-col gap-1 p-3">
          <div className="flex flex-col items-center gap-3 pb-5 pt-3">
            <p className="text-[13px] font-semibold leading-[18px] text-ink">
              {formatMonthDay(first)} - {formatMonthDay(last)}
            </p>
            <div className="flex items-center justify-center gap-3">
              {lastWeek.map((cell, i) => (
                <DayStatus key={cell.date} cell={cell} weekday={WEEKDAYS[i]} />
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <Row label="Last workout" value={ago(training.lastWorkoutDaysAgo)} />
            <Row label="2-week adherence" value={pct(training.adherence2w)} />
            <div className="flex items-center px-1 py-2.5 text-[13px] leading-[18px] text-ink">
              <p className="w-[210px] shrink-0">
                4-week trend
                <br />
                <span className="font-semibold">({pct(training.adherence4w)} adherence)</span>
              </p>
              <MiniTrend trend={training.trend} />
            </div>
          </div>
        </div>
      </div>
      <ProgramCard program={training.program} />
    </div>
  );
}

const BUILD_TABS = [
  { key: 'training', label: 'Training' },
  { key: 'notes', label: 'Notes', muted: true },
] as const;

/** Build (assign program): full assessment, no verdict; Training with the Program card inside it, and Notes (AC4.4). */
export function BuildBody({ client, view }: { client: Client; detail: BuildDetail; view: BuildView }) {
  const [tab, setTab] = useState<(typeof BUILD_TABS)[number]['key']>('training');
  return (
    <>
      <Assessment client={client} assessment={view.assessment} />
      <DataArea>
        <TabBar tabs={BUILD_TABS} active={tab} onChange={setTab} />
        {tab === 'training' ? <BuildTraining training={view.training} /> : <TabPlaceholder label="Notes" />}
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
