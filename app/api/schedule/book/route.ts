/**
 * POST /api/schedule/book
 *
 * Order matters — it is what makes double-booking impossible and keeps
 * failures clean:
 *   1. rate limit (fails CLOSED — this route writes to Google Calendar)
 *   2. validate the payload (lib/booking-schema.ts)
 *   3. re-derive availability server-side and require the exact slot to still
 *      be offered (never trust the client's idea of what's free)
 *   4. reserve the slot with a 'pending' row — the table's exclusion
 *      constraint is the atomic guard against two simultaneous bookings
 *   4b. in-person only: re-check the weekly first-come limit AFTER reserving.
 *      Two people booking different days at the same instant can both pass
 *      step 3; ranking by booking time here makes exactly one of them lose.
 *   5. create the Google event (Meet link for online, address for in-person)
 *   6. mark the row 'confirmed'
 *   7. send notification emails (best-effort; can't undo the booking), with an
 *      on-site heads-up for in-person days that look inefficient
 * If step 5 or 6 fails, the reservation is released (and the event deleted)
 * so a failure never leaves a phantom booking.
 */
import { NextResponse } from "next/server";
import { isSlotAvailable, isWithinWeekLimit, weekStartOf } from "@/lib/availability";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { bookingSchema } from "@/lib/booking-schema";
import { sendBookingEmails } from "@/lib/email";
import { createMeetingEvent, deleteEvent, isGoogleConfigured } from "@/lib/google-calendar";
import {
  confirmMeeting,
  insertPendingMeeting,
  listActiveMeetings,
  listConfirmedInPerson,
  releasePendingMeeting,
} from "@/lib/meetings";
import { analyzeOnSiteDay, describeOnSiteDay } from "@/lib/onsite";
import { resolveBookingContext } from "@/lib/portal/booking-context";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { loadScheduleInputs } from "@/lib/schedule-data";
import { addDays, localDate, zonedTimeToUtc } from "@/lib/tz";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit("schedule-book", clientIp(req), 3, 3600, { failClosed: true });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts — please wait before trying again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const booking = parsed.data;

  if (!isGoogleConfigured() || !process.env.SUPABASE_SECRET_KEY || !process.env.DATA_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "Scheduling is not configured yet." }, { status: 503 });
  }

  // From the portal: the project, ticket, name, email and office come from the signed-in account, not from the request.
  // If the request says it is for a project this person cannot open, it is just an ordinary booking.
  const context = booking.projectSlug ? await resolveBookingContext({ projectSlug: booking.projectSlug, ticketId: booking.ticketId }) : null;
  const guestName = context?.name || booking.name;
  const guestEmail = context?.email || booking.email;
  const inPersonLocation = booking.mode === "in_person" ? context?.officeAddress || booking.location : undefined;
  const portalNote = context ? `${context.projectName}${context.ticketNumber ? ` · ticket #${context.ticketNumber}` : ""}` : "";

  const config = DEFAULT_AVAILABILITY;
  const tz = config.hostTimezone;
  const start = Date.parse(booking.start);
  const end = start + booking.durationMinutes * 60_000;
  const bookedDate = localDate(start, tz);
  // The weekly in-person limit looks at the whole Monday–Sunday week, so load all of it.
  const weekStart = zonedTimeToUtc(weekStartOf(bookedDate), "00:00", tz);
  const weekEnd = zonedTimeToUtc(addDays(weekStartOf(bookedDate), 7), "00:00", tz);

  // 3. Authoritative availability check.
  let overrides: Awaited<ReturnType<typeof loadScheduleInputs>>["overrides"];
  try {
    const inputs = await loadScheduleInputs(Math.min(start - 1.5 * DAY, weekStart), Math.max(end + 1.5 * DAY, weekEnd), {
      strict: true,
    });
    overrides = inputs.overrides;
    const stillAvailable = isSlotAvailable(
      { mode: booking.mode, durationMinutes: booking.durationMinutes, now: Date.now(), ...inputs, config },
      start
    );
    if (!stillAvailable) {
      return NextResponse.json({ error: "That time is no longer available." }, { status: 409 });
    }
  } catch (error) {
    console.error("[schedule] availability re-check failed:", error);
    return NextResponse.json({ error: "Scheduling is temporarily unavailable. Please try again shortly." }, { status: 502 });
  }

  // 4. Reserve the slot.
  const title =
    booking.mode === "in_person" ? `On-site meeting — ${guestName}` : `IxMaOperations call — ${guestName}`;
  let reservation: Awaited<ReturnType<typeof insertPendingMeeting>>;
  try {
    reservation = await insertPendingMeeting({
      mode: booking.mode,
      title,
      start,
      end,
      visitorTimezone: booking.timezone,
      guestName,
      guestEmail,
      notes: booking.notes,
      location: inPersonLocation,
      projectId: context?.projectId,
      ticketId: context?.ticketId ?? undefined,
    });
  } catch (error) {
    console.error("[schedule] reservation failed:", error);
    return NextResponse.json({ error: "Could not reserve that time. Please try again." }, { status: 502 });
  }
  if (!reservation.ok) {
    return NextResponse.json({ error: "That time was just taken." }, { status: 409 });
  }

  // 4b. Weekly first-come limit, re-checked now that our own reservation is visible.
  if (booking.mode === "in_person") {
    try {
      const weekMeetings = await listActiveMeetings(weekStart, weekEnd);
      if (!isWithinWeekLimit(bookedDate, weekMeetings, overrides, config)) {
        await releasePendingMeeting(reservation.id);
        return NextResponse.json({ error: "That day is no longer open for in-person meetings." }, { status: 409 });
      }
    } catch (error) {
      console.error("[schedule] week-limit re-check failed — releasing:", error);
      await releasePendingMeeting(reservation.id).catch(() => undefined);
      return NextResponse.json({ error: "Could not complete the booking. Please try again." }, { status: 502 });
    }
  }

  // 5 + 6. Google event, then confirm.
  let eventId: string | null = null;
  try {
    const event = await createMeetingEvent({
      mode: booking.mode,
      title,
      description: [portalNote && `Booked from the client portal: ${portalNote}`, booking.notes && `Notes from ${guestName}:\n${booking.notes}`, `Visitor timezone: ${booking.timezone}`]
        .filter(Boolean)
        .join("\n\n"),
      start,
      end,
      hostTimezone: tz,
      guestEmail,
      guestName,
      location: inPersonLocation,
    });
    eventId = event.id;
    await confirmMeeting(reservation.id, { googleEventId: event.id, meetLink: event.meetLink });

    // 7. Emails (best-effort), plus an on-site heads-up for in-person days.
    let ownerNotes: string[] = [];
    if (booking.mode === "in_person") {
      try {
        const dayStart = zonedTimeToUtc(bookedDate, "00:00", tz);
        const dayMeetings = await listConfirmedInPerson(dayStart, zonedTimeToUtc(addDays(bookedDate, 1), "00:00", tz));
        ownerNotes = describeOnSiteDay(bookedDate, dayMeetings, analyzeOnSiteDay(dayMeetings, config), config);
      } catch (error) {
        console.error("[schedule] on-site analysis failed (booking unaffected):", error);
      }
    }
    await sendBookingEmails({
      mode: booking.mode,
      guestName,
      guestEmail,
      start,
      end,
      visitorTimezone: booking.timezone,
      hostTimezone: tz,
      locale: booking.locale,
      meetLink: event.meetLink,
      location: inPersonLocation,
      notes: booking.notes,
      ownerNotes,
      context: portalNote || undefined,
    });

    return NextResponse.json({
      ok: true,
      mode: booking.mode,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      meetLink: event.meetLink,
      location: inPersonLocation ?? null,
    });
  } catch (error) {
    console.error("[schedule] booking failed after reservation — rolling back:", error);
    if (eventId) await deleteEvent(eventId).catch((e) => console.error("[schedule] rollback: event delete failed:", e));
    await releasePendingMeeting(reservation.id).catch((e) => console.error("[schedule] rollback: release failed:", e));
    return NextResponse.json({ error: "Could not complete the booking. Please try again." }, { status: 502 });
  }
}
