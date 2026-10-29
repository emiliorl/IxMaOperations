import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { timingFetch } from "./timing";

/**
 * Supabase client bound to the SIGNED-IN USER (their session cookie, the
 * public publishable key). Every portal read and write goes through this
 * client, so Postgres row-level security — not application code — decides what
 * each person can see or change (supabase/migrations/*_portal.sql, proven by
 * supabase/tests/portal-rls.test.ts). The owner-only secret key
 * (lib/supabase-admin.ts) is never used for portal requests.
 */
export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export async function createSupabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { fetch: timingFetch },
    cookies: {
      getAll: () => store.getAll(),
      setAll(list: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. Safe to
          // ignore: proxy.ts refreshes the session on every portal request.
        }
      },
    },
  });
}
