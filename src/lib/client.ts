import type { CheckinDetail, Client, ClientNote, ClientProfile, ClientTask, Habit } from '../data/types';
import { todoDetails } from '../data/details';
import { DEMO_TODAY, generatedStatus } from '../data/mock';
import { WEEKDAYS, addDays, buildCheckinView, summarizeNutrition, type Assessment } from './checkin';
import { formatDayMonth, formatMonthDay, parseDay } from './dates';
import { noteStamp, noteText } from './notes';
import type { FormStatusRow } from './todos';
import { summarizeTraining } from './training';

/**
 * Everything the client detail page and the data tabs show, computed from one ClientProfile (AC4): the assessment,
 * the Task & Habit rows, the Form Status rows and the grouped notes.
 */

const mondayOf = (iso: string) => addDays(iso, -((parseDay(iso).getUTCDay() + 6) % 7));
const weekdayDate = (iso: string) => `${WEEKDAYS[parseDay(iso).getUTCDay()]} ${formatDayMonth(parseDay(iso))}`;
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
const num = (n: number) => Math.round(n).toLocaleString('en-US');

// ---------------------------------------------------------------- Forms

export function formRows(profile: ClientProfile, today: string): FormStatusRow[] {
  return profile.forms.map((f) => ({ ...f, status: f.overdueSince && f.overdueSince < today ? 'overdue' : 'submitted' }));
}

// ---------------------------------------------------------------- Assessment

/**
 * The client's AI assessment: one summary with main_signal tagged, then up to 3 facts. Clint's is his Check-in
 * panel's, word for word, so the two surfaces never differ.
 */
export function buildClientAssessment(client: Client, profile: ClientProfile, today: string): Assessment {
  // Clint's current week is his Check-in panel's, word for word; past weeks are computed like everyone's.
  if (client.id === 'clint-jacobi' && today === DEMO_TODAY) return buildCheckinView(todoDetails.t3 as CheckinDetail, today).assessment;

  const n = summarizeNutrition(profile.nutrition, today);
  const t = summarizeTraining(profile.training, today);
  // The assessment is the 06:00 generation's: a coach's status change does not rewrite it.
  const status = generatedStatus(client);
  const tone = status === 'at_risk' ? 'are poor' : status === 'needs_attention' ? 'are slipping' : 'are steady';
  // A shortfall only belongs in the summary when the status is a concern.
  const showGap = status === 'at_risk' || status === 'needs_attention';

  const nutritionFact =
    n.daysLogged === 0
      ? `Nothing logged in the last 7 days (${dayRange(n.window.start, n.window.end)}).`
      : `Meals logged on ${days(n.daysLogged)} of 7, averaging ${num(n.avgCalories)} of ${num(n.targetCalories)} kcal.`;
  const trainingFact =
    t.adherence2w === null
      ? 'No workouts scheduled in the last 2 weeks.'
      : `Completed ${t.adherence2w}% of assigned workouts over the last 2 weeks${
          t.lastWorkoutDaysAgo === null ? '' : `; last workout ${t.lastWorkoutDaysAgo === 1 ? 'yesterday' : `${t.lastWorkoutDaysAgo} days ago`}`
        }.`;
  const overdue = formRows(profile, today).find((r) => r.status === 'overdue');
  const formFact = overdue
    ? `The ${overdue.name} form due ${weekdayDate(overdue.overdueSince!)} has not been submitted.`
    : profile.forms[0]?.lastSubmittedOn
      ? `The ${profile.forms[0].name} form came in on ${weekdayDate(profile.forms[0].lastSubmittedOn)}.`
      : null;

  const headline =
    profile.focus === 'nutrition'
      ? {
          before: 'Current',
          signal: 'nutrition',
          after:
            n.daysLogged === 0
              ? `signals ${tone}: nothing logged in the last 7 days.`
              : `signals ${tone}: meals logged on ${days(n.daysLogged)} of the last 7${
                  showGap && n.calorieGap > 0 ? `, ${num(n.calorieGap)} kcal under target` : ''
                }.`,
        }
      : {
          before: 'Current',
          signal: 'training',
          after: t.adherence2w === null ? `signals ${tone}: no workouts scheduled.` : `signals ${tone}: ${t.adherence2w}% of assigned workouts done in 2 weeks.`,
        };

  const facts = profile.focus === 'nutrition' ? [nutritionFact, trainingFact] : [trainingFact, nutritionFact];
  return { headline, bullets: [...facts, ...(formFact ? [formFact] : [])].slice(0, 3) };
}

function dayRange(from: string, to: string) {
  const a = parseDay(from);
  const b = parseDay(to);
  return a.getUTCMonth() === b.getUTCMonth() ? `${a.getUTCDate()}–${formatDayMonth(b)}` : `${formatDayMonth(a)} – ${formatDayMonth(b)}`;
}

// ---------------------------------------------------------------- Tasks

