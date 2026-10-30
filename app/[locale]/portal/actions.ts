"use server";

import { headers } from "next/headers";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { blindIndex, decryptLoose, encryptField, encryptOptional } from "@/lib/field-crypto";
import { requireUser } from "@/lib/portal/auth";
import { prepareFiles, type FileProblem } from "@/lib/portal/attachments";
import { alertOwner, notifyTicketPerson } from "@/lib/portal/notify-send";
import { parseLanguage } from "@/lib/portal/preferences";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { localDate } from "@/lib/tz";
import { isActiveTicket } from "@/lib/portal/plan";
import { validateNewPassword } from "@/lib/portal/password";
import { createPortalAccount, inviteLinkFor } from "@/lib/portal/people";
import { saveAttachments } from "@/lib/portal/save-attachments";
import { resolveTicketFolder, resolveTicketTitle } from "@/lib/portal/ticket-title";
import { isOfficeDay, officeDaysFromForm } from "@/lib/portal/office-days";
import { getOfficeWeekdays } from "@/lib/portal/queries";
import { cancelProjectMeeting } from "@/lib/portal/project-meetings";
import {
  cancelMeetingInput,
  commentInput,
  companyAccessInput,
  confirmFixedInput,
  loginInput,
  memberAccessInput,
  milestoneStatusInput,
  onsitePresenceInput,
  onsiteVisitInput,
  removeOnsiteVisitInput,
  removeCompanyAccessInput,
  removeMemberInput,
  reopenTicketInput,
  settingsInput,
  ticketInput,
  ticketStatusInput,
} from "@/lib/portal/schemas";
import { checkRateLimit, clientIpFromHeaders } from "@/lib/rate-limit";
import { OUTGOING_URL } from "@/lib/site-url";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Every portal write goes through here, on the SIGNED-IN USER's Supabase
 * client, so row-level security is the authority (an action can ask for
 * something the database will refuse, and the database wins). Each action
 * re-verifies the user itself, validates input with zod, and never trusts a
 * value from the browser — including the locale and the project slug, which
 * are re-checked before being used in a redirect.
 */

export type ActionError =
  | "invalid"
  | "rate"
  | "unavailable"
  | "denied"
  | "closed"
  | "generic"
  | "files_too_many"
  | "files_too_big"
  | "files_bad_type";
export interface FormState {
  error?: ActionError;
  /** The change was saved (status forms use this to refresh the page's data). */
  ok?: boolean;
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

/** The non-empty files a form submitted (an untouched file input sends one empty, nameless file). */
function uploadedFiles(formData: FormData): File[] {
  return formData.getAll("files").filter((value): value is File => typeof value !== "string" && value.size > 0);
}

const fileError = (problem: FileProblem): ActionError =>
  problem === "too_many" ? "files_too_many" : problem === "too_big" ? "files_too_big" : "files_bad_type";

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
  const { data: signedIn, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // The same message for "no such user" and "wrong password": no account enumeration.
    return { error: error.status && error.status >= 500 ? "unavailable" : "invalid" };
  }
  // Open the portal in the language the person chose (Settings, or the menu); before they have, in the one they signed in with.
  const { data: mine } = await supabase.from("profiles").select("locale").eq("id", signedIn.user.id).maybeSingle();
  redirect({ href: "/portal", locale: parseLanguage((mine as { locale?: string } | null)?.locale) ?? locale });
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

  // Check the files BEFORE creating anything, so a rejected file doesn't cost the person their ticket.
  const files = await prepareFiles(uploadedFiles(formData));
  if (!files.ok) return { error: fileError(files.error) };

  const { data: project } = await supabase.from("projects").select("id,name").eq("slug", input.projectSlug).maybeSingle();
  if (!project) return { error: "denied" }; // hidden projects look the same as missing ones

