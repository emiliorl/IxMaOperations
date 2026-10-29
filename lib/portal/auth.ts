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
    error,
  } = await supabase.auth.getUser();
  // "No session cookie" is the normal signed-out case. Anything else (an expired
  // or already-used refresh token, the auth server being slow or rate-limiting)
  // also lands here as "signed out"; record why, so a surprise sign-in prompt can be explained.
  if (error && error.name !== "AuthSessionMissingError") {
    console.warn(`[portal] session check failed: ${error.name} status=${error.status ?? "?"} ${error.message}`);
  }
  if (!user) return { supabase, user: null };

  return {
    supabase,
    user,
    // app_metadata is writable only with the service role, so people can't set these themselves.
    isAdmin: user.app_metadata?.role === "admin",
    mustChangePassword: user.app_metadata?.must_change_password === true,
  };
});

/**
 * For display only (the portal header). Never used to authorize anything.
 * The display name is looked up here, not in loadSession: only the header shows
 * it, and the header isn't re-rendered when moving between portal pages.
 */
export async function getPortalSession() {
  const session = await loadSession();
  if (!session?.user) return null;
  // The switch is read on its own: before its migration is run the column doesn't exist, and the name must still show.
  const [{ data: profile }, prefs] = await Promise.all([
    session.supabase.from("profiles").select("display_name").eq("id", session.user.id).maybeSingle(),
    session.supabase.from("profiles").select("notify_email").eq("id", session.user.id).maybeSingle(),
  ]);
  return {
    name: decryptLoose(profile?.display_name) ?? session.user.email ?? "",
    email: session.user.email ?? "",
    isAdmin: session.isAdmin!,
    notifyEmail: (prefs.data as { notify_email?: boolean } | null)?.notify_email ?? true,
  };
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
    isAdmin: session.isAdmin!,
    mustChangePassword: session.mustChangePassword!,
  };
}

export async function currentUser() {
  const session = await loadSession();
  return session?.user ?? null;
}
