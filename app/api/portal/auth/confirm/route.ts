/**
 * GET /api/portal/auth/confirm?token_hash=…&type=recovery&locale=…
 *
 * Where an invite link lands. The owner generates the link (lib/portal/people.ts)
 * and sends it to the person; here our own server exchanges the one-time token
 * for a signed-in session, then sends them to choose their password. The token
 * works once and expires, and the exchange happens on OUR domain — Supabase's
 * hosted pages are never involved. A bad, used or expired link goes back to
 * sign-in with a message, revealing nothing about why.
 *
 * (Under /api so the locale middleware leaves it alone.)
 */
import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") === "es" ? "es" : "en";
  const prefix = locale === "es" ? "/es" : "";
  const go = (path: string) => {
    const response = NextResponse.redirect(new URL(`${prefix}${path}`, req.url));
    response.headers.set("Cache-Control", "no-store");
    return response;
  };

  const tokenHash = url.searchParams.get("token_hash") ?? "";
  if (!supabaseConfigured() || url.searchParams.get("type") !== "recovery" || !/^[A-Za-z0-9_-]{10,200}$/.test(tokenHash)) {
    return go("/portal/login?error=link");
  }

  const limit = await checkRateLimit("portal-auth-confirm", clientIp(req), 20, 600, { failClosed: true });
  if (!limit.allowed) return go("/portal/login?error=link");

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  return go(error ? "/portal/login?error=link" : "/portal/set-password");
}
