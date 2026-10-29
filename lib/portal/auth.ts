import { cache } from "react";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { decryptLoose } from "@/lib/field-crypto";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";

/**
 * Who is making this request? Asks Supabase to VERIFY the session (getUser()
 * contacts the auth server — it does not just trust the cookie). Wrapped in
 * React's cache() so the portal header and the page share one check per
 * request instead of repeating it.
 */
const loadSession = cache(async () => {
  if (!supabaseConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  return {
    supabase,
    user,
    name: decryptLoose(profile?.display_name) ?? user.email ?? "",
    // app_metadata is writable only with the service role, so people can't set these themselves.
    isAdmin: user.app_metadata?.role === "admin",
    mustChangePassword: user.app_metadata?.must_change_password === true,
  };
});

/** For display only (the portal header). Never used to authorize anything. */
export async function getPortalSession() {
  const session = await loadSession();
  if (!session?.user) return null;
  return { name: session.name!, isAdmin: session.isAdmin! };
}

/**
 * The gate for every portal page and server action: not signed in → login;
 * signed in with a temporary password (just created by the owner) → must
 * choose their own password first. proxy.ts only refreshes sessions; this is
 * the real check.
 *
 * `isAdmin` is for choosing what to *show*; row-level security enforces what
 * is actually allowed, so a wrong value here can never expose data.
 */
export async function requireUser(locale: string, { allowPasswordChange = false } = {}) {
  const session = await loadSession();
  if (!session) notFound();
  if (!session.user) redirect({ href: "/portal/login", locale });
  if (session.mustChangePassword && !allowPasswordChange) redirect({ href: "/portal/set-password", locale });
  return {
    supabase: session.supabase,
    user: session.user!,
    name: session.name!,
    isAdmin: session.isAdmin!,
    mustChangePassword: session.mustChangePassword!,
  };
}

export async function currentUser() {
  const session = await loadSession();
  return session?.user ?? null;
}
