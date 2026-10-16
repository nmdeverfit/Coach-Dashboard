import iconHabitDone from '../../assets/figma/icon-habit-done.svg';
import iconHabitMissed from '../../assets/figma/icon-habit-missed.svg';
import dot from '../../assets/figma/dot-drawer.svg';
import type { Client, ClientProfile } from '../../data/types';
import { buildHabits, buildTasks, type HabitRow, type TaskStatus } from '../../lib/client';
import { formatMonthDay, parseDay } from '../../lib/dates';
import { useStore } from '../../state/store';
import { CardHeader } from './NutritionTab';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TASK_TONE: Record<TaskStatus['tone'], string> = {
  done: 'text-[#059669]',
  short: 'text-status-risk-fg',
  none: 'text-ink-muted',
};

/** Habit day circles from the Task & Habit frame (5671:141271). */
const DAY: Record<HabitRow['days'][number]['state'], { circle: string; label: string }> = {
  done: { circle: 'border border-[#226042]/20 bg-[#059669]/10', label: 'text-[#059669]' },
  missed: { circle: 'border border-[#f03358]/10 bg-[#fef2f2]', label: 'text-status-risk-fg' },
  open: { circle: 'border-[1.077px] border-brand/10 bg-white', label: 'text-ink-tertiary' },
};

function HabitItem({ row, client, last }: { row: HabitRow; client: Client; last: boolean }) {
  const { showToast } = useStore();
  const { habit, days, streak, unit } = row;
  const celebrate = unit === 'day' && streak >= 5;
  return (
    <div className={`flex items-center justify-between gap-3 px-1 pb-[11px] pt-2.5 ${last ? '' : 'border-b border-ink/10'}`}>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-semibold leading-[18px] text-ink">{habit.name}</p>
          <p className="flex items-center gap-2 text-[13px] leading-[18px]">
            <span className="text-ink/60">{habit.frequency === 'daily' ? 'Daily' : `${habit.perWeek}× a week`}</span>
            <img src={dot} alt="" width={4} height={4} />
            {streak > 0 ? (
              <span className="flex items-center gap-1 font-semibold text-orange">
                <span className="text-[16px] leading-[18px]">🔥</span>
                {streak}-{unit} streak
              </span>
            ) : (
              <span className="font-semibold text-status-risk-fg">0-{unit} streak</span>
            )}
          </p>
        </div>
        {celebrate && (
          <button
            type="button"
            onClick={() => showToast(`A message celebrating ${client.firstName}’s ${streak}-day streak opens beside this panel`)}
            className="flex h-8 items-center gap-2 rounded-md border border-ink/15 bg-white px-[17px] text-[12px] font-semibold text-ink shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:bg-surface-secondary"
          >
            <span className="text-[18px] leading-none">🎉</span>
            Celebrate {streak}-day streak
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-1">
        {days.map((d, i) => {
          const s = DAY[d.state];
          return (
            <div key={d.date} title={`${WEEKDAYS[i]}, ${formatMonthDay(parseDay(d.date))}`} className="flex flex-col items-center gap-0.5">
              <span className={`flex size-7 items-center justify-center rounded-full ${s.circle}`}>
                {d.state === 'done' && <img src={iconHabitDone} alt="" width={14} height={14} />}
                {d.state === 'missed' && <img src={iconHabitMissed} alt="" width={14} height={14} />}
                {d.state === 'open' && <span className="text-[9.692px] font-bold leading-[14.538px] text-ink-muted">–</span>}
              </span>
              <span className={`text-[9px] font-semibold uppercase leading-[13.5px] ${s.label}`}>{WEEKDAYS[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Task & Habit tab (Figma 5671:141271). The demo's "today" is a Monday morning, when nothing this week is due yet,
 * so both cards read last week; every status is derived from the profile's logs and forms.
 */
export function TaskHabitTab({ client, profile, today }: { client: Client; profile: ClientProfile; today: string }) {
  const tasks = buildTasks(profile, today);
  const habits = buildHabits(profile, today);
  const range = `${formatMonthDay(parseDay(tasks.range.start))} - ${parseDay(tasks.range.end).getUTCDate()}`;
  const allDone = tasks.done === tasks.rows.length;
  return (
    <div className="flex w-full flex-col gap-[15px]">
      <div className="flex flex-col overflow-hidden rounded-lg border border-ink/15 bg-elevated p-px">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              Tasks last week
              <img src={dot} alt="" width={4} height={4} />
              <span className={`text-[12px] font-semibold ${allDone ? 'text-[#059669]' : 'text-ink-secondary'}`}>
                Done {tasks.done} of {tasks.rows.length}
              </span>
            </span>
          }
          titleHint={range}
          link="View tasks"
        />
        <div className="flex flex-col px-3 py-1">
          {tasks.rows.map((t, i) => (
            <div key={`${t.name}-${i}`} className={`flex items-center justify-between px-1 pb-[11px] pt-2.5 ${i < tasks.rows.length - 1 ? 'border-b border-ink/10' : ''}`}>
              <div className="flex flex-col gap-1 text-[13px] leading-[18px] text-ink">
                <span className="font-semibold">{t.name}</span>
                <span className="opacity-60">{t.when}</span>
              </div>
              <span className={`text-[13px] font-semibold leading-[18px] ${TASK_TONE[t.status.tone]}`}>{t.status.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-lg border border-ink/10 bg-elevated p-px shadow-card">
        <CardHeader title="Habits" titleHint={range} link="View habits" />
        <div className="flex flex-col px-3 py-1">
          {habits.length ? (
            habits.map((h, i) => <HabitItem key={h.habit.name} row={h} client={client} last={i === habits.length - 1} />)
          ) : (
            <p className="px-1 py-6 text-center text-[13px] text-ink-secondary">No habits assigned.</p>
          )}
        </div>
      </div>
    </div>
  );
}
