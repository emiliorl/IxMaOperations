/**
 * lib/onsite.ts
 *
 * Pure analysis of an on-site day: is the trip worth it, or should you
 * adjust? Used for the owner's alerts (a note in each in-person booking email
 * and the daily digest, app/api/cron/onsite-digest). No I/O here.
 *
 * Three things are flagged:
 *  - single:    only one in-person meeting that day.
 *  - gap:       two consecutive meetings far apart (e.g. 10:00 and 14:30).
 *  - locations: meetings that day are at different addresses.
 * For a gap, it also suggests the earliest time the later meeting could move
 * to — right after the first one, never inside the protected lunch hour.
 */
import { DEFAULT_AVAILABILITY, type AvailabilityConfig } from "./availability-config";
import { localDate, zonedTimeToUtc } from "./tz";

const MINUTE = 60_000;
const STEP = 30 * MINUTE;

export interface OnSiteMeeting {
  start: number;
  end: number;
  location?: string | null;
  guestName?: string;
}

export type OnSiteIssue =
  | { type: "single" }
  | { type: "gap"; minutes: number; afterIndex: number }
  | { type: "locations"; count: number };

const normalizeAddress = (address: string) =>
  address
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** `meetings` are one host-local day's in-person meetings, in any order. */
export function analyzeOnSiteDay(meetings: OnSiteMeeting[], config: AvailabilityConfig = DEFAULT_AVAILABILITY): OnSiteIssue[] {
  if (meetings.length === 0) return [];
  const sorted = [...meetings].sort((a, b) => a.start - b.start);
  const issues: OnSiteIssue[] = [];

  if (sorted.length === 1) issues.push({ type: "single" });

  for (let i = 0; i < sorted.length - 1; i++) {
    const minutes = Math.round((sorted[i + 1].start - sorted[i].end) / MINUTE);
    if (minutes >= config.onSite.sparseGapMinutes) issues.push({ type: "gap", minutes, afterIndex: i });
  }

  const addresses = new Set(sorted.map((m) => m.location).filter((l): l is string => Boolean(l)).map(normalizeAddress));
  if (addresses.size > 1) issues.push({ type: "locations", count: addresses.size });

  return issues;
}

/**
 * Earliest start (on the 30-minute grid) the later meeting of a gap could move
 * to: after the earlier meeting plus its buffer, skipping the lunch window if
 * that would land inside it. Null when that isn't actually earlier.
 */
export function suggestCloserStart(
  meetings: OnSiteMeeting[],
  afterIndex: number,
  config: AvailabilityConfig = DEFAULT_AVAILABILITY
): { meetingIndex: number; newStart: number } | null {
  const sorted = [...meetings].sort((a, b) => a.start - b.start);
  const first = sorted[afterIndex];
  const second = sorted[afterIndex + 1];
  if (!first || !second) return null;

  const tz = config.hostTimezone;
  const date = localDate(first.start, tz);
  const base = zonedTimeToUtc(date, "00:00", tz);
  const duration = second.end - second.start;
  const lunchStart = zonedTimeToUtc(date, config.lunch.start, tz);
  const lunchEnd = zonedTimeToUtc(date, config.lunch.end, tz);

  const earliest = first.end + config.inPerson.bufferMinutes * MINUTE;
  let candidate = base + Math.ceil((earliest - base) / STEP) * STEP;
  // Never suggest a time that eats the protected lunch hour.
  if (candidate < lunchEnd && candidate + duration > lunchStart) candidate = lunchEnd;

  if (candidate >= second.start) return null;
  if (candidate + duration > zonedTimeToUtc(date, config.inPerson.endTime, tz)) return null;
  return { meetingIndex: afterIndex + 1, newStart: candidate };
}

function clock(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(ms);
}

function duration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
}

/** Human-readable (English) lines for the owner's email. Empty when nothing is flagged. */
export function describeOnSiteDay(
  date: string,
  meetings: OnSiteMeeting[],
  issues: OnSiteIssue[],
  config: AvailabilityConfig = DEFAULT_AVAILABILITY
): string[] {
  if (issues.length === 0) return [];
  const tz = config.hostTimezone;
  const sorted = [...meetings].sort((a, b) => a.start - b.start);
  const dayLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(
    Date.parse(`${date}T12:00:00Z`)
  );
  const slotLabel = (m: OnSiteMeeting) => `${clock(m.start, tz)}–${clock(m.end, tz)}${m.guestName ? ` (${m.guestName})` : ""}`;
  const lines: string[] = [`On-site day: ${dayLabel}`];

  for (const issue of issues) {
    if (issue.type === "single") {
      lines.push(
        `  • Only one in-person meeting so far: ${slotLabel(sorted[0])}. You can stay at their office and work from there, or leave the day open for more bookings.`
      );
    } else if (issue.type === "gap") {
      const before = sorted[issue.afterIndex];
      const after = sorted[issue.afterIndex + 1];
      lines.push(
        `  • ${duration(issue.minutes)} gap between ${slotLabel(before)} and ${slotLabel(after)}. You can stay and work from their office in between,`
      );
      const suggestion = suggestCloserStart(sorted, issue.afterIndex, config);
      lines.push(
        suggestion
          ? `    or ask ${after.guestName ?? "the second guest"} to move to ${clock(suggestion.newStart, tz)}, right after the first meeting.`
          : `    or ask one of them to move closer together.`
      );
    } else {
      lines.push(
        `  • These meetings are at ${issue.count} different addresses, so you can't be at both. Ask one of them to move to another day.`
      );
    }
  }
  return lines;
}
