/**
 * POST /api/schedule/reschedule
 *
 * Moves a booked meeting to another time, for the person who booked it (or the owner). Order matters, like booking:
 *   1. who is asking: signed in and through the second step; a limit per account
 *   2. validate the request
 *   3. the meeting: theirs to move, confirmed, not started (lib/portal/reschedule.ts)
 *   4. the new time must still be on offer, computed fresh on the server (never the browser's idea of what is free),
 *      with this meeting not counting against itself (lib/portal/reschedule-rules.ts)
 *   5. move the table (its overlap guard settles a race), then the calendar event; undo the table if the event fails
 * The guest gets Google's updated invitation; the owner gets an email when a client moves their own meeting.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { alertOwnerOfFailure } from "@/lib/failure-alerts";
import { isGoogleConfigured } from "@/lib/google-calendar";
import { currentViewer } from "@/lib/portal/auth";
import { getOfficeWeekdays } from "@/lib/portal/queries";
import { loadReschedulable, moveBooked } from "@/lib/portal/reschedule";
import { isNewTimeOffered } from "@/lib/portal/reschedule-rules";
import { checkRateLimit } from "@/lib/rate-limit";
import { loadScheduleInputs } from "@/lib/schedule-data";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptLoose } from "@/lib/field-crypto";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ meetingId: z.string().uuid(), start: z.string().datetime() });
const DAY = 86_400_000;
const NO_STORE = { "Cache-Control": "no-store" };

const reply = (status: number, error: string) => NextResponse.json({ error }, { status, headers: NO_STORE });

export async function POST(req: Request) {
  const viewer = await currentViewer();
  if (!viewer) return reply(401, "Sign in to move a meeting.");
  const limit = await checkRateLimit("schedule-reschedule", viewer.id, 20, 3600, { failClosed: true });
  if (!limit.allowed) return reply(429, "Too many attempts — please wait before trying again.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, "Invalid request body.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return reply(400, "Invalid request.");
  if (!isGoogleConfigured() || !process.env.SUPABASE_SECRET_KEY || !process.env.DATA_ENCRYPTION_KEY) return reply(503, "Scheduling is not configured yet.");

  // The meeting must be theirs to move. A meeting that isn't, or doesn't exist, looks the same.
  const meeting = await loadReschedulable(parsed.data.meetingId, viewer);
  if (!meeting) return reply(404, "That meeting can't be moved.");

  const now = Date.now();
  const start = Date.parse(parsed.data.start);
  const config = DEFAULT_AVAILABILITY;
  let projectName = "";
  try {
    // The days this client's office is open apply to in-person meetings (their home-office days offer none).
    const db = supabaseAdmin();
    const officeWeekdays = meeting.projectId ? await getOfficeWeekdays(db, meeting.projectId) : null;
    if (meeting.projectId) {
      const { data } = await db.from("projects").select("name").eq("id", meeting.projectId).maybeSingle();
      projectName = decryptLoose((data as { name?: string } | null)?.name) ?? "";
    }
    const inputs = await loadScheduleInputs(Math.min(now, meeting.start, start) - DAY, Math.max(start, meeting.end) + 8 * DAY, { strict: true });
    const offered = isNewTimeOffered({ now, ...inputs, config, ...(officeWeekdays ? { officeWeekdays } : {}) }, meeting, start);
    if (!offered) return reply(409, "That time is no longer available.");
  } catch (error) {
    console.error("[schedule] availability re-check for a move failed:", error);
    await alertOwnerOfFailure("reschedule", error, { path: "/api/schedule/reschedule", method: "POST" });
    return reply(502, "Scheduling is temporarily unavailable. Please try again shortly.");
  }

  const result = await moveBooked({ meeting, start, viewer, projectName });
  if (result === "taken") return reply(409, "That time was just taken.");
  if (result === "error") {
    await alertOwnerOfFailure("reschedule", new Error("Moving a booked meeting failed"), { path: "/api/schedule/reschedule", method: "POST" });
    return reply(502, "Could not move the meeting. Please try again.");
  }
  return NextResponse.json({ ok: true, mode: meeting.mode, start: new Date(start).toISOString(), end: new Date(start + (meeting.end - meeting.start)).toISOString() }, { headers: NO_STORE });
}
