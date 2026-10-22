import { getMeetings } from '../data/meetings';
import type { Meeting } from '../data/types';
import { WEEKDAYS } from './checkin';
import { daysBetween, formatMonthDay, parseDay, weekLabel } from './dates';
import { weekAsOf } from './week';

/** When a meeting joined the list: a recorded call when it started, one the coach added when it was added. */
export const createdAt = (m: Meeting) => m.createdAt ?? `${m.date}T${m.start}`;

/**
 * Every meeting with the client, the demo's plus the ones the coach added, newest created first (the user's call). The
 * coach's own come first among equals, the latest added on top, since the store keeps them newest first.
 */
export function meetingsFor(clientId: string, added: Meeting[] = []): Meeting[] {
  return [...added, ...getMeetings(clientId)].sort((a, b) => createdAt(b).localeCompare(createdAt(a)));
}

export interface MeetingWeek {
  /** Monday, YYYY-MM-DD */
  monday: string;
  /** "Aug 31 - Sep 6", "Aug 24 - Aug 30": the week selector's own label (the design sets it in capitals). */
  label: string;
  meetings: Meeting[];
}

/** The list split into the weeks the meetings were created in (Monday to Sunday), newest first, as Notes splits by day. */
export function meetingWeeks(meetings: Meeting[]): MeetingWeek[] {
  const weeks: MeetingWeek[] = [];
  for (const m of meetings) {
    const offset = Math.floor(daysBetween(weekAsOf(0), createdAt(m).slice(0, 10)) / 7);
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

/** "2:00 PM - Aug 27": a list row's start time and date (Figma 5731:517688). */
export const meetingWhen = (m: Meeting) => `${fieldTime(m.start)} - ${formatMonthDay(parseDay(m.date))}`;

/** "Wed, Aug 26, 2026" */
export function meetingDate(iso: string) {
  const d = parseDay(iso);
  return `${WEEKDAYS[d.getUTCDay()]}, ${formatMonthDay(d)}, ${d.getUTCFullYear()}`;
}

/** "7:00 AM", as the time picker and the meeting popup show a time. */
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
