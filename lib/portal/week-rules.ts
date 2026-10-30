/**
 * The owner's "this week" view: the pure rules. A person's week is the next seven days starting today, on THEIR clock.
 */
import { addDays, localDate, zonedTimeToUtc } from "../tz";

export const WEEK_DAYS = 7;

/** From the start of today to the start of the day after the week ends (today + 7 days), as instants, on this clock. */
export function weekWindow(now: number, timeZone: string, days = WEEK_DAYS): { from: number; to: number; firstDate: string; lastDate: string } {
  const today = localDate(now, timeZone);
  return {
    from: zonedTimeToUtc(today, "00:00", timeZone),
    to: zonedTimeToUtc(addDays(today, days), "00:00", timeZone),
    firstDate: today,
    lastDate: addDays(today, days - 1),
  };
}

/** Groups things by the calendar day they start on, on this clock: days in order, each day's items in time order. Days with nothing are left out. */
export function groupByLocalDay<T extends { start: number }>(items: readonly T[], timeZone: string): { date: string; items: T[] }[] {
  const byDay = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => a.start - b.start)) {
    const date = localDate(item.start, timeZone);
    byDay.set(date, [...(byDay.get(date) ?? []), item]);
  }
  return Array.from(byDay, ([date, list]) => ({ date, items: list })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** What needs the owner first: the most urgent, and among equals the one that has waited longest. */
export function sortNeedingAttention<T extends { priority: string; createdAt: number }>(tickets: readonly T[]): T[] {
  return [...tickets].sort((a, b) => (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99) || a.createdAt - b.createdAt);
}

/** Whole days since something was opened (never negative). */
export function ageInDays(createdAt: number, now: number): number {
  return Math.max(0, Math.floor((now - createdAt) / 86_400_000));
}

/** How many of each, by project: for "N tickets waiting on a client to check a fix". */
export function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}