  // A ticket can be tied to a plan item (a problem from the diagnosis). It then
  // lands in that item's folder and, if no title was typed, is named after it —
  // that is what makes reporting a problem a couple of clicks instead of typing.
  let planItem: { id: string; title: string; department_id: string | null } | null = null;
  if (input.milestoneId) {
    const { data } = await supabase
      .from("project_milestones")
      .select("id,title,department_id")
      .eq("id", input.milestoneId)
      .eq("project_id", project.id)
      .maybeSingle();
    if (!data) return { error: "invalid" }; // not on this project, or not visible to this person
    planItem = data;
  }
  const title = resolveTicketTitle(input.title, planItem ? decryptLoose(planItem.title) : null);
  if (!title.ok) return { error: "invalid" };

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      project_id: project.id,
      department_id: resolveTicketFolder(planItem?.department_id, input.departmentId),
      milestone_id: planItem?.id ?? null,
      created_by: user.id,
      // Text is encrypted before it reaches the database; only the app holds the key.
      title: encryptField(title.title),
      description: encryptField(input.description),
      category: input.category,
      priority: input.priority,
      environment: input.environment,
      affected_url: encryptOptional(input.affectedUrl),
    })
    .select("id,ticket_number")
    .single();
  if (error || !ticket) return { error: error ? classify(error) : "generic" };

  const failedFiles = await saveAttachments({ supabase, userId: user.id, ticketId: ticket.id, files: files.files });

  // Only a high or critical ticket interrupts the owner; the rest waits for the morning digest (lib/portal/notify.ts).
  if (!isAdmin) {
    await alertOwner({
      event: { kind: "opened", priority: input.priority },
      project: { name: decryptLoose(project.name) ?? "", slug: input.projectSlug },
      subject: `New ${input.priority} ticket #${ticket.ticket_number} — ${title.title}`,
      lines: [
        `${user.email} opened ticket #${ticket.ticket_number} in "${decryptLoose(project.name)}".`,
        "",
        `Priority: ${input.priority} · Type: ${input.category} · Environment: ${input.environment}`,
        files.files.length > 0 ? `Files attached: ${files.files.length - failedFiles}` : "",
        "",
        input.description,
        "",
        `${OUTGOING_URL}/portal/tickets/${ticket.id}`,
      ],
    });
  }
  redirect({
    href: failedFiles > 0 ? { pathname: `/portal/tickets/${ticket.id}`, query: { files: "failed" } } : `/portal/tickets/${ticket.id}`,
    locale,
  });
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
  const internal = input.internal && isAdmin; // only the owner can write internal notes (the database enforces it too)

  const files = await prepareFiles(uploadedFiles(formData));
  if (!files.ok) return { error: fileError(files.error) };
  if (internal && files.files.length > 0) return { error: "invalid" }; // internal notes carry no files

  // A resolved or closed ticket takes no more messages until it is reopened (the owner may still leave a note).
  if (!isAdmin) {
    const { data: current } = await supabase.from("tickets").select("status").eq("id", input.ticketId).maybeSingle();
    if (current && !isActiveTicket(current.status)) return { error: "closed" };
  }

  const { data: comment, error } = await supabase
    .from("ticket_comments")
    .insert({
      ticket_id: input.ticketId,
      author_id: user.id,
      message: encryptField(input.message),
      is_internal: internal,
    })
    .select("id")
    .single();
  if (error || !comment) return { error: error ? classify(error) : "generic" };

  const failedFiles = await saveAttachments({
    supabase,
    userId: user.id,
    ticketId: input.ticketId,
    commentId: comment.id,
    files: files.files,
  });

  // A client's comment is in the owner's morning digest; the owner's own reply tells the person who opened the ticket.
  if (isAdmin && !internal) await notifyTicketPerson({ ticketId: input.ticketId, kind: "owner_replied", actorId: user.id });
  redirect({
    href: failedFiles > 0 ? { pathname: `/portal/tickets/${input.ticketId}`, query: { files: "failed" } } : `/portal/tickets/${input.ticketId}`,
    locale,
  });
  return {};
}

/**
 * Reopen a ticket: either "still broken" (the owner marked it fixed, "Needs your
 * review", and the person found it is not) or a person coming back to a resolved
 * or closed ticket. The ticket goes back to "open" through the reopen_ticket()
 * database function — the only way a non-owner can change a status, and it can
 * only do this one move for people who may write in the ticket's folder. Their
 * note is saved right after, as an ordinary comment, so the owner sees why (it
 * can't come first: a closed ticket takes no comments). The status change lands
 * in the project log automatically.
 */