export type TaskStatus = { label: string; tone: 'done' | 'short' | 'none' };

export interface TaskRow {
  name: string;
  /** "Mon, Aug 24 - 7:00 AM" */
  when: string;
  status: TaskStatus;
}

const clock12 = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Last week's tasks (the demo's "today" is a Monday, so this week has none due yet). */
export function buildTasks(profile: ClientProfile, today: string): { rows: TaskRow[]; done: number; range: { start: string; end: string } } {
  const start = addDays(mondayOf(today), -7);
  const end = addDays(start, 6);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const row = (t: ClientTask): TaskRow | null => {
    const d = parseDay(t.dueOn);
    const when = `${WEEKDAYS[d.getUTCDay()]}, ${formatMonthDay(d)}${'time' in t && t.time ? ` - ${clock12(t.time)}` : ''}`;
    switch (t.kind) {
      case 'log_meals': {
        const logged = week.filter((date) => Object.values(profile.nutrition.days[date] ?? {}).some((f) => f && f.length)).length;
        const status: TaskStatus = logged === 7 ? { label: 'Done', tone: 'done' } : logged === 0 ? { label: 'Not logged', tone: 'none' } : { label: `${logged} of 7`, tone: 'short' };
        return { name: 'Log meals daily', when, status };
      }
      case 'workouts': {
        const workouts = week.flatMap((date) => {
          const day = profile.training.days[date];
          return day?.kind === 'workout' ? day.workouts : [];
        });
        if (!workouts.length) return null;
        const complete = workouts.filter((w) => w.done).length;
        const status: TaskStatus =
          complete === workouts.length ? { label: 'Done', tone: 'done' } : { label: `${complete} of ${workouts.length}`, tone: complete ? 'short' : 'none' };
        return { name: `Complete ${workouts.length} workouts`, when, status };
      }
      case 'checkin_form': {
        const form = profile.forms.find((f) => f.name === 'Weekly Check-in');
        if (!form) return null;
        const status: TaskStatus =
          form.overdueSince && form.overdueSince <= end
            ? { label: 'Overdue', tone: 'short' }
            : form.lastSubmittedOn && form.lastSubmittedOn >= start
              ? { label: 'Done', tone: 'done' }
              : { label: 'Not submitted', tone: 'none' };
        return { name: 'Submit weekly check-in form', when, status };
      }
      case 'custom':
        return { name: t.name, when, status: t.done ? { label: 'Done', tone: 'done' } : { label: 'Not done', tone: 'none' } };
    }
  };

  const rows = [...profile.tasks]
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .map(row)
    .filter((r): r is TaskRow => r !== null);
  return { rows, done: rows.filter((r) => r.status.tone === 'done').length, range: { start, end } };
}

// ---------------------------------------------------------------- Habits

export interface HabitRow {
  habit: Habit;
  /** Last week, Monday first. */
  days: { date: string; state: 'done' | 'missed' | 'open' }[];
  streak: number;
  /** "day" for daily habits, "week" for weekly ones. */
  unit: 'day' | 'week';
}

export function buildHabits(profile: ClientProfile, today: string): HabitRow[] {
  const start = addDays(mondayOf(today), -7);
  return profile.habits.map((habit) => {
    const done = new Set(habit.doneOn);
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return { date, state: done.has(date) ? ('done' as const) : habit.frequency === 'daily' ? ('missed' as const) : ('open' as const) };
    });
    let streak = 0;
    if (habit.frequency === 'daily') {
      for (let d = addDays(today, -1); done.has(d); d = addDays(d, -1)) streak += 1;
    } else {
      // Weeks in a row, ending last week, with at least `perWeek` ticks.
      for (let monday = start; ; monday = addDays(monday, -7)) {
        const ticks = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => done.has(d)).length;
        if (ticks < (habit.perWeek ?? 1)) break;
        streak += 1;
      }
    }
    return { habit, days, streak, unit: habit.frequency === 'daily' ? 'day' : 'week' };
  });
}

// ---------------------------------------------------------------- Notes

export interface NoteGroup {
  date: string;
  notes: (ClientNote & { label: string })[];
}

/** Notes grouped by day; `newestFirst` orders both the groups and the notes in them. */
export function groupNotes(notes: ClientNote[], newestFirst: boolean, query = ''): NoteGroup[] {
  const q = query.trim().toLowerCase();
  const sorted = [...notes]
    .filter((n) => !q || n.title.toLowerCase().includes(q) || noteText(n.body).toLowerCase().includes(q))
    .sort((a, b) => (newestFirst ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)));
  const groups: NoteGroup[] = [];
  for (const n of sorted) {
    const date = n.at.slice(0, 10);
    const label = noteStamp(n.at);
    const last = groups[groups.length - 1];
    if (last?.date === date) last.notes.push({ ...n, label });
    else groups.push({ date, notes: [{ ...n, label }] });
  }
  return groups;
}
