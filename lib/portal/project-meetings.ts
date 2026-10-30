import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendOwnerAlert } from "@/lib/email";
import { decryptLoose } from "@/lib/field-crypto";
import { GoogleApiError, deleteEvent, isGoogleConfigured } from "@/lib/google-calendar";
import { syncMeetingsQuietly } from "@/lib/meeting-sync";
import { cancelMeetings } from "@/lib/meetings";
import { missingColumn } from "@/lib/missing-column";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { canManageMeeting, isCancellable, isMyMeeting, type Viewer } from "./meeting-access";

/**
 * A project's booked meetings, for its Meetings tab, and cancelling one.
 *
 * The meetings table is reachable only by the server, so who may see and cancel what is decided
 * HERE (lib/portal/meeting-access.ts), never by the page: a person sees only the meetings they
 * booked, the owner sees all of the project's. The caller has already shown that the viewer may
 * open the project (the page and the action both look the project up as the signed-in person).
 */

const LIST_LIMIT = 25;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE_COLUMNS = "id,start_time,end_time,mode,status,location,meet_link,guest_name,guest_email,ticket_id,google_event_id";

export interface ProjectMeeting {
  id: string;
  start: number;
  end: number;
  mode: "online" | "in_person";
  location: string | null;
  meetLink: string | null;
  /** Booked by the viewer (always true for a non-owner: they only see their own). */
  mine: boolean;
  /** Who booked it. Only filled for the owner, who sees everyone's. */
  bookedBy: string | null;
  areaName: string | null;
  problem: { code: string | null; title: string } | null;
  ticketNumber: number | null;
}

export interface MeetingRow {
  id: string;
  start_time: string;
  end_time: string;
  mode: "online" | "in_person";
  status?: string;
  location: string | null;
  meet_link: string | null;
  guest_name: string | null;
  guest_email: string | null;
  client_id: string | null;
  ticket_id: string | null;
  google_event_id: string | null;
  department_id?: string | null;
  milestone_id?: string | null;
}

/**
 * Reads with the optional columns (who booked it, its team and problem) that later migrations added,
 * leaving out any the database doesn't have yet. `build` gets the column list, so it can also leave out
 * a filter on a column that isn't there. Rows come back with those fields missing, which means "unknown".
 */
