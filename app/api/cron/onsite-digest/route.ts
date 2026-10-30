/**
 * GET /api/cron/onsite-digest
 *
 * Daily on-site digest, triggered by Vercel Cron (vercel.json). Looks a few
 * days ahead and emails the owner about on-site days that look inefficient —
 * only one meeting, a long gap between meetings, or meetings at different
 * addresses (lib/onsite.ts) — with the option to stay and work from the
 * client's office or to move one meeting closer. Sends nothing when every
 * on-site day looks fine.
 *
 * Auth: Vercel sends `Authorization: Bearer $CRON_SECRET`. With no
 * CRON_SECRET configured the route refuses everything, so it can never be
 * triggered by a stranger.
 */
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { sendOwnerAlert } from "@/lib/email";
import { alertOwnerOfFailure } from "@/lib/failure-alerts";
import { syncMeetingsQuietly } from "@/lib/meeting-sync";
import { listConfirmedInPerson } from "@/lib/meetings";
import { analyzeOnSiteDay, describeOnSiteDay } from "@/lib/onsite";
import { addDays, localDate, zonedTimeToUtc } from "@/lib/tz";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const config = DEFAULT_AVAILABILITY;
  const tz = config.hostTimezone;
  const today = localDate(Date.now(), tz);
  const from = zonedTimeToUtc(today, "00:00", tz);
  const to = zonedTimeToUtc(addDays(today, config.onSite.digestLookaheadDays + 1), "00:00", tz);

  try {
    // Don't email about an on-site day whose meetings were already removed from the calendar.
    await syncMeetingsQuietly({ force: true });
    const meetings = await listConfirmedInPerson(from, to);
    const byDay = new Map<string, typeof meetings>();
    for (const meeting of meetings) {
      const date = localDate(meeting.start, tz);
      byDay.set(date, [...(byDay.get(date) ?? []), meeting]);
    }

    const sections: string[][] = [];
    for (const [date, dayMeetings] of Array.from(byDay).sort(([a], [b]) => (a < b ? -1 : 1))) {
      const lines = describeOnSiteDay(date, dayMeetings, analyzeOnSiteDay(dayMeetings, config), config);
      if (lines.length > 0) sections.push(lines);
    }

    if (sections.length === 0) return NextResponse.json({ sent: false, onSiteDays: byDay.size });

    const sent = await sendOwnerAlert(
      `On-site heads-up: ${sections.length} day${sections.length > 1 ? "s" : ""} to review`,
      [
        "These upcoming on-site days could use a second look:",
        "",
        ...sections.flatMap((lines) => [...lines, ""]),
        "Nothing has been changed or sent to anyone — these are suggestions only.",
      ]
    );
    return NextResponse.json({ sent, onSiteDays: byDay.size, flagged: sections.length });
  } catch (error) {
    console.error("[cron] on-site digest failed:", error);
    await alertOwnerOfFailure("cron", error, { path: "/api/cron/onsite-digest", method: "GET" });
    return NextResponse.json({ error: "Digest failed." }, { status: 500 });
  }
}
