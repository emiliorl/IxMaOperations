import { notFound } from "next/navigation";
import { decryptLoose } from "@/lib/field-crypto";
import { redirect } from "@/i18n/navigation";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";

/**
 * The gate for every portal page and server action. It asks Supabase to
 * verify the session (getUser() contacts the auth server — it does not just
 * trust the cookie) and sends anyone who isn't signed in to the login page.
 * proxy.ts only refreshes sessions; this is the real check.
 *
 * `isAdmin` comes from app_metadata, which only the service role can write.
 * It is for choosing what to *show*; row-level security enforces what is
 * actually allowed, so a wrong value here can never expose data.
 */
export async function requireUser(locale: string) {
  if (!supabaseConfigured()) notFound();
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/portal/login", locale });
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle();
  return {
    supabase,
    user: user!,
    name: decryptLoose(profile?.display_name) ?? user!.email ?? "",
    isAdmin: user!.app_metadata?.role === "admin",
  };
}

export async function currentUser() {
  if (!supabaseConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
