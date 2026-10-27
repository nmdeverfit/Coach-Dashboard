/**
 * Notes timeline trial (the user's call): the meeting name New note suggests from an uploaded transcript. Nothing here
 * tells a transcript from a note: the team can't detect one yet, so the coach picks the kind.
 */

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
