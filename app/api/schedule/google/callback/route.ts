/**
 * GET /api/schedule/google/callback
 *
 * Google redirects the visitor's popup here. We verify the CSRF `state`,
 * exchange the one-time code for a short-lived read-only token, read the
 * visitor's busy start/end times once, and hand them to the opener window
 * with postMessage — nothing is stored server-side (see
 * lib/google-calendar.ts fetchClientBusy and /privacy). The page then closes.
 *
 * The inline script only ever posts to its own origin and the payload is
 * JSON-escaped (`<` → <) so calendar data can't break out of the tag.
 */
import { NextResponse } from "next/server";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { CLIENT_CALLBACK_PATH, CLIENT_STATE_COOKIE, fetchClientBusy } from "@/lib/google-calendar";
import { SITE_URL } from "@/lib/site-url";

export const dynamic = "force-dynamic";

type Payload =
  | { type: "ixma-gcal"; ok: true; busy: { start: number; end: number }[] }
  | { type: "ixma-gcal"; ok: false; reason: "denied" | "failed" };

function popupResponse(payload: Payload, status = 200) {
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Google Calendar</title></head>
<body style="font-family:system-ui,sans-serif;background:#09090b;color:#a1a1aa;padding:2rem">
<p>${payload.ok ? "Connected. You can close this window." : "Not connected. You can close this window."}</p>
<script>
  try { if (window.opener) window.opener.postMessage(${json}, window.location.origin); } catch (e) {}
  window.close();
</script></body></html>`;
  const response = new NextResponse(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
  response.cookies.delete({ name: CLIENT_STATE_COOKIE, path: "/api/schedule/google" });
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookieHeader = req.headers.get("cookie") ?? "";
  const expectedState = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CLIENT_STATE_COOKIE}=`))
    ?.slice(CLIENT_STATE_COOKIE.length + 1);

  if (!expectedState || url.searchParams.get("state") !== expectedState) {
    return popupResponse({ type: "ixma-gcal", ok: false, reason: "failed" }, 400);
  }
  if (url.searchParams.get("error")) return popupResponse({ type: "ixma-gcal", ok: false, reason: "denied" });

  const code = url.searchParams.get("code");
  if (!code) return popupResponse({ type: "ixma-gcal", ok: false, reason: "failed" }, 400);

  const now = Date.now();
  try {
    const busy = await fetchClientBusy(
      code,
      `${SITE_URL}${CLIENT_CALLBACK_PATH}`,
      now,
      now + (DEFAULT_AVAILABILITY.horizonDays + 2) * 86_400_000
    );
    return popupResponse({ type: "ixma-gcal", ok: true, busy });
  } catch (error) {
    console.error("[schedule] client free/busy failed:", error);
    return popupResponse({ type: "ixma-gcal", ok: false, reason: "failed" }, 502);
  }
}
