import "server-only";
import { DEFAULT_AVAILABILITY } from "./availability-config";
import { getAvailabilityOverrides, getHostBusy } from "./google-calendar";
import { listActiveMeetings } from "./meetings";
import type { DayOverride, ExistingMeeting, Interval } from "./availability";
import { supabaseAdmin } from "./supabase-admin";
import { localDate } from "./tz";

/**
 * Days the owner announced a visit to a client's office. They count as IN-PERSON days
 * (like marking the day on the availability calendar), so in-person times open on them.
 * Anonymous by construction: only the date leaves here, never which project it is for.
 * A day marked OFF or ONLINE-ONLY on the calendar keeps that, and a failure here just
 * means no announced days (the calendar still decides).
 */
async function announcedVisitDates(from: number, to: number): Promise<string[]> {
  const tz = DEFAULT_AVAILABILITY.hostTimezone;
  const { data, error } = await supabaseAdmin()
    .from("onsite_visits")
    .select("visit_date")
    .gte("visit_date", localDate(from, tz))
    .lte("visit_date", localDate(to, tz));
  if (error) {
    console.warn(`[schedule] announced on-site days unavailable: ${error.message}`);
    return [];
  }
  return Array.from(new Set((data ?? []).map((row) => row.visit_date as string)));
}

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
  const [hostBusy, overrides, announced, meetings] = await Promise.all([
    getHostBusy(from, to),
    getAvailabilityOverrides(from, to),
    announcedVisitDates(from, to),
    listActiveMeetings(from, to).catch((error) => {
      if (strict) throw error;
      console.error("[schedule] meetings lookup failed — continuing without lunch-rule data:", error);
      return [] as ExistingMeeting[];
    }),
  ]);
  for (const date of announced) overrides[date] ??= "IN_PERSON";
  return { hostBusy, overrides, meetings };
}
