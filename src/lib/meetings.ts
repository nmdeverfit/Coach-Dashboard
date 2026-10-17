import { getMeetings } from '../data/meetings';
import type { Meeting } from '../data/types';
import { WEEKDAYS } from './checkin';
import { daysBetween, formatMonthDay, parseDay, weekLabel } from './dates';
import { clockSpan } from './todos';
import { weekAsOf } from './week';

/** Every meeting with the client, the demo's plus the ones the coach added, newest first (date, then start time). */
export function meetingsFor(clientId: string, added: Meeting[] = []): Meeting[] {
  return [...added, ...getMeetings(clientId)].sort((a, b) => `${b.date}T${b.start}`.localeCompare(`${a.date}T${a.start}`));
}

export interface MeetingWeek {
  /** Monday, YYYY-MM-DD */
  monday: string;
  /** "Aug 31 - Sep 6", "Aug 24 - Aug 30": the week selector's own label (the design sets it in capitals). */
  label: string;
  meetings: Meeting[];
}

/** The list split into weeks (Monday to Sunday), newest week first, as Notes splits by day. */
export function meetingWeeks(meetings: Meeting[]): MeetingWeek[] {
  const weeks: MeetingWeek[] = [];
  for (const m of meetings) {
    const offset = Math.floor(daysBetween(weekAsOf(0), m.date) / 7);
    const monday = weekAsOf(offset);
    let week = weeks[weeks.length - 1];
    if (week?.monday !== monday) {
      week = { monday, label: weekLabel(weekAsOf(0), offset), meetings: [] };
      weeks.push(week);
    }
    week.meetings.push(m);
  }
  return weeks;
}

/** "Zoom", "Google Meet", "Microsoft Teams", from the meeting link; any other link reads "Meeting link". */
export function platformOf(link: string): string {
  const host = (() => {
    try {
      return new URL(link).hostname;
    } catch {
      return '';
    }
  })();
  if (host.endsWith('zoom.us')) return 'Zoom';
  if (host === 'meet.google.com') return 'Google Meet';
  if (host.endsWith('teams.microsoft.com') || host.endsWith('teams.live.com')) return 'Microsoft Teams';
  return 'Meeting link';
}

/** Accepts a link with or without its scheme ("zoom.us/j/…"). */
export function normalizeLink(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
    return url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

/** "2:00 PM - Aug 27": a list row's start time and date (Figma 5731:517688). */
export const meetingWhen = (m: Meeting) => `${fieldTime(m.start)} - ${formatMonthDay(parseDay(m.date))}`;

/** "2:00 - 3:00pm (60 min)", "11:30am - 12:30pm (60 min)" across noon: the transcript popup's line. */
export const meetingTime = (m: Meeting) => `${clockSpan(m.start, m.minutes)} (${m.minutes} min)`;

/** The form's duration choices, in minutes. */
export const DURATIONS = [15, 30, 45, 60, 90, 120];

/** "HH:MM" plus minutes, as "HH:MM" (same day; the form's durations never cross midnight from a past start). */
export function endOf(start: string, minutes: number) {
  const [h, m] = start.split(':').map(Number);
  const t = h * 60 + m + minutes;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** "Wed, Aug 26, 2026" */
export function meetingDate(iso: string) {
  const d = parseDay(iso);
  return `${WEEKDAYS[d.getUTCDay()]}, ${formatMonthDay(d)}, ${d.getUTCFullYear()}`;
}

/** "Aug 31, 2026", as the Add a meeting form shows its date. */
export function fieldDate(iso: string) {
  const d = parseDay(iso);
  return `${formatMonthDay(d)}, ${d.getUTCFullYear()}`;
}

/** "7:00 AM", as the form shows its time. */
export function fieldTime(hhmm: string) {
  const [hh, m] = hhmm.split(':').map(Number);
  const h = hh % 24;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "18 KB", "2.4 MB" */
export function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const TRANSCRIPT_TYPES = ['.txt', '.docx', '.srt', '.pdf'];
export const TRANSCRIPT_MAX_BYTES = 10 * 1024 * 1024;
