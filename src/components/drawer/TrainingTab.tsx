import legendPaused from '../../assets/figma/legend-paused.png';
import trendLines from '../../assets/figma/chart-trend-lines.svg';
import pausedPattern from '../../assets/figma/training-paused.png';
import arrowDown from '../../assets/figma/tooltip-arrow-down.svg';
import iconDone from '../../assets/figma/icon-workout-done.svg';
import iconMissed from '../../assets/figma/icon-workout-missed.svg';
import type { TrainingDay, TrainingLog } from '../../data/types';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { doneOf, summarizeTraining, type SessionCell, type SessionState, type TrainingSummary } from '../../lib/training';

type WorkoutDay = Extract<TrainingDay, { kind: 'workout' }>;
import { CardHeader } from './NutritionTab';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Session-log cell styles from Figma node 5645:520935. */
const CELL: Record<SessionState, { box: string; label: string; text: string; tone: string }> = {
  completed: { box: 'border-brand bg-brand', label: 'Completed', text: 'text-white', tone: 'text-[#e3ecff]' },
  partial: { box: 'border-[#e3eaff] bg-brand/[0.12]', label: 'Partial', text: 'text-brand', tone: 'text-[#4a4d56]' },
  missed: { box: 'border-[#feeff2] bg-[#f2617d]/10', label: 'Missed', text: 'text-[#f03358]', tone: '' },
  rest: { box: 'border-[#f2f2f2] bg-black/5', label: 'Rest', text: 'text-ink-tertiary', tone: '' },
  today: { box: 'border-line bg-white', label: 'Today', text: 'text-ink-tertiary', tone: '' },
  upcoming: { box: 'border-dashed border-ink-muted/40 bg-white', label: 'Upcoming', text: 'text-ink-muted', tone: '' },
  paused: { box: 'border-[#f6f6f6] bg-[#f2f2f2]', label: 'Paused', text: 'text-ink-muted', tone: '' },
};

const pad = (d: string) => String(parseDay(d).getUTCDate()).padStart(2, '0');

/** A date with no calendar entry: nothing was assigned (Build's "Not assigned" grey, Figma 5647:133017). */
const UNASSIGNED = { box: 'border-line bg-[#eaeef1]', label: 'Not assigned', text: 'text-ink-secondary', tone: '' };

function Cell({ cell, today }: { cell: SessionCell; today: string }) {
  const s = cell.assigned ? CELL[cell.state] : UNASSIGNED;
  const isToday = cell.date === today;
  const showCount = (cell.state === 'completed' || cell.state === 'partial') && cell.day;
  return (
    <div
      tabIndex={cell.day ? 0 : undefined}
      className={`group/cell relative flex h-[76px] min-w-0 flex-col gap-3 rounded-lg border px-1.5 pb-2.5 pt-1.5 outline-none ${s.box}`}
    >
      {cell.state === 'paused' && (
        <img src={pausedPattern} alt="" className="pointer-events-none absolute inset-0 size-full rounded-lg object-cover opacity-40" />
      )}
      {isToday ? (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-[11px] font-semibold leading-[18px] text-brand">
          {pad(cell.date)}
        </span>
      ) : (
        <span className={`relative h-5 shrink-0 text-[11px] leading-[18px] ${cell.state === 'completed' ? 'text-white' : 'text-ink'}`}>{pad(cell.date)}</span>
      )}
      {/* Fixed rows (date, then label) so every state's label sits at the same height; the count hangs below it. */}
      <div className="relative flex shrink-0 flex-col gap-1.5">
        <span className={`text-[11px] font-semibold leading-none tracking-[-0.22px] ${s.text}`}>{s.label}</span>
        {showCount && (
          <span className={`text-[10px] leading-none tracking-[-0.2px] ${s.tone}`}>
            {doneOf(cell.day!)}/{cell.day!.workouts.length}
          </span>
        )}
      </div>
      {cell.day && <DayTooltip cell={cell} day={cell.day} />}
    </div>
  );
}

/**
 * A training day's hover (Figma 4899:687161): the date, the day's state with done / assigned workouts, then each
 * workout with ✓ (done) or × (not done). Today and upcoming days list theirs with no mark yet.
 */