export async function reopenTicket(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, user, isAdmin } = await requireUser(locale);

  const parsed = reopenTicketInput.safeParse({ ticketId: text(formData, "ticketId"), message: text(formData, "message") });
  if (!parsed.success) return { error: "invalid" };
  const input = parsed.data;

  const files = await prepareFiles(uploadedFiles(formData));
  if (!files.ok) return { error: fileError(files.error) };

  // Only a ticket that is waiting for review, resolved or closed can be reopened (the database insists too).
  const { data: ticket } = await supabase
    .from("tickets")
    .select("ticket_number,title,status,projects(name,slug)")
    .eq("id", input.ticketId)
    .maybeSingle();
  if (!ticket) return { error: "denied" };
  if (ticket.status === "open" || ticket.status === "in_progress") return { error: "invalid" };

  const { data: reopened, error: reopenError } = await supabase.rpc("reopen_ticket", { p_ticket: input.ticketId });
  if (reopenError) return { error: "generic" };
  if (reopened !== true) return { error: "denied" };

  const { data: comment, error } = await supabase
    .from("ticket_comments")
    .insert({ ticket_id: input.ticketId, author_id: user.id, message: encryptField(input.message), is_internal: false })
    .select("id")
    .single();
  // The ticket is open now, so the person can simply add the message as a normal comment.
  if (error || !comment) return { error: error ? classify(error) : "generic" };

  const failedFiles = await saveAttachments({ supabase, userId: user.id, ticketId: input.ticketId, commentId: comment.id, files: files.files });

  if (!isAdmin) {
    const backAfterClosing = ticket.status !== "needs_review";
    const project = (Array.isArray(ticket.projects) ? ticket.projects[0] : ticket.projects) as { name: string; slug: string } | null;
    await alertOwner({
      event: { kind: "reopened" },
      project: { name: decryptLoose(project?.name) ?? "", slug: project?.slug ?? "" },
      subject: `Ticket #${ticket.ticket_number} ${backAfterClosing ? "was reopened" : "is still broken"}`,
      lines: [
        backAfterClosing
          ? `${user.email} reopened "${decryptLoose(ticket.title) ?? "a ticket"}":`
          : `${user.email} says "${decryptLoose(ticket.title) ?? "a ticket"}" is still not fixed, and reopened it:`,
        "",
        input.message,
        files.files.length > 0 ? `\nFiles attached: ${files.files.length - failedFiles}` : "",
        "",
        `${OUTGOING_URL}/portal/tickets/${input.ticketId}`,
      ],
    });
  }
  redirect({
    href: failedFiles > 0 ? { pathname: `/portal/tickets/${input.ticketId}`, query: { files: "failed" } } : `/portal/tickets/${input.ticketId}`,
    locale,
  });
  return {};
}

/**
 * "It works": the owner marked a ticket as fixed and the person checked it.
 * Closes the ticket through the confirm_ticket_fixed() database function — like
 * reopen_ticket(), the one narrow way a non-owner can change a status, limited
 * to this single move for people who may write in the ticket's folder. The
 * change lands in the project log automatically.
 */
export async function confirmTicketFixed(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase } = await requireUser(locale);

  const parsed = confirmFixedInput.safeParse({ ticketId: text(formData, "ticketId") });
  if (!parsed.success) return { error: "invalid" };
  const { ticketId } = parsed.data;

  const { data: ticket } = await supabase.from("tickets").select("status").eq("id", ticketId).maybeSingle();
  if (!ticket) return { error: "denied" };
  if (ticket.status !== "needs_review") return { error: "invalid" };

  const { data: closed, error } = await supabase.rpc("confirm_ticket_fixed", { p_ticket: ticketId });
  if (error) return { error: "generic" };
  if (closed !== true) return { error: "denied" };

  // No email: it is good news and goes into the owner's morning digest.
  redirect({ href: `/portal/tickets/${ticketId}`, locale });
  return {};
}

/**
 * Settings: my name, language, time zone and which e-mails I want. Only the
 * person's own profile row can be changed (the database enforces it, and only
 * these columns). The notification switches are left alone when the form did not
 * show them (the owner's alerts are set up elsewhere).
 */
