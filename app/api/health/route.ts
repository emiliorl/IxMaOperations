/**
 * GET /api/health
 *
 * For an uptime monitor (UptimeRobot, Better Stack and similar have free plans): point it here and have it email
 * you when this stops answering 200. It checks that the site is up, that its required settings exist, and that
 * the database answers, and says only "ok" or "fail" for each: nothing about why, and no data.
 *
 * With the scheduled jobs' secret (`Authorization: Bearer $CRON_SECRET`) it also checks the owner's Google
 * Calendar (the thing bookings depend on) and that the email key exists. Without CRON_SECRET configured the
 * deeper checks simply aren't available.
 */
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getHostBusy, isGoogleConfigured } from "@/lib/google-calendar";
import { configPresent, runCheck, summarize, type CheckResult } from "@/lib/health";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "DATA_ENCRYPTION_KEY"] as const;
const NO_STORE = { "Cache-Control": "no-store" };

function deepAllowed(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  const limit = await checkRateLimit("health", clientIp(req), 60, 60);
  if (!limit.allowed) return NextResponse.json({ ok: false }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSeconds) } });

  const checks: Record<string, CheckResult> = {
    config: configPresent(process.env, REQUIRED),
    database: await runCheck(async () => {
      const { error } = await supabaseAdmin().from("projects").select("id").limit(1);
      if (error) throw error;
    }, 4000),
  };
  if (deepAllowed(req)) {
    checks.calendar = isGoogleConfigured() ? await runCheck(() => getHostBusy(Date.now(), Date.now() + 3_600_000), 6000) : "fail";
    checks.email = configPresent(process.env, ["RESEND_API_KEY", "OWNER_EMAIL"]);
  }
  const answer = summarize(checks);
  return NextResponse.json(answer, { status: answer.ok ? 200 : 503, headers: NO_STORE });
}