function DayTooltip({ cell, day }: { cell: SessionCell; day: WorkoutDay }) {
  const date = parseDay(cell.date);
  const ahead = cell.state === 'today' || cell.state === 'upcoming';
  const label = ahead ? 'Assigned' : CELL[cell.state].label;
  const n = day.workouts.length;
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 flex-col items-center drop-shadow-[0_4px_24px_rgba(0,0,0,0.12)] group-hover/cell:flex group-focus/cell:flex">
      <div className="flex flex-col gap-1.5 rounded-lg bg-white px-3 pb-2.5 pt-2 text-left">
        <div className="flex flex-col pb-0.5">
          <span className="text-[11px] leading-[1.5] text-ink-tertiary">
            {WEEKDAYS[(date.getUTCDay() + 6) % 7]}, {formatMonthDay(date)}
          </span>
          <span className="min-w-[120px] whitespace-nowrap text-[12px] font-semibold leading-[1.5] tracking-[-0.24px] text-ink">
            {label}{' '}
            <span className="font-normal">({ahead ? `${n} workout${n === 1 ? '' : 's'}` : `${doneOf(day)}/${n} workouts`})</span>
          </span>
        </div>
        <ul className="flex flex-col gap-1">
          {day.workouts.map((w, i) => (
            <li key={i} className="flex items-center gap-0.5">
              {ahead ? (
                <span className="flex size-3.5 shrink-0 items-center justify-center">
                  <span className="size-1 rounded-full bg-ink-muted" />
                </span>
              ) : (
                <img src={w.done ? iconDone : iconMissed} alt={w.done ? 'Done' : 'Not done'} width={14} height={14} className="shrink-0" />
              )}
              <span className="w-[180px] text-[12px] leading-[1.4] text-ink-tertiary">{w.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <img src={arrowDown} alt="" width={10} height={5} className="-mt-px" />
    </div>
  );
}

function Legend({ unassigned }: { unassigned: boolean }) {
  const items: [string, React.ReactNode][] = [
    ['Rest day', <span className="size-4 rounded-[2.837px] border-[1.064px] border-line-light bg-[#efefef]" />],
    ['Partial', <span className="size-4 rounded-[3.368px] border-[1.263px] border-[#e1e7fc] bg-[#e5ebfc]" />],
    ['Completed', <span className="size-4 rounded-[3.368px] border-[1.263px] border-brand bg-brand" />],
    ['Missed', <span className="size-4 rounded-[3.368px] border-[1.263px] border-[#fbecef] bg-[#fbecef]" />],
    ['Upcoming', <span className="size-4 rounded-[2.837px] border-[1.064px] border-dashed border-ink-muted" />],
    ['Pause', <img src={legendPaused} alt="" width={16} height={16} className="rounded-[2.837px]" />],
  ];
  if (unassigned) items.push(['Not assigned', <span className="size-4 rounded-[2.837px] border-[1.064px] border-line bg-[#eaeef1]" />]);
  return (
    <div className={`flex items-center justify-center whitespace-nowrap px-4 py-3.5 text-[12px] leading-[18px] text-ink ${unassigned ? 'gap-4' : 'gap-6'}`}>
      {items.map(([label, swatch]) => (
        <span key={label} className="flex items-center gap-2">
          {swatch}
          {label}
        </span>
      ))}
    </div>
  );
}

/** 4-week trend columns, drawn to scale: the top grid line is 100%, the middle 50%. */
function TrendChart({ trend }: { trend: TrainingSummary['trend'] }) {
  const baseline = 78.65;
  const full = 73.9;
  const centers = [15.53, 60.59, 105.65, 150.71];
  return (
    <div className="relative h-[92px] w-[165px] shrink-0 overflow-hidden" role="img" aria-label={trend.map((w) => `${w.label} ${w.pct ?? 0}%`).join(', ')}>
      <div className="absolute left-[-6.83px] top-[4.75px] h-[73.898px] w-[180.069px]">
        <div className="absolute inset-[-0.68%_0]">
          <img src={trendLines} alt="" className="block size-full max-w-none" />
        </div>
      </div>
      {trend.map((w, i) => {
        const h = ((w.pct ?? 0) / 100) * full;
        return (
          <div
            key={w.label}
            title={`${w.label}: ${w.pct ?? 0}%`}
            className="absolute w-[15.986px] -translate-x-1/2 rounded-t-[0.912px] bg-[#0e9cff]"
            style={{ left: centers[i], top: baseline - h, height: h }}
          />
        );
      })}
      <div className="absolute left-[-7px] top-[83.47px] flex w-[180.242px] items-center justify-between text-center text-[9px] leading-none text-[#333]">
        {trend.map((w) => (
          <span key={w.label} className="flex-1">
            {w.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export const pct = (n: number | null) => (n === null ? '—' : `${n}%`);
export const ago = (n: number | null) => (n === null ? 'No workout yet' : n === 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`);

export function Row({ label, value, muted, last }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-baseline px-1 pb-[11px] pt-2.5 text-[13px] leading-[18px] text-ink ${last ? '' : 'border-b border-ink/10'}`}>
      <span className="w-[210px] shrink-0">{label}</span>
      <span className={`font-semibold ${muted ? 'text-ink-secondary' : ''}`}>{value}</span>
    </div>
  );
}

export function TrainingTab({ log, today }: { log: TrainingLog; today: string }) {
  const s = summarizeTraining(log, today);
  return (
    <div className="flex w-full flex-col gap-[15px]">
      <div className="flex flex-col overflow-visible rounded-lg border border-ink/15 bg-elevated p-px">
        <CardHeader title="Session log" link="Workout history" />
        <div className="flex flex-col gap-3 pt-4">
          <p className="text-center text-[13px] font-semibold leading-[18px] text-ink">{s.rangeLabel}</p>
          <div className="flex flex-col gap-1 px-10">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase leading-[18px] text-ink-tertiary">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            {s.weeks.map((week) => (
              <div key={week[0].date} className="grid grid-cols-7 gap-1">
                {week.map((cell) => (
                  <Cell key={cell.date} cell={cell} today={today} />
                ))}
              </div>
            ))}
          </div>
          <Legend unassigned={s.weeks.some((w) => w.some((c) => !c.assigned))} />
        </div>
        <div className="flex flex-col p-3">
          <Row label="Last workout" value={ago(s.lastWorkoutDaysAgo)} />
          <Row label="2-week adherence" value={pct(s.adherence2w)} />
          <div className="flex items-center px-1 py-2.5 text-[13px] leading-[18px] text-ink">
            <p className="w-[210px] shrink-0">
              4-week trend
              <br />
              <span className="font-semibold">({pct(s.adherence4w)} adherence)</span>
            </p>
            <TrendChart trend={s.trend} />
          </div>
        </div>
      </div>

      <ProgramCard program={s.program} />
    </div>
  );
}

/** Current program: name · progress · end date · next program (Spec 4 AC4.4). */
export function ProgramCard({ program }: { program: TrainingSummary['program'] }) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-elevated p-px">
      <CardHeader title="Program" link="View program" />
      <div className="flex flex-col p-3">
        <Row label="Name" value={program.name} />
        <Row label="Progress" value={`Week ${program.week} of ${program.weeks}`} />
        <Row label="End Date" value={formatMonthDay(parseDay(program.endsOn))} />
        <Row label="Next Program" value={program.nextProgram ?? 'Not assigned'} muted={!program.nextProgram} last />
      </div>
    </div>
  );
}

/** Program Ending tab (Figma 5671:141541): the current program, with the end date in full. */
export function CurrentProgramCard({ log, today }: { log: TrainingLog; today: string }) {
  const { program } = summarizeTraining(log, today);
  const end = parseDay(program.endsOn);
  const rows: [string, React.ReactNode, boolean?][] = [
    ['Program Name', program.name],
    ['Progress', `Week ${program.week} of ${program.weeks}`],
    ['End date', `${formatMonthDay(end)}, ${end.getUTCFullYear()}`],
    ['Next Program', program.nextProgram ?? 'Not assigned', !program.nextProgram],
  ];
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-ink/15 bg-elevated p-px">
      <CardHeader title="Current Program" link="View program" />
      <div className="flex flex-col px-3 py-1">
        {rows.map(([label, value, muted], i) => (
          <div key={label} className={`flex items-baseline px-1 pb-[11px] pt-2.5 text-[13px] leading-[18px] text-ink ${i < rows.length - 1 ? 'border-b border-ink/10' : ''}`}>
            <span className="w-[180px] shrink-0">{label}</span>
            <span className={`font-semibold ${muted ? 'text-ink-muted' : ''}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