export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const uiLocale = pickLocale(formData.get("uiLocale"));
  const { supabase, user } = await requireUser(uiLocale);

  const parsed = settingsInput.safeParse({
    displayName: text(formData, "displayName"),
    timezone: text(formData, "timezone"),
    language: text(formData, "language"),
    notifyEmail: formData.get("notifyEmail") === "on",
    notifyFixReady: formData.get("notifyFixReady") === "on",
    notifyReplies: formData.get("notifyReplies") === "on",
  });
  if (!parsed.success) return { error: "invalid" };
  const input = parsed.data;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: encryptField(input.displayName),
      timezone: input.timezone,
      locale: input.language,
      ...(formData.get("notificationsShown") === "1"
        ? { notify_email: input.notifyEmail, notify_fix_ready: input.notifyFixReady, notify_replies: input.notifyReplies }
        : {}),
    })
    .eq("id", user.id)
    .select("id");
  if (error) return { error: classify(error) };
  if (!data || data.length === 0) return { error: "denied" };
  return { ok: true };
}

// ---------------------------------------------------------------- owner only

/**
 * Both status actions tell the screen what happened. Row-level security lets
 * only the owner update these rows; for anyone else the update succeeds with
 * ZERO rows changed, so "no row came back" is reported as a refusal instead of
 * pretending it worked.
 */
export async function updateTicketStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, user } = await requireUser(locale);
  const parsed = ticketStatusInput.safeParse({ ticketId: text(formData, "ticketId"), status: text(formData, "status") });
  if (!parsed.success) return { error: "invalid" };

  const { data: before } = await supabase.from("tickets").select("status").eq("id", parsed.data.ticketId).maybeSingle();
  const { data, error } = await supabase.from("tickets").update({ status: parsed.data.status }).eq("id", parsed.data.ticketId).select("id");
  if (error) return { error: classify(error) };
  if (!data || data.length === 0) return { error: "denied" };

  // "Fixed — please check": the one status change the person has to act on, so they get an email (once, not on a re-save).
  if (parsed.data.status === "needs_review" && before?.status !== "needs_review") {
    await notifyTicketPerson({ ticketId: parsed.data.ticketId, kind: "fix_ready", actorId: user.id });
  }
  return { ok: true };
}

export async function updateMilestoneStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase } = await requireUser(locale);
  const parsed = milestoneStatusInput.safeParse({ milestoneId: text(formData, "milestoneId"), status: text(formData, "status") });
  if (!parsed.success) return { error: "invalid" };

  const { data, error } = await supabase
    .from("project_milestones")
    .update({
      status: parsed.data.status,
      completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.milestoneId)
    .select("id");
  if (error) return { error: classify(error) };
  if (!data || data.length === 0) return { error: "denied" };
  return { ok: true };
}

// ------------------------------------------------- owner: when I'm at a client's office

/** Back to the project's On-site tab with a one-word result the page turns into a message. */
function backToOnsite(locale: string, slug: string, result: "saved" | "error" | "closed"): never {
  return redirect({ href: { pathname: `/portal/projects/${slug}`, query: { tab: "onsite", visit: result } }, locale });
}

/**
 * Owner: announce a day at a project's office (date and hours). One per project and
 * day: announcing it again changes the hours. The database refuses anyone else, and
 * it also opens in-person times on that day at /book.
 */
export async function saveOnSiteVisit(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, isAdmin } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const safeSlug = SLUG.test(slug) ? slug : "";
  const parsed = onsiteVisitInput.safeParse({ projectSlug: slug, date: text(formData, "date"), start: text(formData, "start"), end: text(formData, "end") });
  // Not in the past, by the owner's own calendar.
  if (!isAdmin || !parsed.success || parsed.data.date < localDate(Date.now(), DEFAULT_AVAILABILITY.hostTimezone)) {
    return backToOnsite(locale, safeSlug, "error");
  }
  const { data: project } = await supabase.from("projects").select("id").eq("slug", slug).maybeSingle();
  if (!project) return backToOnsite(locale, slug, "error");
  // Not on a day the client's office is closed (their home-office days): there would be nobody to visit.
  if (!isOfficeDay(parsed.data.date, await getOfficeWeekdays(supabase, project.id))) return backToOnsite(locale, slug, "closed");
  const { error } = await supabase
    .from("onsite_visits")
    .upsert(
      { project_id: project.id, visit_date: parsed.data.date, start_time: parsed.data.start, end_time: parsed.data.end },
      { onConflict: "project_id,visit_date" }
    );
  return backToOnsite(locale, slug, error ? "error" : "saved");
}

