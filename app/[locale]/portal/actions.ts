"use server";

import { headers } from "next/headers";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { sendOwnerAlert } from "@/lib/email";
import { requireUser } from "@/lib/portal/auth";
import { commentInput, loginInput, milestoneStatusInput, ticketInput, ticketStatusInput } from "@/lib/portal/schemas";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";

/**
 * Every portal write goes through here, on the SIGNED-IN USER's Supabase
 * client, so row-level security is the authority (an action can ask for
 * something the database will refuse, and the database wins). Each action
 * re-verifies the user itself, validates input with zod, and never trusts a
 * value from the browser — including the locale and the project slug, which
 * are re-checked before being used in a redirect.
 */

export type ActionError = "invalid" | "rate" | "unavailable" | "denied" | "generic";
export interface FormState {
  error?: ActionError;
}

const RLS_VIOLATION = "42501";
const FOREIGN_KEY_VIOLATION = "23503";
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

const pickLocale = (value: FormDataEntryValue | null) =>
  typeof value === "string" && hasLocale(routing.locales, value) ? value : routing.defaultLocale;
const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

function classify(error: { code?: string }): ActionError {
  if (error.code === RLS_VIOLATION) return "denied";
  if (error.code === FOREIGN_KEY_VIOLATION) return "invalid";
  return "generic";
}

// ---------------------------------------------------------------- sign in/out

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = pickLocale(formData.get("locale"));
  const parsed = loginInput.safeParse({ email: text(formData, "email"), password: text(formData, "password") });
  if (!parsed.success) return { error: "invalid" };
  if (!supabaseConfigured()) return { error: "unavailable" };

  // Throttle by network address AND by account, so guessing one person's
  // password can't be spread across many addresses. Fails closed in production.
  const ip = clientIpFromHeaders(await headers());
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit("portal-login", ip, 10, 600, { failClosed: true }),
    checkRateLimit("portal-login-email", parsed.data.email.toLowerCase(), 8, 900, { failClosed: true }),
  ]);
  if (!byIp.allowed || !byEmail.allowed) return { error: "rate" };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // The same message for "no such user" and "wrong password": no account enumeration.
    return { error: error.status && error.status >= 500 ? "unavailable" : "invalid" };
  }
  redirect({ href: "/portal", locale });
  return {};
}

export async function signOut(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  if (supabaseConfigured()) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  redirect({ href: "/portal/login", locale });
}

// -------------------------------------------------------------------- tickets

export async function createTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, user, isAdmin } = await requireUser(locale);

  const parsed = ticketInput.safeParse({
    projectSlug: text(formData, "projectSlug"),
    departmentId: text(formData, "departmentId"),
    milestoneId: text(formData, "milestoneId"),
    title: text(formData, "title"),
    description: text(formData, "description"),
    category: text(formData, "category"),
    priority: text(formData, "priority"),
    environment: text(formData, "environment"),
    affectedUrl: text(formData, "affectedUrl"),
  });
  if (!parsed.success || !SLUG.test(parsed.data.projectSlug)) return { error: "invalid" };
  const input = parsed.data;

  const { data: project } = await supabase.from("projects").select("id,name").eq("slug", input.projectSlug).maybeSingle();
  if (!project) return { error: "denied" }; // hidden projects look the same as missing ones

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      project_id: project.id,
      department_id: input.departmentId || null,
      milestone_id: input.milestoneId || null,
      created_by: user.id,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      environment: input.environment,
      affected_url: input.affectedUrl || null,
    })
    .select("id,ticket_number")
    .single();
  if (error || !ticket) return { error: error ? classify(error) : "generic" };

  if (!isAdmin) {
    await sendOwnerAlert(`New ticket #${ticket.ticket_number} — ${input.title}`, [
      `${user.email} opened ticket #${ticket.ticket_number} in "${project.name}".`,
      "",
      `Priority: ${input.priority} · Type: ${input.category} · Environment: ${input.environment}`,
      "",
      input.description,
      "",
      `${SITE_URL}/portal/tickets/${ticket.id}`,
    ]);
  }
  redirect({ href: `/portal/tickets/${ticket.id}`, locale });
  return {};
}

export async function addComment(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, user, isAdmin } = await requireUser(locale);

  const parsed = commentInput.safeParse({
    ticketId: text(formData, "ticketId"),
    message: text(formData, "message"),
    internal: formData.get("internal") === "on",
  });
  if (!parsed.success) return { error: "invalid" };
  const input = parsed.data;

  const { error } = await supabase.from("ticket_comments").insert({
    ticket_id: input.ticketId,
    author_id: user.id,
    message: input.message,
    // Only the owner can write internal notes (the database enforces it too).
    is_internal: input.internal && isAdmin,
  });
  if (error) return { error: classify(error) };

  if (!isAdmin) {
    const { data: ticket } = await supabase.from("tickets").select("ticket_number,title").eq("id", input.ticketId).maybeSingle();
    await sendOwnerAlert(`New comment on ticket #${ticket?.ticket_number ?? "?"}`, [
      `${user.email} commented on "${ticket?.title ?? "a ticket"}":`,
      "",
      input.message,
      "",
      `${SITE_URL}/portal/tickets/${input.ticketId}`,
    ]);
  }
  redirect({ href: `/portal/tickets/${input.ticketId}`, locale });
  return {};
}

// ---------------------------------------------------------------- owner only

export async function updateTicketStatus(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase } = await requireUser(locale);
  const parsed = ticketStatusInput.safeParse({ ticketId: text(formData, "ticketId"), status: text(formData, "status") });
  if (parsed.success) {
    // RLS lets only the owner update tickets; for anyone else this changes zero rows.
    await supabase.from("tickets").update({ status: parsed.data.status }).eq("id", parsed.data.ticketId).select("id");
    redirect({ href: `/portal/tickets/${parsed.data.ticketId}`, locale });
  }
}

export async function updateMilestoneStatus(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const parsed = milestoneStatusInput.safeParse({ milestoneId: text(formData, "milestoneId"), status: text(formData, "status") });
  if (parsed.success && SLUG.test(slug)) {
    await supabase
      .from("project_milestones")
      .update({
        status: parsed.data.status,
        completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", parsed.data.milestoneId)
      .select("id");
    redirect({ href: `/portal/projects/${slug}`, locale });
  }
}
