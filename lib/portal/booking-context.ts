import "server-only";
import { decryptLoose } from "@/lib/field-crypto";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";
import { timeZoneOrDefault } from "./preferences";
import type { TopicArea, TopicProblem } from "./booking-topic";

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** More problems than this on one project is not a list anyone picks from. */
const PROBLEM_LIMIT = 300;

/**
 * Who is booking, and for which project, team, problem and ticket, when a signed-in client
 * books from the portal. Everything here is looked up as that signed-in person, so row-level
 * security decides: a project, team, problem or ticket they cannot open is simply not found,
 * and the booking becomes an ordinary anonymous one (or just loses that detail). Nothing in a
 * booking request is trusted to say which project it belongs to, who is booking, where the
 * office is, or which team or problem it is about.
 */
export interface BookingContext {
  projectId: string;
  projectSlug: string;
  projectName: string;
  officeLabel: string | null;
  officeAddress: string | null;
  ticketId: string | null;
  ticketNumber: number | null;
  /** The ticket's own team and problem, to start from when the booking is about a ticket. */
  ticketTopic: { areaId: string | null; problemId: string | null } | null;
  /** The teams of this project the person can open. */
  areas: TopicArea[];
  /** The problems of those teams (and the project-wide ones). */
  problems: TopicProblem[];
  /** The account's own name and email, so a booking can't be made in someone else's name. */
  name: string;
  email: string;
  timeZone: string;
}

/** Just the signed-in person's email, or null. Cheap: no project lookup. */
export async function signedInEmail(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

const first = <T>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));

export async function resolveBookingContext(input: { projectSlug?: string | null; ticketId?: string | null }): Promise<BookingContext | null> {
  const slug = input.projectSlug?.trim() ?? "";
  if (!SLUG.test(slug) || !supabaseConfigured()) return null;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: project } = await supabase.from("projects").select("id,name,slug,office_label,office_address").eq("slug", slug).maybeSingle();
  if (!project) return null;

  // None of these depend on each other, only on the project.
  const [ticketResult, profileResult, areaResult, problemResult] = await Promise.all([
    input.ticketId && UUID.test(input.ticketId)
      ? supabase.from("tickets").select("id,ticket_number,project_id,department_id,milestone_id").eq("id", input.ticketId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("display_name,timezone").eq("id", user.id).maybeSingle(),
    supabase.from("project_departments").select("departments(id,name)").eq("project_id", project.id),
    supabase
      .from("project_milestones")
      .select("id,title,code,priority,department_id")
      .eq("project_id", project.id)
      .order("sort_order")
      .limit(PROBLEM_LIMIT),
  ]);

  const ticket = ticketResult.data && ticketResult.data.project_id === project.id ? ticketResult.data : null;
  const profile = profileResult.data as { display_name: string | null; timezone?: string } | null;

  const areas = ((areaResult.data ?? []) as { departments: unknown }[])
    .map((row) => first(row.departments as { id: string; name: string } | { id: string; name: string }[] | null))
    .filter((d): d is { id: string; name: string } => d !== null)
    .map((d) => ({ id: d.id, name: decryptLoose(d.name) ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Before the problem-details migration these columns don't exist: the booking still works, just without the problem list.
  const problems: TopicProblem[] = problemResult.error
    ? []
    : ((problemResult.data ?? []) as { id: string; title: string; code: string | null; priority: TopicProblem["priority"] | null; department_id: string | null }[]).map((m) => ({
        id: m.id,
        code: decryptLoose(m.code),
        title: decryptLoose(m.title) ?? "",
        priority: m.priority ?? "medium",
        areaId: m.department_id,
      }));

  return {
    projectId: project.id,
    projectSlug: project.slug,
    projectName: decryptLoose(project.name) ?? "",
    officeLabel: decryptLoose(project.office_label),
    officeAddress: decryptLoose(project.office_address),
    ticketId: ticket?.id ?? null,
    ticketNumber: ticket?.ticket_number ?? null,
    ticketTopic: ticket ? { areaId: ticket.department_id, problemId: ticket.milestone_id } : null,
    areas,
    problems,
    name: decryptLoose(profile?.display_name) ?? user.email,
    email: user.email,
    timeZone: timeZoneOrDefault(profile?.timezone),
  };
}
