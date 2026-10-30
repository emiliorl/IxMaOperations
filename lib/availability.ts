/**
 * lib/availability.ts
 *
 * Pure slot engine for the native scheduler — no network, no database, no
 * clock reads (callers pass `now`), so every rule is unit-testable
 * (availability.test.ts). Inputs are plain data fetched elsewhere: Google
 * free/busy, per-date overrides from the availability calendar, and the
 * meetings already booked through this site.
 *
 * Everything is epoch milliseconds; wall-clock times ("09:00") are resolved
 * in the host's timezone via lib/tz.ts.
 */
import { DEFAULT_AVAILABILITY, type AvailabilityConfig, type BookingMode } from "./availability-config";
import { addDays, localDate, weekdayOf, zonedTimeToUtc } from "./tz";

export type DayOverride = "IN_PERSON" | "ONLINE_ONLY" | "OFF";

export interface Interval {
  start: number;
  end: number;
}

/** A meeting already booked through this site (pending or confirmed). */
export interface ExistingMeeting extends Interval {
  mode: BookingMode;
  /** When the booking was made — decides who "came first" for the weekly in-person limit. */
  createdAt?: number;
}

export interface SlotQuery {
  mode: BookingMode;
  durationMinutes: number;
  /** Current time, epoch ms. */
  now: number;
  /** Busy periods on the host's Google calendar. */
  hostBusy: Interval[];
  /** Per-date overrides keyed by host-local "YYYY-MM-DD". */
  overrides: Record<string, DayOverride>;
  meetings: ExistingMeeting[];
  config?: AvailabilityConfig;
  /**
   * The weekdays (0 = Sunday ... 6 = Saturday) the client's office is open, when the booking is for a client's
   * office. In-person times exist only on those days, even on a day marked on-site (a client that works from
   * home on Fridays has nobody to meet that day). Absent = no such limit (the public page).
   */
  officeWeekdays?: readonly number[];
}

const MINUTE = 60_000;

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

// ------------------------------------------------------- on-site days & weeks

