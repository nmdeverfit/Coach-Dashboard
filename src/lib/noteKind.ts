/**
 * Notes timeline trial (the user's call): tells a meeting transcript from a note the coach types, so New note can
 * offer to save it as meeting notes. A meeting note is a note with a transcript; what counts is where the text comes
 * from, never what it is about, so a note about a call stays a note.
 *
 * - `certain`: subtitle timecodes (an .srt or .vtt pasted as text), or speaker lines carrying timestamps.
 * - `likely`: four or more "Name: …" lines from two to six speakers, at least one of them speaking twice. Labels in a
 *   note ("Sleep: …", "Diet: …") rarely repeat, so they don't count on their own.
 */
export interface Detection {
  level: 'certain' | 'likely';
  /** Why, for the line that says what was detected: "subtitle timecodes", "24 lines from Long and Malcom". */
  reason: string;
}

const TIMECODE = /\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}/;
const STAMP = /\[?\(?\b\d{1,2}:\d{2}(?::\d{2})?\b\)?\]?/;
/** "[00:12] Long:", "Long (04:12):", "Malcom:" at the start of a line. */
const SPEAKER = /^\s*(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?([A-Z][\w'.-]*(?: [A-Z][\w'.-]*)?)\s*(\(\d{1,2}:\d{2}(?::\d{2})?\))?\s*:\s+\S/;

const names = (list: string[]) => (list.length <= 2 ? list.join(' and ') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

export function detectTranscript(text: string): Detection | null {
  if (/^\s*WEBVTT/.test(text) || TIMECODE.test(text)) return { level: 'certain', reason: 'subtitle timecodes' };
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const said = new Map<string, number>();
  let stamped = 0;
  let spoken = 0;
  for (const l of lines) {
    const m = l.match(SPEAKER);
    if (!m) continue;
    spoken++;
    said.set(m[1], (said.get(m[1]) ?? 0) + 1);
    if (m[2] || STAMP.test(l.slice(0, 12))) stamped++;
  }
  const speakers = [...said.keys()];
  if (spoken < 4 || speakers.length < 2 || speakers.length > 6 || Math.max(...said.values()) < 2) return null;
  const reason = `${spoken} lines from ${names(speakers)}`;
  return { level: stamped >= 3 ? 'certain' : 'likely', reason };
}

/** A note's HTML as plain lines (paragraphs and list items on their own line), for a transcript made from it. */
export const htmlToText = (html: string) => {
  // A line break before and after every block, so words typed before the first paragraph keep their own line.
  const lined = html.replace(/<(p|li|div)[\s>]/gi, '\n$&').replace(/<\/(p|li|div)>|<br\s*\/?>/gi, '$&\n');
  const doc = new DOMParser().parseFromString(`<body>${lined}</body>`, 'text/html');
  return (doc.body.textContent ?? '').replace(/\n{2,}/g, '\n').trim();
};

/** Plain lines as a note's paragraphs. */
export const textToHtml = (text: string) =>
  text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('');

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