export async function readMeetings(build: (columns: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<MeetingRow[]> {
  const optional = ["client_id", "department_id", "milestone_id"];
  for (;;) {
    const result = await build([BASE_COLUMNS, ...optional].join(","));
    if (!result.error) return ((result.data ?? []) as MeetingRow[]).map((row) => ({ ...row, client_id: row.client_id ?? null }));
    const column = missingColumn(result.error.message);
    if (!column || !optional.includes(column)) throw new Error(`Failed to read meetings: ${result.error.message}`);
    optional.splice(optional.indexOf(column), 1);
  }
}

export async function listProjectMeetings(
  supabase: SupabaseClient,
  project: { id: string },
  viewer: Viewer,
  now = Date.now()
): Promise<ProjectMeeting[]> {
  // A meeting the owner removed from the calendar must not stay on the list.
  await syncMeetingsQuietly();

  let rows: MeetingRow[];
  try {
    rows = await readMeetings((columns) => {
      const query = supabaseAdmin()
        .from("meetings")
        .select(columns)
        .eq("project_id", project.id)
        .eq("status", "confirmed")
        .gt("end_time", new Date(now).toISOString());
      // A person's own meetings: narrowed here (not only below) so the limit can't cut theirs off behind
      // other people's. Meetings with no recorded account stay in, and are matched by email below.
      const narrowed = viewer.isAdmin || !UUID.test(viewer.id) || !columns.includes("client_id") ? query : query.or(`client_id.eq.${viewer.id},client_id.is.null`);
      return narrowed.order("start_time").limit(LIST_LIMIT);
    });
  } catch (error) {
    console.warn("[portal] project meetings unavailable:", error instanceof Error ? error.message : error);
    return [];
  }

  const visible = rows
    .map((row) => ({ row, guestEmail: decryptLoose(row.guest_email) }))
    .filter(({ row, guestEmail }) => canManageMeeting({ clientId: row.client_id, guestEmail }, viewer));
  if (visible.length === 0) return [];

  // Names for the team, problem and ticket, looked up as the signed-in person: what they can't open stays blank.
  const unique = <T,>(values: (T | null | undefined)[]) => Array.from(new Set(values.filter((v): v is T => Boolean(v))));
  const [areas, problems, tickets] = await Promise.all([
    supabase.from("departments").select("id,name").in("id", unique(visible.map(({ row }) => row.department_id))),
    supabase.from("project_milestones").select("id,code,title").in("id", unique(visible.map(({ row }) => row.milestone_id))),
    supabase.from("tickets").select("id,ticket_number").in("id", unique(visible.map(({ row }) => row.ticket_id))),
  ]);
  const areaName = new Map((areas.data ?? []).map((d: { id: string; name: string }) => [d.id, decryptLoose(d.name)]));
  const problem = new Map(
    (problems.data ?? []).map((m: { id: string; code: string | null; title: string }) => [m.id, { code: decryptLoose(m.code), title: decryptLoose(m.title) ?? "" }])
  );
  const ticketNumber = new Map((tickets.data ?? []).map((tk: { id: string; ticket_number: number }) => [tk.id, tk.ticket_number]));

  return visible.map(({ row, guestEmail }) => ({
    id: row.id,
    start: Date.parse(row.start_time),
    end: Date.parse(row.end_time),
    mode: row.mode,
    location: decryptLoose(row.location),
    meetLink: row.meet_link,
    mine: isMyMeeting({ clientId: row.client_id, guestEmail }, viewer),
    bookedBy: viewer.isAdmin ? decryptLoose(row.guest_name) : null,
    areaName: (row.department_id && areaName.get(row.department_id)) || null,
    problem: (row.milestone_id && problem.get(row.milestone_id)) || null,
    ticketNumber: (row.ticket_id && ticketNumber.get(row.ticket_id)) || null,
  }));
}

/**
 * Cancels one meeting of a project, if this viewer may. Returns what happened, never throws.
 * The Google event is deleted first (its guests are told); only when that worked, or the event was
 * already gone, is the meeting cancelled here, so the two never disagree for long.
 */
export async function cancelProjectMeeting(input: {
  meetingId: string;
  projectId: string;
  projectName: string;
  viewer: Viewer;
  now?: number;
}): Promise<"cancelled" | "error"> {
  const now = input.now ?? Date.now();
  try {
    const rows = await readMeetings((columns) =>
      supabaseAdmin().from("meetings").select(columns).eq("id", input.meetingId).eq("project_id", input.projectId).limit(1)
    );
    const row = rows[0];
    if (!row) return "error";
    const guestEmail = decryptLoose(row.guest_email);
    if (!canManageMeeting({ clientId: row.client_id, guestEmail }, input.viewer)) return "error";
    if (!isCancellable({ status: row.status ?? "", start: Date.parse(row.start_time) }, now)) return "error";

    if (row.google_event_id && isGoogleConfigured()) {
      try {
        await deleteEvent(row.google_event_id);
      } catch (error) {
        // Already deleted in Google is just what we want; anything else, stop and leave it as it is.
        if (!(error instanceof GoogleApiError && (error.status === 404 || error.status === 410))) {
          console.error("[portal] could not remove the calendar event:", error instanceof Error ? error.message : error);
          return "error";
        }
      }
    }
    await cancelMeetings([row.id]);

    // The owner is told when a client cancels (the owner cancelling their own needs no email).
    if (!input.viewer.isAdmin) {
      const who = decryptLoose(row.guest_name) ?? "A client";
      const when = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: "UTC" }).format(Date.parse(row.start_time));
      await sendOwnerAlert(`Meeting cancelled: ${who}`, [
        `${who} cancelled their ${row.mode === "in_person" ? "in-person" : "online"} meeting on ${input.projectName}.`,
        `Was: ${when} (UTC).`,
        "It is already off your calendar and freed here.",
      ]).catch(() => false);
    }
    return "cancelled";
  } catch (error) {
    console.error("[portal] cancelling a meeting failed:", error instanceof Error ? error.message : error);
    return "error";
  }
}
