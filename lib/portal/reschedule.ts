import "server-only";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import type { BookingMode } from "@/lib/availability-config";
import { sendOwnerAlert } from "@/lib/email";
import { decryptLoose } from "@/lib/field-crypto";
import { isGoogleConfigured, moveEvent } from "@/lib/google-calendar";
import { moveMeetingTimes } from "@/lib/meetings";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { canManageMeeting, isCancellable, type Viewer } from "./meeting-access";
import { readMeetings } from "./project-meetings";
import { minutesOf } from "./reschedule-rules";

/**
 * Moving a booked meeting to another time, for the person who booked it or the owner.
 *
 * It is a MOVE of the same meeting and the same calendar event, not a cancellation and a new booking: the guest gets
 * one updated invitation, the meeting keeps its link or address, and the overlap guard has no reason to see the meeting
 * as colliding with itself. Who may do it is decided here (lib/portal/meeting-access.ts), like cancelling, never by the page.
 */

export interface Reschedulable {
  id: string;
  projectId: string | null;
  mode: BookingMode;
  start: number;
  end: number;
  durationMinutes: number;
  googleEventId: string | null;
  guestName: string | null;
}

/** The meeting, if this viewer may move it: theirs (or the owner's to manage), confirmed, and not yet started. Otherwise null. */
export async function loadReschedulable(meetingId: string, viewer: Viewer, now = Date.now()): Promise<Reschedulable | null> {
  let rows;
  try {
    rows = await readMeetings((columns) => supabaseAdmin().from("meetings").select(`${columns},project_id`).eq("id", meetingId).limit(1));
  } catch (error) {
    console.warn("[portal] could not read a meeting to move it:", error instanceof Error ? error.message : error);
    return null;
  }
  const row = rows[0] as ((typeof rows)[number] & { project_id?: string | null }) | undefined;
  if (!row) return null;
  if (!canManageMeeting({ clientId: row.client_id, guestEmail: decryptLoose(row.guest_email) }, viewer)) return null;
  const start = Date.parse(row.start_time);
  if (!isCancellable({ status: row.status ?? "", start }, now)) return null;
  const end = Date.parse(row.end_time);
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    mode: row.mode,
    start,
    end,
    durationMinutes: minutesOf({ start, end }),
    googleEventId: row.google_event_id,
    guestName: decryptLoose(row.guest_name),
  };
}

/**
 * Moves the meeting to start at `start` (same length, same format). The table goes first, because its overlap
 * guard is the real arbiter of "someone else just took that time" ("taken"). Then the calendar event follows; if the
 * calendar refuses, the table is put back, so the two never disagree. The caller has already checked that the
 * new time is on offer (lib/portal/reschedule-rules.ts).
 */
export async function moveBooked(input: { meeting: Reschedulable; start: number; viewer: Viewer; projectName: string }): Promise<"moved" | "taken" | "error"> {
  const { meeting, viewer } = input;
  const end = input.start + (meeting.end - meeting.start);
  try {
    const moved = await moveMeetingTimes(meeting.id, input.start, end);
    if (moved === "conflict") return "taken";
    if (moved === "missing") return "error";

    if (meeting.googleEventId && isGoogleConfigured()) {
      try {
        await moveEvent(meeting.googleEventId, input.start, end, DEFAULT_AVAILABILITY.hostTimezone);
      } catch (error) {
        console.error("[portal] could not move the calendar event; putting the meeting back:", error instanceof Error ? error.message : error);
        await moveMeetingTimes(meeting.id, meeting.start, meeting.end).catch((revert) =>
          console.error("[portal] could not put the meeting back:", revert instanceof Error ? revert.message : revert)
        );
        return "error";
      }
    }

    // The owner is told when a client moves their meeting (the owner moving one needs no email).
    if (!viewer.isAdmin) {
      const when = (ms: number) =>
        new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: DEFAULT_AVAILABILITY.hostTimezone }).format(ms);
      await sendOwnerAlert(`Meeting moved: ${meeting.guestName ?? "a client"}`, [
        `${meeting.guestName ?? "A client"} moved their ${meeting.mode === "in_person" ? "in-person" : "online"} meeting on ${input.projectName}.`,
        `Was: ${when(meeting.start)}`,
        `Now: ${when(input.start)}`,
        "Your calendar event was updated, and the guest got the updated invitation.",
      ]).catch(() => false);
    }
    return "moved";
  } catch (error) {
    console.error("[portal] moving a meeting failed:", error instanceof Error ? error.message : error);
    return "error";
  }
}