/** Owner: take an announced day off the project. */
export async function removeOnSiteVisit(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, isAdmin } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const safeSlug = SLUG.test(slug) ? slug : "";
  const parsed = removeOnsiteVisitInput.safeParse({ projectSlug: slug, visitId: text(formData, "visitId") });
  if (!isAdmin || !parsed.success) return backToOnsite(locale, safeSlug, "error");
  const { data: project } = await supabase.from("projects").select("id").eq("slug", slug).maybeSingle();
  if (!project) return backToOnsite(locale, slug, "error");
  const { error } = await supabase.from("onsite_visits").delete().eq("id", parsed.data.visitId).eq("project_id", project.id);
  return backToOnsite(locale, slug, error ? "error" : "saved");
}

/**
 * Owner: which weekdays this client's office is open for visits (Monday to Friday offered; none ticked = online
 * only). In-person times and on-site days only exist on these, so a client that works from home on Fridays is
 * simply not offered a Friday visit. Only the owner can change it: the database refuses anyone else.
 */
export async function setOfficeDays(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, isAdmin } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const safeSlug = SLUG.test(slug) ? slug : "";
  if (!isAdmin || !SLUG.test(slug)) return backToOnsite(locale, safeSlug, "error");
  const { data, error } = await supabase
    .from("projects")
    .update({ office_weekdays: officeDaysFromForm(formData.getAll("day")) })
    .eq("slug", slug)
    .select("id");
  return backToOnsite(locale, slug, error || !data?.length ? "error" : "saved");
}

/** Owner: show or hide the on-site schedule for this project's people. Hidden, it also stops listing days from booked meetings. */
export async function setOnSitePresence(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, isAdmin } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const safeSlug = SLUG.test(slug) ? slug : "";
  const parsed = onsitePresenceInput.safeParse({ projectSlug: slug, enabled: formData.get("enabled") === "yes" });
  if (!isAdmin || !parsed.success) return backToOnsite(locale, safeSlug, "error");
  const { data, error } = await supabase.from("projects").update({ show_onsite_presence: parsed.data.enabled }).eq("slug", slug).select("id");
  return backToOnsite(locale, slug, error || !data?.length ? "error" : "saved");
}

// ------------------------------------------------- cancel a booked meeting

/** Back to the project's Meetings tab with a one-word result the page turns into a message. */
function backToMeetings(locale: string, slug: string, result: "cancelled" | "error"): never {
  return redirect({ href: { pathname: `/portal/projects/${slug}`, query: { tab: "onsite", meeting: result } }, locale });
}

/**
 * Cancel a booked meeting of a project: the person who booked it, or the owner. Who may is decided
 * in lib/portal/project-meetings.ts, not by the form: the project is looked up as the signed-in
 * person (a project they can't open is refused), and the meeting must belong to that project and
 * to them. The calendar event is removed (its guests are told) and the time is freed here.
 */
export async function cancelMeeting(formData: FormData): Promise<void> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, user, isAdmin } = await requireUser(locale);
  const slug = text(formData, "projectSlug");
  const safeSlug = SLUG.test(slug) ? slug : "";
  const parsed = cancelMeetingInput.safeParse({ projectSlug: slug, meetingId: text(formData, "meetingId") });
  if (!parsed.success) return backToMeetings(locale, safeSlug, "error");
  const { data: project } = await supabase.from("projects").select("id,name").eq("slug", slug).maybeSingle();
  if (!project) return backToMeetings(locale, slug, "error");
  const result = await cancelProjectMeeting({
    meetingId: parsed.data.meetingId,
    projectId: project.id,
    projectName: decryptLoose(project.name) ?? "",
    viewer: { id: user.id, email: user.email ?? "", isAdmin },
  });
  return backToMeetings(locale, slug, result);
}

// ------------------------------------------------- owner: who can see what

type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

