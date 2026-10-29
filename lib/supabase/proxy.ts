import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/**
 * Keeps the Supabase session fresh for portal requests: reads the session
 * cookie, lets Supabase refresh an expiring token, and writes the new cookie
 * onto both the request (for the rest of this request) and the response (for
 * the browser). It does NOT decide who may see what — every portal page and
 * action re-checks the user itself (lib/portal/auth.ts), so this is never the
 * only gate.
 */
export async function refreshSession(request: NextRequest, response: NextResponse): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;

  const supabase = createServerClient(url, key, {
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
  await supabase.auth.getUser();
}