/** Monday ("YYYY-MM-DD") of the week a calendar date falls in. */
export function weekStartOf(date: string): string {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

/**
 * Host-local dates the owner is (or is committed to be) on-site: any date with
 * an in-person meeting, plus dates marked IN-PERSON on the availability calendar.
 */
export function claimedOnSiteDays(
  meetings: ExistingMeeting[],
  overrides: Record<string, DayOverride>,
  timeZone: string
): Set<string> {
  const claimed = new Set<string>();
  for (const m of meetings) if (m.mode === "in_person") claimed.add(localDate(m.start, timeZone));
  for (const [date, override] of Object.entries(overrides)) if (override === "IN_PERSON") claimed.add(date);
  return claimed;
}

/**
 * The on-site days of one week in the order they were claimed: owner-marked
 * IN-PERSON days first (they were claimed before anyone booked), then
 * booked days by the time their earliest booking was made. This ordering is
 * what makes "first come, first served" deterministic even when two people
 * book at the same moment.
 */
export function onSiteDaysInOrder(
  meetings: ExistingMeeting[],
  overrides: Record<string, DayOverride>,
  timeZone: string,
  week: string
): string[] {
  const inWeek = (date: string) => weekStartOf(date) === week;
  const ordered: string[] = Object.entries(overrides)
    .filter(([date, override]) => override === "IN_PERSON" && inWeek(date))
    .map(([date]) => date)
    .sort();

  const firstBooked = new Map<string, number>();
  for (const m of meetings) {
    if (m.mode !== "in_person") continue;
    const date = localDate(m.start, timeZone);
    if (!inWeek(date) || ordered.includes(date)) continue;
    const at = m.createdAt ?? m.start;
    firstBooked.set(date, Math.min(firstBooked.get(date) ?? Infinity, at));
  }
  const booked = Array.from(firstBooked).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  return [...ordered, ...booked.map(([date]) => date)];
}

/**
 * May this date host in-person meetings, given who has already claimed days
 * that week? A date already among the first `maxInPersonDaysPerWeek` claimed
 * days is fine; a new date is fine only while the week still has room.
 * Always true in "announced" mode (the owner's calendar is the only limit).
 */
export function isWithinWeekLimit(
  date: string,
  meetings: ExistingMeeting[],
  overrides: Record<string, DayOverride>,
  config: AvailabilityConfig = DEFAULT_AVAILABILITY
): boolean {
  if (config.inPersonDayMode !== "first_come") return true;
  const ordered = onSiteDaysInOrder(meetings, overrides, config.hostTimezone, weekStartOf(date));
  const index = ordered.indexOf(date);
  return index === -1 ? ordered.length < config.maxInPersonDaysPerWeek : index < config.maxInPersonDaysPerWeek;
}

export interface DayPolicy {
  online: boolean;
  inPerson: boolean;
  /** True when the owner is on-site this day (drives the lunch rule + hiding online). */
  onSite: boolean;
}

/**
 * Which modes a calendar date offers, after weekday defaults and any
 * override. `claimed` = the date already has an in-person meeting or an
 * IN-PERSON marker. (The weekly first-come limit is applied separately,
 * because it needs the rest of the week.)
 */
export function dayPolicy(
  date: string,
  override: DayOverride | undefined,
  config: AvailabilityConfig = DEFAULT_AVAILABILITY,
  claimed = false
): DayPolicy {
  const weekday = weekdayOf(date);
  const baseOnline = config.online.weekdays.includes(weekday);
  // In "announced" mode a date is in-person only when it is claimed/marked.
  const baseInPerson = config.inPersonDayMode === "first_come" && config.inPerson.weekdays.includes(weekday);

  if (override === "OFF") return { online: false, inPerson: false, onSite: false };
  if (override === "ONLINE_ONLY") return { online: baseOnline, inPerson: false, onSite: false };

  const onSite = claimed || override === "IN_PERSON";
  return {
    online: baseOnline && !(onSite && config.hideOnlineOnOnSiteDays),
    inPerson: onSite || baseInPerson,
    onSite,
  };
}

export interface Slot {
  start: number;
  end: number;
  /** The owner is already on-site (in-person claimed) that day. */
  onSite: boolean;
}

export function generateSlots(query: SlotQuery): Slot[] {
  const config = query.config ?? DEFAULT_AVAILABILITY;
  const tz = config.hostTimezone;
  const rules = query.mode === "online" ? config.online : config.inPerson;
  const duration = query.durationMinutes * MINUTE;
  const buffer = rules.bufferMinutes * MINUTE;
  const earliest = query.now + rules.minNoticeMinutes * MINUTE;
  const step = Math.min(query.durationMinutes, 30) * MINUTE;
  const claimed = claimedOnSiteDays(query.meetings, query.overrides, tz);
  const slots: Slot[] = [];

  const firstDate = localDate(query.now, tz);
  for (let offset = 0; offset <= config.horizonDays; offset++) {
    const date = addDays(firstDate, offset);
    const policy = dayPolicy(date, query.overrides[date], config, claimed.has(date));
    if (query.mode === "online" ? !policy.online : !policy.inPerson) continue;
    if (query.mode === "in_person" && query.officeWeekdays && !query.officeWeekdays.includes(weekdayOf(date))) continue;
    if (query.mode === "in_person" && !isWithinWeekLimit(date, query.meetings, query.overrides, config)) continue;

    const windowStart = zonedTimeToUtc(date, rules.startTime, tz);
    const windowEnd = zonedTimeToUtc(date, rules.endTime, tz);

    const lunch = {
      start: zonedTimeToUtc(date, config.lunch.start, tz),
      end: zonedTimeToUtc(date, config.lunch.end, tz),
    };

    for (let start = windowStart; start + duration <= windowEnd; start += step) {
      if (start < earliest) continue;
      const slot = { start, end: start + duration };
      const padded = { start: start - buffer, end: slot.end + buffer };
      if (query.hostBusy.some((busy) => overlaps(padded, busy))) continue;
      if (query.meetings.some((meeting) => overlaps(padded, meeting))) continue;
      // On a day the owner is at an office, lunch is always theirs: nothing that overlaps it is offered, whatever else is booked.
      if (policy.onSite && overlaps(slot, lunch)) continue;
      // "On-site" marks the day for someone booking: the owner will be at an office. Where the client's own office
      // is closed that day (home office), that would be a promise nobody can keep, so it is not marked.
      const officeOpen = !query.officeWeekdays || query.officeWeekdays.includes(weekdayOf(date));
      slots.push({ ...slot, onSite: claimed.has(date) && officeOpen });
    }
  }
  return slots;
}

/** Authoritative check used at booking time: is this exact start still offered? */
export function isSlotAvailable(query: SlotQuery, startMs: number): boolean {
  const duration = query.durationMinutes * MINUTE;
  return generateSlots(query).some((slot) => slot.start === startMs && slot.end === startMs + duration);
}