/** Back to the project page with a one-word result the page turns into a message. */
function backToAccess(locale: string, slug: string, result: "saved" | "error"): never {
  return redirect({ href: { pathname: `/portal/projects/${slug}`, query: { tab: "team", access: result } }, locale });
}

/**
 * The person an owner action refers to: by id (an existing row), or by email.
 * If the email has no login yet AND a name was given, the login is created
 * (random unknown password + "must choose your own" flag) — the owner then
 * sends them an invite link. Only ever called after the caller is verified as
 * the owner.
 */
async function resolvePerson(supabase: Supabase, userId: string, email: string, displayName: string): Promise<string | null> {
  if (userId) return userId;
  const { data } = await supabase.from("profiles").select("id").eq("email_hash", blindIndex(email)).maybeSingle();
  if (data?.id) return data.id;
  if (!displayName.trim()) return null;
  return createPortalAccount({ email, displayName });
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
    displayName: text(formData, "displayName"),
    role: text(formData, "role"),
    allDepartments: formData.get("allDepartments") === "on",
    departmentIds: formData.getAll("departmentId").filter((v): v is string => typeof v === "string"),
    canViewCosts: formData.get("canViewCosts") === "on",
  });
  if (!isAdmin || !parsed.success || !SLUG.test(slug)) return backToAccess(locale, SLUG.test(slug) ? slug : "", "error");
  const input = parsed.data;

  const { data: project } = await supabase.from("projects").select("id").eq("slug", input.projectSlug).maybeSingle();
  const userId = await resolvePerson(supabase, input.userId, input.email, input.displayName);
  if (!project || !userId) return backToAccess(locale, slug, "error");

  const member = await supabase
    .from("project_members")
    .upsert({
      project_id: project.id,
      user_id: userId,
      role: input.role,
      all_departments: input.allDepartments,
      can_view_costs: input.canViewCosts,
    });
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
    displayName: text(formData, "displayName"),
    level: text(formData, "level"),
    canViewCosts: formData.get("canViewCosts") === "on",
  });
  if (!isAdmin || !parsed.success) return backToAccess(locale, SLUG.test(slug) ? slug : "", "error");
  const input = parsed.data;

  const userId = await resolvePerson(supabase, input.userId, input.email, input.displayName);
  if (!userId) return backToAccess(locale, slug, "error");
  const saved = await supabase
    .from("organization_members")
    .upsert({
      organization_id: input.organizationId,
      user_id: userId,
      access_level: input.level,
      can_view_costs: input.canViewCosts,
    });
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

// ---------------------------------------------- choosing a password / invites

export interface PasswordState {
  error?: "too_short" | "mismatch" | "weak" | "rate" | "generic";
}

/**
 * Lets the signed-in person choose their own password. Also the page a new
 * person is forced onto until they do: accounts created by the owner start
 * with a flag (app_metadata.must_change_password) that sends them here from
 * everywhere else in the portal. The flag is cleared with the owner-only key
 * because people cannot edit app_metadata themselves.
 */
export async function setPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const locale = pickLocale(formData.get("locale"));
  const { supabase, user } = await requireUser(locale, { allowPasswordChange: true });

  const problem = validateNewPassword(text(formData, "password"), text(formData, "confirm"), user.email ?? "");
  if (problem) return { error: problem === "too_short" ? "too_short" : problem === "mismatch" ? "mismatch" : "weak" };

  const limit = await checkRateLimit("portal-password", user.id, 10, 3600, { failClosed: true });
  if (!limit.allowed) return { error: "rate" };

  const { error } = await supabase.auth.updateUser({ password: text(formData, "password") });
  if (error) return { error: "generic" };

  await supabaseAdmin().auth.admin.updateUserById(user.id, { app_metadata: { must_change_password: false } });
  redirect({ href: "/portal", locale });
  return {};
}

export interface InviteState {
  link?: string;
  error?: boolean;
}

/** Owner: a fresh one-time link that lets this person sign in and choose a password. */
export async function createInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const locale = pickLocale(formData.get("locale"));
  const { isAdmin } = await requireUser(locale);
  const userId = text(formData, "userId");
  if (!isAdmin || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return { error: true };
  const link = await inviteLinkFor(userId, locale);
  return link ? { link } : { error: true };
}
