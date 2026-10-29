/**
 * GET /api/schedule/google/start
 *
 * Opens the optional "Connect Google Calendar" flow (read-only free/busy).
 * Sets a random `state` in a short-lived httpOnly cookie (CSRF protection —
 * the callback only proceeds if Google echoes the same value back) and
 * redirects to Google's consent screen.
 */
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildClientAuthUrl, CLIENT_CALLBACK_PATH, CLIENT_STATE_COOKIE, isGoogleConfigured } from "@/lib/google-calendar";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rateLimit = await checkRateLimit("schedule-google-start", clientIp(req), 10, 600);
  if (!rateLimit.allowed) return new NextResponse("Too many attempts. Try again later.", { status: 429 });
  if (!isGoogleConfigured()) return new NextResponse("Scheduling is not configured yet.", { status: 503 });

  const state = crypto.randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildClientAuthUrl(state, `${SITE_URL}${CLIENT_CALLBACK_PATH}`));
  response.cookies.set(CLIENT_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the top-level redirect back from Google
    path: "/api/schedule/google",
    maxAge: 600,
  });
  return response;
}
