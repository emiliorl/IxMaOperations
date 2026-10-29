import { weekStartOf } from "@/lib/availability";
import { addDays, localDate, weekdayOf, zonedTimeToUtc } from "@/lib/tz";

/**
 * Pure helpers for the project log page: which kind of change an event is,
 * the filters people can pick, and week boundaries. No I/O.
 *
 * Categories (what you asked to be able to filter by):
 *   progress  a plan item's status changed (the project moved forward, or back)
 *   opened    a ticket was opened
 *   solved    a ticket was marked resolved or closed
 *   activity  everything else (a ticket moving to "in progress", a new comment)
 */
export type LogCategory = "progress" | "opened" | "solved" | "activity";
export type LogFilter = "all" | "progress" | "opened" | "solved";

export const LOG_FILTERS: LogFilter[] = ["all", "progress", "opened", "solved"];

export interface LogEvent {
  id: string;
  kind: "ticket_opened" | "ticket_status" | "plan_status" | "comment_added";
  ticketId: string | null;
  milestoneId: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  actorId: string | null;
  createdAt: string;
}

const SOLVED_STATUSES = new Set(["resolved", "closed"]);

export function categoryOf(event: Pick<LogEvent, "kind" | "toStatus">): LogCategory {
  switch (event.kind) {
    case "plan_status":
      return "progress";
    case "ticket_opened":
      return "opened";
    case "ticket_status":
      return event.toStatus && SOLVED_STATUSES.has(event.toStatus) ? "solved" : "activity";
    default:
      return "activity";
  }
}

export function filterEvents<T extends Pick<LogEvent, "kind" | "toStatus">>(events: T[], filter: LogFilter): T[] {
  return filter === "all" ? events : events.filter((event) => categoryOf(event) === filter);
}

/** The numbers shown on the filter chips. */
export function summarize(events: Pick<LogEvent, "kind" | "toStatus">[]): Record<Exclude<LogCategory, "activity">, number> {
  const counts = { progress: 0, opened: 0, solved: 0 };
  for (const event of events) {
    const category = categoryOf(event);
    if (category !== "activity") counts[category]++;
  }
  return counts;
}

export function parseFilter(value: string | undefined): LogFilter {
  return LOG_FILTERS.includes(value as LogFilter) ? (value as LogFilter) : "all";
}

// --------------------------------------------------------------------- weeks

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** [from, to) of a Monday-to-Sunday week in the given timezone, as epoch ms. */
export function weekRange(monday: string, timeZone: string): { from: number; to: number } {
  return { from: zonedTimeToUtc(monday, "00:00", timeZone), to: zonedTimeToUtc(addDays(monday, 7), "00:00", timeZone) };
}

/** The Mondays of the last `count` weeks (this week first). */
export function recentWeeks(now: number, timeZone: string, count = 8): string[] {
  const thisMonday = weekStartOf(localDate(now, timeZone));
  return Array.from({ length: count }, (_, i) => addDays(thisMonday, -7 * i));
}

/**
 * The week the page should show: "all" for everything, a specific Monday, or —
 * when the parameter is missing or not a real Monday — the current week.
 */
export function parseWeek(value: string | undefined, now: number, timeZone: string): "all" | string {
  if (value === "all") return "all";
  if (value && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && weekdayOf(value) === 1) return value;
  return weekStartOf(localDate(now, timeZone));
}
