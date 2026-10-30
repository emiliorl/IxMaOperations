import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { getHostBusy } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { addDays, localDate, zonedTimeToUtc } from "@/lib/tz";
import { buildOnSiteDay, impliedVisits, mergeVisits, type BusySpan, type OnSiteDay, type Span, type VisitWindow } from "./onsite-schedule";

/**
 * When the owner is at a project's office, for the project page and its tickets.
 *
 * What a person may see is decided HERE and by the database, never by the page:
 *   - announced days are read as the signed-in person, so row-level security applies
 *     (only people on that project, only while the project shows them);
 *   - days that come from a booked meeting, and who is "mine", need the meetings
 *     table, which only the server can read: that part runs only when the caller has
 *     already shown that this person may see this project and its schedule.
 * Only times leave this file. Never a name, a company, a title or an address.
 */

const config = DEFAULT_AVAILABILITY;
const tz = config.hostTimezone;
/** How many days ahead are shown in detail (each needs the owner's calendar). */
const DETAIL_DAYS = 8;

export interface UpcomingVisit extends VisitWindow {
  /** The owner's own announcement (can be removed); false = it comes from a meeting booked for the project. */
  announced: boolean;
  id: string | null;
}
export type OnSiteDayDetail = OnSiteDay & Pick<UpcomingVisit, "announced" | "id">;

const hhmm = (time: string) => time.slice(0, 5); // Postgres sends "10:00:00"

/** The days ahead at this project's office, soonest first. Cheap: the database only. */
export async function listUpcomingVisits(
  supabase: SupabaseClient,
  project: { id: string; showOnsite: boolean },
  isAdmin: boolean,
  now = Date.now()
): Promise<UpcomingVisit[]> {
  // A project that does not show its schedule shows nothing to its people. (The owner always sees it.)
  if (!isAdmin && !project.showOnsite) return [];

  const today = localDate(now, tz);
  const until = addDays(today, config.horizonDays);

  const announcedRows = await supabase
    .from("onsite_visits")
    .select("id,visit_date,start_time,end_time")
    .eq("project_id", project.id)
    .gte("visit_date", today)
    .lte("visit_date", until)
    .order("visit_date");
  // Before the migration the table does not exist: the rest still works.
  if (announcedRows.error) console.warn(`[portal] on-site days unavailable: ${announcedRows.error.message}`);

  const announced: VisitWindow[] = (announcedRows.data ?? []).map((row) => ({ date: row.visit_date, start: hhmm(row.start_time), end: hhmm(row.end_time) }));
  const ids = new Map((announcedRows.data ?? []).map((row) => [row.visit_date as string, row.id as string]));

  const meetings = await supabaseAdmin()
    .from("meetings")
    .select("start_time,end_time")
    .eq("project_id", project.id)
    .eq("mode", "in_person")
    .eq("status", "confirmed")
    .gte("start_time", new Date(now).toISOString())
    .lt("start_time", new Date(zonedTimeToUtc(until, "00:00", tz)).toISOString());
  if (meetings.error) console.warn(`[portal] meetings for on-site days unavailable: ${meetings.error.message}`);
  const spans: Span[] = (meetings.data ?? []).map((m) => ({ start: Date.parse(m.start_time), end: Date.parse(m.end_time) }));

  const implied = impliedVisits(spans, new Set(announced.map((v) => v.date)), tz, { start: config.inPerson.startTime, end: config.inPerson.endTime });
  return mergeVisits(announced, implied).map((visit) => ({ ...visit, announced: ids.has(visit.date), id: ids.get(visit.date) ?? null }));
}

/**
 * The next days laid out as timelines: meetings, lunch and free time. Reads the
 * owner's Google calendar (busy times only: titles never leave Google's answer) and, to
 * tell this project's own meetings from anyone else's, the project's meetings.
 * If the calendar cannot be read, the days come back with their hours but no free time:
 * an unreadable calendar must never make the owner look free.
 */
export async function loadOnSiteDays(visits: UpcomingVisit[], projectId: string, now = Date.now()): Promise<OnSiteDayDetail[]> {
  const shown = visits.slice(0, DETAIL_DAYS);
  if (shown.length === 0) return [];

  const from = Math.min(...shown.map((v) => zonedTimeToUtc(v.date, v.start, tz)));
  const to = Math.max(...shown.map((v) => zonedTimeToUtc(v.date, v.end, tz)));

  let busy: BusySpan[] | null = null;
  try {
    const [hostBusy, own] = await Promise.all([
      getHostBusy(Math.max(from, now), to),
      supabaseAdmin()
        .from("meetings")
        .select("start_time,end_time")
        .eq("project_id", projectId)
        .in("status", ["pending", "confirmed"])
        .lt("start_time", new Date(to).toISOString())
        .gt("end_time", new Date(from).toISOString()),
    ]);
    const mine: Span[] = (own.data ?? []).map((m) => ({ start: Date.parse(m.start_time), end: Date.parse(m.end_time) }));
    busy = hostBusy.map((b) => ({ start: b.start, end: b.end, mine: mine.some((m) => m.start < b.end && b.start < m.end) }));
  } catch (error) {
    console.error("[portal] owner calendar unreadable for on-site days:", error instanceof Error ? error.message : error);
  }

  const days: OnSiteDayDetail[] = [];
  for (const visit of shown) {
    const day = buildOnSiteDay({ visit, timeZone: tz, now, busy, lunch: config.lunch, bufferMinutes: config.inPerson.bufferMinutes });
    if (day) days.push({ ...day, announced: visit.announced, id: visit.id });
  }
  return days;
}
