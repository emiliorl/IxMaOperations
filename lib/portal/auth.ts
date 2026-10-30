import { cache } from "react";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { decryptLoose } from "@/lib/field-crypto";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";
import { aalFromAccessToken, ownerTwoStepRequired, twoStepGate, verifiedTotpCount } from "./mfa";

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

  // app_metadata is writable only with the service role, so people can't set these themselves.
  const isAdmin = user.app_metadata?.role === "admin";
  // Two-step verification. The authenticator apps come from the auth server's own answer about this user; how the
  // session was verified (has the code been entered?) is a claim in the access token that getUser() just validated.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const twoStep = twoStepGate({
    isAdmin,
    ownerRequired: ownerTwoStepRequired(process.env.PORTAL_REQUIRE_OWNER_2FA),
    verifiedFactors: verifiedTotpCount(user.factors),
    aal: aalFromAccessToken(session?.access_token),
  });

  return {
    supabase,
    user,
    isAdmin,
    mustChangePassword: user.app_metadata?.must_change_password === true,
    twoStep,
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
  const { data: profile } = await session.supabase.from("profiles").select("display_name").eq("id", session.user.id).maybeSingle();
  return {
    name: decryptLoose(profile?.display_name) ?? session.user.email ?? "",
    email: session.user.email ?? "",
    isAdmin: session.isAdmin!,
  };
}

/**
 * The gate for every portal page and server action: not signed in → login;
 * signed in with a temporary password (just created by the owner) → must
 * choose their own password first; has two-step verification set up but has not
 * entered a code in this session → the code page; the owner without it set up →
 * the setup page (see lib/portal/mfa.ts). proxy.ts only refreshes sessions; this
 * is the real check.
 *
 * `isAdmin` is for choosing what to *show*; row-level security enforces what
 * is actually allowed, so a wrong value here can never expose data.
 */
export async function requireUser(locale: string, { allowPasswordChange = false, allowTwoStep = false } = {}) {
  const session = await loadSession();
  if (!session) notFound();
  if (!session.user) redirect({ href: "/portal/login", locale });
  if (session.mustChangePassword && !allowPasswordChange) redirect({ href: "/portal/set-password", locale });
  // Only the two-step pages themselves (and sign-out) may be opened before the second step is done.
  if (!allowTwoStep && session.twoStep === "verify") redirect({ href: "/portal/verify", locale });
  if (!allowTwoStep && session.twoStep === "enroll") redirect({ href: "/portal/two-step", locale });
  return {
    supabase: session.supabase,
    user: session.user!,
    isAdmin: session.isAdmin!,
    mustChangePassword: session.mustChangePassword!,
    twoStep: session.twoStep!,
  };
}

/**
 * For routes that are not pages (a file download): has this signed-in person finished the second step? False when
 * nobody is signed in, or when a code is still owed. (The owner who has not set it up yet is not "owed a code".)
 */
export async function twoStepComplete(): Promise<boolean> {
  const session = await loadSession();
  return Boolean(session?.user) && session?.twoStep !== "verify";
}

export async function currentUser() {
  const session = await loadSession();
  return session?.user ?? null;
}

/**
 * The signed-in person, for routes that are not pages (booking, moving a meeting): who they are, and whether they are
 * the owner. Null unless they are fully through the gate: signed in, past choosing a first password, and past the second
 * step (or, for the owner, past setting it up): the same bar as every portal page.
 */
export async function currentViewer(): Promise<{ id: string; email: string; isAdmin: boolean } | null> {
  const session = await loadSession();
  if (!session?.user || session.mustChangePassword || session.twoStep !== "ok") return null;
  return { id: session.user.id, email: session.user.email ?? "", isAdmin: Boolean(session.isAdmin) };
}
