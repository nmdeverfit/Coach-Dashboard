/**
 * Notes timeline trial (the user's call): what the meeting notes form says about an attached transcript (its lines,
 * speakers and length) and the meeting name it suggests. Nothing here tells a transcript from a note: the team can't
 * detect one yet, so the coach picks the kind.
 */

/** "[00:12] Long:", "Long (04:12):", "Malcom:" at the start of a line. */
const SPEAKER = /^\s*(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?([A-Z][\w'.-]*(?: [A-Z][\w'.-]*)?)\s*(\(\d{1,2}:\d{2}(?::\d{2})?\))?\s*:\s+\S/;

const names = (list: string[]) => (list.length <= 2 ? list.join(' and ') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

export interface TranscriptStats {
  lines: number;
  /** Who speaks, in the order they first do. */
  speakers: string[];
  /** From the last timestamp, rounded up; unset when the text carries none. */
  minutes?: number;
}

const toSeconds = (h: string | undefined, m: string, s: string | undefined) => (h ? Number(h) * 3600 : 0) + Number(m) * 60 + Number(s ?? 0);

/** What the transcript card's line says about the text: "60 lines · Long and Malcom · ~30 min". */
export function transcriptStats(text: string): TranscriptStats {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const speakers: string[] = [];
  let last = 0;
  for (const l of lines) {
    const who = l.match(SPEAKER)?.[1];
    if (who && !speakers.includes(who)) speakers.push(who);
    // "Long (29:40):", "[00:29:40]" or an SRT cue's end, near the start of the line.
    const cue = l.match(/-->\s*(\d{1,2}):(\d{2}):(\d{2})/);
    const stamp = l.slice(0, 24).match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/);
    if (cue) last = Math.max(last, toSeconds(cue[1], cue[2], cue[3]));
    else if (stamp) last = Math.max(last, stamp[1] ? toSeconds(stamp[1], stamp[2], stamp[3]) : toSeconds(undefined, stamp[2], stamp[3]));
  }
  // Labels that speak once ("Sleep:") are not people; a call has two to six.
  const people = speakers.filter((s) => lines.filter((l) => l.match(SPEAKER)?.[1] === s).length > 1);
  return { lines: lines.length, speakers: people.length >= 2 && people.length <= 6 ? people : [], minutes: last ? Math.ceil(last / 60) : undefined };
}

export const statsLine = (s: TranscriptStats) =>
  [`${s.lines} line${s.lines === 1 ? '' : 's'}`, s.speakers.length ? names(s.speakers) : '', s.minutes ? `~${s.minutes} min` : ''].filter(Boolean).join(' · ');

/**
 * A name for the meeting from its transcript: a heading on the first line ("Monthly check-in call: Long and Malcom
 * (30 min)" → "Monthly check-in call"), else the file's name ("call-with-malcom.txt" → "Call with malcom").
 */
export function titleFrom(text: string | undefined, fileName?: string): string | undefined {
  const first = text?.split(/\r?\n/).find((l) => l.trim())?.trim();
  if (first && !/\d{1,2}:\d{2}/.test(first)) {
    const head = first.split(':')[0].replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (head.split(/\s+/).length >= 2 && head.length <= 60) return head;
  }
  if (!fileName) return undefined;
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return base ? base[0].toUpperCase() + base.slice(1) : undefined;
}
