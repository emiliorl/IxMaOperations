/**
 * lib/tz.ts
 *
 * Minimal IANA-timezone helpers on top of Intl (no date library). The
 * scheduler works in epoch milliseconds everywhere and only converts to/from
 * "wall clock in a named zone" at the edges, which is what keeps DST changes
 * from corrupting slot math. Always pass IANA names ("America/Mexico_City"),
 * never abbreviations like "CST" — those are ambiguous.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock parts of an instant in a zone. */
function partsInZone(utcMs: number, timeZone: string) {
  const parts = formatter(timeZone).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === 24 ? 0 : get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `timeZone` from UTC at an instant, in ms (positive = ahead of UTC). */
export function tzOffsetMs(utcMs: number, timeZone: string): number {
  const p = partsInZone(utcMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Epoch ms of a wall-clock date ("YYYY-MM-DD") and time ("HH:mm") in a zone. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const firstOffset = tzOffsetMs(guess, timeZone);
  let result = guess - firstOffset;
  // If the offset at the resulting instant differs (we crossed a DST edge),
  // correct once using the offset that actually applies there.
  const secondOffset = tzOffsetMs(result, timeZone);
  if (secondOffset !== firstOffset) result = guess - secondOffset;
  return result;
}

/** The calendar date ("YYYY-MM-DD") an instant falls on in a zone. */
export function localDate(utcMs: number, timeZone: string): string {
  const p = partsInZone(utcMs, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Day of week (0 = Sunday) of a "YYYY-MM-DD" calendar date. Zone-independent. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}
