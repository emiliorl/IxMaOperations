/**
 * GET /api/schedule/availability?mode=online|in_person&duration=15|30|45
 *
 * Returns the bookable slots (UTC ISO strings) for the next
 * `horizonDays`. Slot rules live in lib/availability.ts; this route only
 * gathers inputs (Google free/busy, availability-calendar overrides, booked
 * meetings) and shapes the response. The visitor's own calendar is never
 * sent here — "both free" is computed in the browser.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSlots } from "@/lib/availability";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { GoogleApiError, isGoogleConfigured } from "@/lib/google-calendar";
import { resolveOfficeWeekdays } from "@/lib/portal/booking-context";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { loadScheduleInputs } from "@/lib/schedule-data";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  mode: z.enum(["online", "in_person"]),
  duration: z.coerce.number().int().refine((n) => DEFAULT_AVAILABILITY.durationsMinutes.includes(n)),
  /** A signed-in client booking for their project: in-person times then follow that office's open days. */
  project: z.string().trim().max(120).optional(),
});

export async function GET(req: Request) {
  const rateLimit = await checkRateLimit("schedule-availability", clientIp(req), 30, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });

  if (!isGoogleConfigured()) {
    return NextResponse.json({ error: "Scheduling is not configured yet." }, { status: 503 });
  }

  const config = DEFAULT_AVAILABILITY;
  const now = Date.now();
  const horizonEnd = now + (config.horizonDays + 2) * 86_400_000;

  try {
    // The days that client's office is open: in-person times only exist then, and a day is only marked "on-site"
    // for them when it is one. Only when the person is signed in and can open that project: otherwise no limit.
    const officeWeekdays = parsed.data.project ? await resolveOfficeWeekdays(parsed.data.project) : null;
    const inputs = await loadScheduleInputs(now, horizonEnd);
    const slots = generateSlots({
      mode: parsed.data.mode,
      durationMinutes: parsed.data.duration,
      now,
      ...inputs,
      config,
      ...(officeWeekdays ? { officeWeekdays } : {}),
    });
    return NextResponse.json(
      {
        hostTimezone: config.hostTimezone,
        slots: slots.map((s) => ({
          start: new Date(s.start).toISOString(),
          end: new Date(s.end).toISOString(),
          onSite: s.onSite,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[schedule] availability failed:", error);
    const status = error instanceof GoogleApiError && error.status === 429 ? 503 : 502;
    return NextResponse.json({ error: "Scheduling is temporarily unavailable. Please try again shortly." }, { status });
  }
}
