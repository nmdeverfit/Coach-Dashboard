const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

/** Parses YYYY-MM-DD as a UTC date so day math never shifts with the viewer's time zone. */
export const parseDay = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const formatMonthDay = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;

/** "30 Aug": the date format for model-written, coach-facing copy (Spec 4 BL4). */
export const formatDayMonth = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

export const daysBetween = (from: string, to: string) =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / DAY_MS);

/** Age of a carried-over to-do: "Yesterday", otherwise "Aug 27". */
export function ageLabel(raisedOn: string, today: string) {
  return daysBetween(raisedOn, today) === 1 ? 'Yesterday' : formatMonthDay(parseDay(raisedOn));
}

/** Monday-to-Sunday range label for the week `offset` weeks away from `today`. */
export function weekLabel(today: string, offset: number) {
  const d = parseDay(today);
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY_MS + offset * 7 * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return `${formatMonthDay(monday)} - ${formatMonthDay(sunday)}`;
}
