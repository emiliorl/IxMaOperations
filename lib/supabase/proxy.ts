import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { timingFetch } from "./timing";

/**
 * Keeps the Supabase session fresh for portal requests: reads the session
 * cookie, lets Supabase refresh an expiring token, and writes the new cookie
 * onto both the request (for the rest of this request) and the response (for
 * the browser). It does NOT decide who may see what — every portal page and
 * action re-checks the user itself with getUser() (lib/portal/auth.ts), so this
 * is never the only gate. That is why it can use getClaims() — which checks the
 * token locally instead of asking the auth server — and skip signed-out requests.
 */
export async function refreshSession(request: NextRequest, response: NextResponse): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;
  // No Supabase session cookie (e.g. the login page while signed out): nothing to refresh.
  if (!request.cookies.getAll().some((cookie) => /^sb-.+-auth-token/.test(cookie.name))) return;

  const supabase = createServerClient(url, key, {
    global: { fetch: timingFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value, options } of list) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  // Refreshes an expiring token (and writes the new cookie through setAll above).
  await supabase.auth.getClaims();
}
