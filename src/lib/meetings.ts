import { getMeetings } from '../data/meetings';
import type { Meeting } from '../data/types';
import { WEEKDAYS } from './checkin';
import { formatMonthDay, parseDay } from './dates';
import { clockSpan, time12 } from './todos';

/** The Transcript tab's list: the demo's meetings plus the ones the coach added, newest first. */
export function meetingsFor(clientId: string, added: Meeting[] = []): Meeting[] {
  return [...added, ...getMeetings(clientId)].sort((a, b) => `${b.date}T${b.start}`.localeCompare(`${a.date}T${a.start}`));
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

/** "2:00 - 3:00pm (60 min)", or just "7:00am" when the coach added the meeting without an end time. */
export const meetingTime = (m: Meeting) => (m.minutes ? `${clockSpan(m.start, m.minutes)} (${m.minutes} min)` : time12(m.start));

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
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "18 KB", "2.4 MB" */
export function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const TRANSCRIPT_TYPES = ['.txt', '.docx', '.srt', '.pdf'];
export const TRANSCRIPT_MAX_BYTES = 10 * 1024 * 1024;
