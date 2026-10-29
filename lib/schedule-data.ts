import "server-only";
import { getAvailabilityOverrides, getHostBusy } from "./google-calendar";
import { listActiveMeetings } from "./meetings";
import type { DayOverride, ExistingMeeting, Interval } from "./availability";

export interface ScheduleInputs {
  hostBusy: Interval[];
  overrides: Record<string, DayOverride>;
  meetings: ExistingMeeting[];
}

/**
 * Everything the slot engine needs for [from, to]. Google free/busy is
 * mandatory (an unreadable calendar must never look free). The meetings table
 * is only needed for the lunch rule and the weekly in-person limit — and
 * bookings made through this site already show up as busy in Google — so when
 * listing availability a database hiccup degrades to "no lunch/limit data"
 * instead of an outage (the booking route re-checks both strictly).
 * The booking route passes `strict: true`: there the database's overlap
 * constraint is the real guard, so it must be reachable.
 */
export async function loadScheduleInputs(from: number, to: number, { strict = false } = {}): Promise<ScheduleInputs> {
  const [hostBusy, overrides, meetings] = await Promise.all([
    getHostBusy(from, to),
    getAvailabilityOverrides(from, to),
    listActiveMeetings(from, to).catch((error) => {
      if (strict) throw error;
      console.error("[schedule] meetings lookup failed — continuing without lunch-rule data:", error);
      return [] as ExistingMeeting[];
    }),
  ]);
  return { hostBusy, overrides, meetings };
}
