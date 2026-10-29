"use server";

import { headers } from "next/headers";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { sendOwnerAlert } from "@/lib/email";
import { blindIndex, decryptLoose, encryptField, encryptOptional } from "@/lib/field-crypto";
import { requireUser } from "@/lib/portal/auth";
import {
  commentInput,
  companyAccessInput,
  loginInput,
  memberAccessInput,
  milestoneStatusInput,
  removeCompanyAccessInput,
  removeMemberInput,
  ticketInput,
  ticketStatusInput,
} from "@/lib/portal/schemas";
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
      // Text is encrypted before it reaches the database; only the app holds the key.
      title: encryptField(input.title),
      description: encryptField(input.description),
      category: input.category,
      priority: input.priority,
      environment: input.environment,
      affected_url: encryptOptional(input.affectedUrl),
    })
    .select("id,ticket_number")
    .single();
  if (error || !ticket) return { error: error ? classify(error) : "generic" };

  if (!isAdmin) {
    await sendOwnerAlert(`New ticket #${ticket.ticket_number} — ${input.title}`, [
      `${user.email} opened ticket #${ticket.ticket_number} in "${decryptLoose(project.name)}".`,
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
    message: encryptField(input.message),
    // Only the owner can write internal notes (the database enforces it too).
    is_internal: input.internal && isAdmin,
  });
  if (error) return { error: classify(error) };

  if (!isAdmin) {
    const { data: ticket } = await supabase.from("tickets").select("ticket_number,title").eq("id", input.ticketId).maybeSingle();
    await sendOwnerAlert(`New comment on ticket #${ticket?.ticket_number ?? "?"}`, [
      `${user.email} commented on "${decryptLoose(ticket?.title) ?? "a ticket"}":`,
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

// ------------------------------------------------- owner: who can see what

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/** Back to the project page with a one-word result the page turns into a message. */
function backToAccess(locale: string, slug: string, result: "saved" | "error"): never {
  return redirect({ href: { pathname: `/portal/projects/${slug}`, query: { access: result } }, locale });
}

/** An existing portal user, by id or (case-insensitively, exactly) by email. */
async function resolvePerson(supabase: Supabase, userId: string, email: string): Promise<string | null> {
  if (userId) return userId;
  const { data } = await supabase.from("profiles").select("id").eq("email_hash", blindIndex(email)).maybeSingle();
  return data?.id ?? null;
}

/**
 * Owner: set which folders a person can open on a project (one, several, or
 * all) and their role. Adds them to the project if they weren't on it. The
 * folder list is replaced wholesale; if the second step failed the person
 * would end up with fewer folders, never more.
 */
export async function saveMemberAccess(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, isAdmin } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const parsed = memberAccessInput.safeParse({
    projectSlug: slug,
    userId: text(formData, "userId"),
    email: text(formData, "email"),
    role: text(formData, "role"),
    allDepartments: formData.get("allDepartments") === "on",
    departmentIds: formData.getAll("departmentId").filter((v): v is string => typeof v === "string"),
  });
  if (!isAdmin || !parsed.success || !SLUG.test(slug)) return backToAccess(locale, SLUG.test(slug) ? slug : "", "error");
  const input = parsed.data;

  const { data: project } = await supabase.from("projects").select("id").eq("slug", input.projectSlug).maybeSingle();
  const userId = await resolvePerson(supabase, input.userId, input.email);
  if (!project || !userId) return backToAccess(locale, slug, "error");

  const member = await supabase
    .from("project_members")
    .upsert({ project_id: project.id, user_id: userId, role: input.role, all_departments: input.allDepartments });
  if (member.error) return backToAccess(locale, slug, "error");

  const cleared = await supabase.from("project_member_departments").delete().eq("project_id", project.id).eq("user_id", userId);
  if (cleared.error) return backToAccess(locale, slug, "error");
  if (!input.allDepartments && input.departmentIds.length > 0) {
    const granted = await supabase
      .from("project_member_departments")
      .insert(input.departmentIds.map((department_id) => ({ project_id: project.id, user_id: userId, department_id })));
    if (granted.error) return backToAccess(locale, slug, "error");
  }
  return backToAccess(locale, slug, "saved");
}

/** Owner: take a person off a project (their folder grants go with them). */
export async function removeMemberAccess(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, isAdmin } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const parsed = removeMemberInput.safeParse({ projectSlug: slug, userId: text(formData, "userId") });
  if (!isAdmin || !parsed.success) return backToAccess(locale, SLUG.test(slug) ? slug : "", "error");

  const { data: project } = await supabase.from("projects").select("id").eq("slug", parsed.data.projectSlug).maybeSingle();
  if (!project) return backToAccess(locale, slug, "error");
  const removed = await supabase.from("project_members").delete().eq("project_id", project.id).eq("user_id", parsed.data.userId);
  return backToAccess(locale, slug, removed.error ? "error" : "saved");
}

/** Owner: grant or change company-wide access (CEO / CFO ...). */
export async function saveCompanyAccess(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, isAdmin } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const parsed = companyAccessInput.safeParse({
    projectSlug: slug,
    organizationId: text(formData, "organizationId"),
    userId: text(formData, "userId"),
    email: text(formData, "email"),
    level: text(formData, "level"),
  });
  if (!isAdmin || !parsed.success) return backToAccess(locale, SLUG.test(slug) ? slug : "", "error");
  const input = parsed.data;

  const userId = await resolvePerson(supabase, input.userId, input.email);
  if (!userId) return backToAccess(locale, slug, "error");
  const saved = await supabase
    .from("organization_members")
    .upsert({ organization_id: input.organizationId, user_id: userId, access_level: input.level });
  return backToAccess(locale, slug, saved.error ? "error" : "saved");
}

/** Owner: revoke company-wide access. */
export async function removeCompanyAccess(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, isAdmin } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const parsed = removeCompanyAccessInput.safeParse({
    projectSlug: slug,
    organizationId: text(formData, "organizationId"),
    userId: text(formData, "userId"),
  });
  if (!isAdmin || !parsed.success) return backToAccess(locale, SLUG.test(slug) ? slug : "", "error");
  const removed = await supabase
    .from("organization_members")
    .delete()
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", parsed.data.userId);
  return backToAccess(locale, slug, removed.error ? "error" : "saved");
}
