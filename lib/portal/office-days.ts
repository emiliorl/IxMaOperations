/**
 * The weekdays a client's office is open for visits (0 = Sunday ... 6 = Saturday). Pure.
 *
 * Some clients work from home on certain days; an in-person meeting at their office then would mean visiting
 * an empty office, so each project says which days its office is open. Without anything stored (a project
 * from before this existed, or a database that hasn't had the migration yet) it is Monday to Friday.
 */

export const DEFAULT_OFFICE_DAYS: readonly number[] = [1, 2, 3, 4, 5];

/** The days a form or the database gave, as a clean sorted list of distinct weekdays 0–6. Anything unusable is dropped. */
export function normalizeOfficeDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_OFFICE_DAYS];
  const days = value.map((day) => (typeof day === "string" ? Number(day) : day)).filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6);
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

/** The days ticked on the owner's form (the weekdays offered there are Monday to Friday). Nothing ticked is allowed: online only. */
export function officeDaysFromForm(values: FormDataEntryValue[]): number[] {
  return normalizeOfficeDays(values.filter((v): v is string => typeof v === "string")).filter((day) => day >= 1 && day <= 5);
}

/** May a calendar date ("YYYY-MM-DD") host a visit at an office open on these days? */
export function isOfficeDay(date: string, days: readonly number[]): boolean {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return days.includes(weekday);
}

/**
 * The days in words, in the viewer's language: "Monday–Thursday" for a run, a list otherwise
 * ("Monday, Wednesday and Friday"), "no days" for none.
 */
export function describeOfficeDays(days: readonly number[], locale: string, none: string): string {
  const sorted = normalizeOfficeDays([...days]);
  if (sorted.length === 0) return none;
  // 2024-01-07 was a Sunday, so day 0 maps to it.
  const name = (day: number) => new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(Date.UTC(2024, 0, 7 + day));
  const isRun = sorted.length > 2 && sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1);
  if (isRun) return `${name(sorted[0])}–${name(sorted[sorted.length - 1])}`;
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(sorted.map(name));
}
