/**
 * Moving a booked meeting to another time: which times may it move to? Pure, so the rules are tested.
 *
 * The times on offer for a meeting are the times anyone could book, with ONE difference: the meeting being moved
 * does not count against itself. Otherwise the weekly in-person limit and the "on-site day" count would still include the
 * day it is leaving (moving the only meeting of a Monday to Friday would look like a third on-site day), and the lunch
 * rule would see it. Its own old time is still taken: the owner's calendar still shows that event as busy until it
 * is moved, so the slot engine will not offer a time that overlaps it.
 */
import { isSlotAvailable, type ExistingMeeting, type SlotQuery } from "../availability";
import type { BookingMode } from "../availability-config";

export interface MovingMeeting {
  start: number;
  end: number;
  mode: BookingMode;
}

/** The meetings with this one taken out (matched by its exact time and mode: two meetings can never share both). */
export function withoutMeeting(meetings: ExistingMeeting[], moving: MovingMeeting): ExistingMeeting[] {
  const index = meetings.findIndex((m) => m.start === moving.start && m.end === moving.end && m.mode === moving.mode);
  return index === -1 ? meetings : [...meetings.slice(0, index), ...meetings.slice(index + 1)];
}

/** Minutes in a meeting, as booked. */
export function minutesOf(moving: Pick<MovingMeeting, "start" | "end">): number {
  return Math.round((moving.end - moving.start) / 60_000);
}

/** May the meeting move to start at `newStart`? A different time that the slot engine offers, with the same format and length. */
export function isNewTimeOffered(query: Omit<SlotQuery, "mode" | "durationMinutes">, moving: MovingMeeting, newStart: number): boolean {
  if (newStart === moving.start) return false;
  return isSlotAvailable(
    { ...query, mode: moving.mode, durationMinutes: minutesOf(moving), meetings: withoutMeeting(query.meetings, moving) },
    newStart
  );
}
