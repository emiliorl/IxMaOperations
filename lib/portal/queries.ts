import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptLoose } from "@/lib/field-crypto";
import { INLINE_TYPES } from "./attachments";
import type { LogEvent } from "./log";
import { parseResources, type ProblemPriority, type ResourceLink } from "./plan";
import type {
  MilestoneStatus,
  ProjectStatus,
  TicketCategory,
  TicketEnvironment,
  TicketPriority,
  TicketStatus,
} from "./constants";

/**
 * Read queries for the portal. They run on the SIGNED-IN USER's client, so
 * Postgres row-level security returns only what that person may see — these
 * functions deliberately do no access filtering of their own. A row the user
 * can't see simply isn't returned (a hidden project, folder or ticket looks
 * identical to one that doesn't exist, so nothing leaks through error
 * messages). In particular, `departments` below is the list of FOLDERS the
 * viewer can open, not every department on the project.
 */

export type OrgAccessLevel = "view" | "full";

export interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  organization: string | null;
}

export interface Department {
  id: string;
  name: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  departmentId: string | null;
  dueDate: string | null;
  sortOrder: number;
  /** "DW-1". Null until the problem-details migration is applied, or if the item has none. */
  code: string | null;
  priority: ProblemPriority;
  /** How it is delivered, e.g. "Recommendation" / "Prompts". */
  delivery: string | null;
  /** One-line proposed solution. */
  summary: string | null;
}

export interface TeamMember {
  userId: string;
  name: string;
  role: "lead" | "member";
  /** Has every folder of the project. */
  allDepartments: boolean;
  /** Folders granted to this person that the viewer is allowed to see. */
  departmentIds: string[];
}

export interface TicketSummary {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  departmentId: string | null;
  /** The plan item (problem) this ticket is about, if any. */
  milestoneId: string | null;
  createdAt: string;
  /** Who opened it. Null when unknown or when the viewer isn't allowed to see the name. */
  createdByName: string | null;
}

export interface ProjectDetail {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  /** Markdown overview of the engagement (context, tools, timeline). Never holds costs. */
  overview: string | null;
  status: ProjectStatus;
  organization: string | null;
  stagingUrl: string | null;
  productionUrl: string | null;
  officeLabel: string | null;
  officeAddress: string | null;
  /** The folders the viewer can open. */
  departments: Department[];
  milestones: Milestone[];
  team: TeamMember[];
  tickets: TicketSummary[];
}

/** Decrypts a text column; a missing value becomes an empty string. */
const plain = (value: string | null | undefined): string => decryptLoose(value) ?? "";
/** Same, but keeps "no value" as null. */
const plainOrNull = (value: string | null | undefined): string | null => decryptLoose(value);

// PostgREST types an embedded to-one relation as an object or an array
// depending on the client's generics; normalise either shape.
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function listProjects(supabase: SupabaseClient): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,slug,status,organizations(name)");
  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      name: plain(row.name),
      slug: row.slug,
      status: row.status,
      organization: plainOrNull(one<{ name: string }>(row.organizations as never)?.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Just enough of a project for pages that don't show its plan, tickets or team. */
export interface ProjectShell {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  /** The folders the viewer can open. */
  departments: Department[];
}

/** One request: the project row plus the folders the viewer can open (row-level security applies to both). */
export async function getProjectShell(supabase: SupabaseClient, slug: string): Promise<ProjectShell | null> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id,organization_id,name,slug,project_departments(departments(id,name))")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load project: ${error.message}`);
  if (!project) return null;
  return {
    id: project.id,
    organizationId: project.organization_id,
    name: plain(project.name),
    slug: project.slug,
    departments: ((project.project_departments ?? []) as { departments: unknown }[])
      .map((row) => one<Department>(row.departments as never))
      .filter((d): d is Department => d !== null)
      .map((d) => ({ id: d.id, name: plain(d.name) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** A project row with everything the project page shows, as one request returns it. */
interface ProjectDetailRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  overview?: string | null;
  status: ProjectStatus;
  staging_url: string | null;
  production_url: string | null;
  office_label: string | null;
  office_address: string | null;
  organizations: unknown;
  project_departments: { departments: unknown }[] | null;
  project_milestones:
    | {
        id: string;
        title: string;
        description: string | null;
        status: MilestoneStatus;
        department_id: string | null;
        due_date: string | null;
        sort_order: number;
        code?: string | null;
        priority?: ProblemPriority;
        delivery?: string | null;
        summary?: string | null;
      }[]
    | null;
  project_members:
    | {
        user_id: string;
        role: "lead" | "member";
        all_departments: boolean;
        profiles: unknown;
        project_member_departments: { department_id: string }[] | null;
      }[]
    | null;
  tickets:
    | {
        id: string;
        ticket_number: number;
        title: string;
        status: TicketStatus;
        priority: TicketPriority;
        category: TicketCategory;
        department_id: string | null;
        milestone_id: string | null;
        created_at: string;
        profiles: unknown;
      }[]
    | null;
}

const PROJECT_CORE =
  "id,organization_id,name,slug,description,status,staging_url,production_url,office_label,office_address,organizations(name)," +
  "project_departments(departments(id,name))," +
  "project_members(user_id,role,all_departments,profiles(display_name),project_member_departments(department_id))," +
  "tickets(id,ticket_number,title,status,priority,category,department_id,milestone_id,created_at,profiles!created_by(display_name))";

/**
 * Everything for the project page in ONE request: the project, its folders,
 * plan items, team (with their folders) and tickets (with who opened them) are
 * embedded through the foreign keys. Row-level security applies to every
 * embedded table exactly as it would to a separate query.
 */
export async function getProjectDetail(supabase: SupabaseClient, slug: string): Promise<ProjectDetail | null> {
  const run = (extended: boolean) =>
    supabase
      .from("projects")
      .select(
        PROJECT_CORE +
          (extended
            ? ",overview,project_milestones(id,title,description,status,department_id,due_date,sort_order,code,priority,delivery,summary)"
            : ",project_milestones(id,title,description,status,department_id,due_date,sort_order)")
      )
      .eq("slug", slug)
      .order("sort_order", { referencedTable: "project_milestones" })
      .order("due_date", { referencedTable: "project_milestones", nullsFirst: false })
      .order("created_at", { referencedTable: "tickets", ascending: false })
      .limit(200, { referencedTable: "tickets" })
      .maybeSingle();

  let { data, error } = await run(true);
  // Before the problem-details migration the newer columns don't exist: the rest of the page still loads.
  if (error) {
    console.warn(`[portal] plan-item details unavailable: ${error.message}`);
    ({ data, error } = await run(false));
  }
  if (error) throw new Error(`Failed to load project: ${error.message}`);
  const project = data as unknown as ProjectDetailRow | null;
  if (!project) return null;

  return {
    id: project.id,
    organizationId: project.organization_id,
    name: plain(project.name),
    slug: project.slug,
    description: plainOrNull(project.description),
    overview: plainOrNull(project.overview),
    status: project.status,
    organization: plainOrNull(one<{ name: string }>(project.organizations as never)?.name),
    stagingUrl: plainOrNull(project.staging_url),
    productionUrl: plainOrNull(project.production_url),
    officeLabel: plainOrNull(project.office_label),
    officeAddress: plainOrNull(project.office_address),
    departments: (project.project_departments ?? [])
      .map((row) => one<Department>(row.departments as never))
      .filter((d): d is Department => d !== null)
      .map((d) => ({ id: d.id, name: plain(d.name) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    milestones: (project.project_milestones ?? []).map((m) => ({
      id: m.id,
      title: plain(m.title),
      description: plainOrNull(m.description),
      status: m.status,
      departmentId: m.department_id,
      dueDate: m.due_date,
      sortOrder: m.sort_order,
      code: plainOrNull(m.code),
      priority: m.priority ?? "medium",
      delivery: plainOrNull(m.delivery),
      summary: plainOrNull(m.summary),
    })),
    team: (project.project_members ?? []).map((m) => ({
      userId: m.user_id,
      name: plainOrNull(one<{ display_name: string }>(m.profiles as never)?.display_name) ?? "—",
      role: m.role,
      allDepartments: m.all_departments,
      departmentIds: (m.project_member_departments ?? []).map((row) => row.department_id),
    })),
    tickets: (project.tickets ?? []).map((t) => ({
      id: t.id,
      number: t.ticket_number,
      title: plain(t.title),
      status: t.status,
      priority: t.priority,
      category: t.category,
      departmentId: t.department_id,
      milestoneId: t.milestone_id,
      createdAt: t.created_at,
      createdByName: plainOrNull(one<{ display_name: string }>(t.profiles as never)?.display_name),
    })),
  };
}

export interface ProjectAccess {
  /** Directly on this project's team. */
  isMember: boolean;
  allDepartments: boolean;
  departmentIds: string[];
  /** Company-wide access held by the viewer for this project's company, if any. */
  orgLevel: OrgAccessLevel | null;
}

/**
 * What the viewer's own access to a project looks like. Used only to decide
 * what to SHOW (hide "New ticket" from a view-only executive, lock a folder
 * picker). It is never the security check — the database refuses a forbidden
 * write regardless of what the page showed.
 */
export async function getProjectAccess(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  organizationId: string
): Promise<ProjectAccess> {
  const [member, folders, org] = await Promise.all([
    supabase.from("project_members").select("all_departments").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
    supabase.from("project_member_departments").select("department_id").eq("project_id", projectId).eq("user_id", userId),
    supabase.from("organization_members").select("access_level").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle(),
  ]);
  return {
    isMember: Boolean(member.data),
    allDepartments: Boolean(member.data?.all_departments),
    departmentIds: (folders.data ?? []).map((row) => row.department_id),
    orgLevel: (org.data?.access_level as OrgAccessLevel | undefined) ?? null,
  };
}

/** Can this person open tickets / comment in the given folder (null = project-wide)? */
export function canWriteIn(access: ProjectAccess, isAdmin: boolean, departmentId: string | null): boolean {
  if (isAdmin || access.orgLevel === "full") return true;
  if (!access.isMember) return false;
  return departmentId === null || access.allDepartments || access.departmentIds.includes(departmentId);
}

/** The folders a person may open tickets in (project-wide is always allowed to members). */
export function writableDepartments(access: ProjectAccess, isAdmin: boolean, folders: Department[]): Department[] {
  if (isAdmin || access.orgLevel === "full" || access.allDepartments) return folders;
  return folders.filter((d) => access.departmentIds.includes(d.id));
}

export function canOpenTickets(access: ProjectAccess, isAdmin: boolean): boolean {
  return isAdmin || access.orgLevel === "full" || access.isMember;
}

export interface AttachmentInfo {
  id: string;
  /** null = attached to the ticket itself; otherwise the comment it belongs to. */
  commentId: string | null;
  name: string;
  mime: string;
  size: number;
  /** Safe to display as a thumbnail (never SVG). */
  isImage: boolean;
}

export interface TicketComment {
  id: string;
  message: string;
  internal: boolean;
  authorName: string;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  environment: TicketEnvironment;
  affectedUrl: string | null;
  departmentId: string | null;
  departmentName: string | null;
  /** Title of the plan item this ticket is about, if any. */
  planItem: string | null;
  planItemId: string | null;
  planItemCode: string | null;
  attachments: AttachmentInfo[];
  createdAt: string;
  createdByName: string | null;
  project: { id: string; organizationId: string; name: string; slug: string };
  comments: TicketComment[];
}

export async function getTicketDetail(supabase: SupabaseClient, id: string): Promise<TicketDetail | null> {
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      "id,ticket_number,title,description,status,priority,category,environment,affected_url,department_id,milestone_id,created_at,created_by,projects(id,organization_id,name,slug)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load ticket: ${error.message}`);
  if (!ticket) return null;

  const [comments, department, author, planItem, files, planCode] = await Promise.all([
    supabase
      .from("ticket_comments")
      .select("id,message,is_internal,created_at,profiles(display_name)")
      .eq("ticket_id", ticket.id)
      .order("created_at"),
    ticket.department_id
      ? supabase.from("departments").select("name").eq("id", ticket.department_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    ticket.created_by
      ? supabase.from("profiles").select("display_name").eq("id", ticket.created_by).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    ticket.milestone_id
      ? supabase.from("project_milestones").select("title").eq("id", ticket.milestone_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("ticket_attachments")
      .select("id,comment_id,file_name,mime_type,size_bytes")
      .eq("ticket_id", ticket.id)
      .order("created_at"),
    // Separate from the title so it still works before the problem-details migration.
    ticket.milestone_id
      ? supabase.from("project_milestones").select("code").eq("id", ticket.milestone_id).maybeSingle()
      : Promise.resolve({ data: null as { code: string | null } | null, error: null }),
  ]);
  if (comments.error) throw new Error(`Failed to load comments: ${comments.error.message}`);
  // A problem loading files must not take the whole ticket down: log it, show the ticket without them.
  if (files.error) console.error(`[portal] could not load attachments for ticket ${ticket.id}: ${files.error.message}`);

  const project = one<{ id: string; organization_id: string; name: string; slug: string }>(ticket.projects as never);
  if (!project) return null;

  return {
    id: ticket.id,
    number: ticket.ticket_number,
    title: plain(ticket.title),
    description: plain(ticket.description),
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    environment: ticket.environment,
    affectedUrl: plainOrNull(ticket.affected_url),
    departmentId: ticket.department_id,
    departmentName: plainOrNull((department.data as { name: string } | null)?.name),
    createdAt: ticket.created_at,
    createdByName: plainOrNull((author.data as { display_name: string } | null)?.display_name),
    planItem: plainOrNull((planItem.data as { title: string } | null)?.title),
    planItemId: ticket.milestone_id,
    planItemCode: plainOrNull(planCode.data?.code),
    attachments: (files.data ?? []).map((row) => {
      const mime = plain(row.mime_type);
      return {
        id: row.id,
        commentId: row.comment_id,
        name: plain(row.file_name) || "file",
        mime,
        size: row.size_bytes,
        isImage: INLINE_TYPES.has(mime),
      };
    }),
    project: { id: project.id, organizationId: project.organization_id, name: plain(project.name), slug: project.slug },
    comments: (comments.data ?? []).map((c) => ({
      id: c.id,
      message: plain(c.message),
      internal: c.is_internal,
      authorName: plainOrNull(one<{ display_name: string }>(c.profiles as never)?.display_name) ?? "—",
      createdAt: c.created_at,
    })),
  };
}

// ---------------------------------------------------------------- owner view

export interface CompanyAccessEntry {
  userId: string;
  name: string;
  email: string;
  level: OrgAccessLevel;
  /** The extra "can see costs" switch (people with level "full" always can). */
  canViewCosts: boolean;
}

/** Owner view: who has been given the "can see costs" switch on this project. */
export async function listProjectCostFlags(supabase: SupabaseClient, projectId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("can_view_costs", true);
  if (error) {
    console.warn(`[portal] cost access unavailable: ${error.message}`);
    return [];
  }
  return (data ?? []).map((row) => row.user_id as string);
}

/** Everyone with company-wide access to a company. Only the owner can read these rows. */
export async function listCompanyAccess(supabase: SupabaseClient, organizationId: string): Promise<CompanyAccessEntry[]> {
  const [{ data, error }, flagged] = await Promise.all([
    supabase.from("organization_members").select("user_id,access_level,profiles(display_name,email)").eq("organization_id", organizationId),
    // Separate so the screen still loads before the problem-details migration.
    supabase.from("organization_members").select("user_id").eq("organization_id", organizationId).eq("can_view_costs", true),
  ]);
  if (error) throw new Error(`Failed to load company access: ${error.message}`);
  const costUsers = new Set((flagged.error ? [] : (flagged.data ?? [])).map((row) => row.user_id as string));
  return (data ?? [])
    .map((row) => {
      const profile = one<{ display_name: string; email: string }>(row.profiles as never);
      return {
        userId: row.user_id,
        name: plainOrNull(profile?.display_name) ?? "—",
        email: plain(profile?.email),
        level: row.access_level as OrgAccessLevel,
        canViewCosts: costUsers.has(row.user_id),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ------------------------------------------------------------------- problems

export interface ProblemDetail {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  departmentId: string | null;
  dueDate: string | null;
  code: string | null;
  priority: ProblemPriority;
  delivery: string | null;
  summary: string | null;
  /** The action plan, Markdown. */
  solution: string | null;
  resources: ResourceLink[];
  /**
   * Cost information. Null whenever the database didn't hand it over — either
   * there is none, or this viewer isn't allowed to see costs (the two look
   * the same on purpose).
   */
  cost: string | null;
  tickets: TicketSummary[];
}

export async function getProblem(supabase: SupabaseClient, projectId: string, milestoneId: string): Promise<ProblemDetail | null> {
  // All four only need the ids we already have, so they run together. If the
  // item turns out not to exist (or isn't visible), the rest is simply discarded.
  const [itemResult, details, cost, tickets] = await Promise.all([
    supabase
      .from("project_milestones")
      .select("id,title,description,status,department_id,due_date")
      .eq("id", milestoneId)
      .eq("project_id", projectId)
      .maybeSingle(),
    // Own query so a database without the problem-details migration still serves the item.
    supabase.from("project_milestones").select("code,priority,delivery,summary,solution,resources").eq("id", milestoneId).eq("project_id", projectId).maybeSingle(),
    supabase.from("problem_costs").select("cost_note").eq("milestone_id", milestoneId).maybeSingle(),
    supabase
      .from("tickets")
      .select("id,ticket_number,title,status,priority,category,department_id,milestone_id,created_at,profiles!created_by(display_name)")
      .eq("project_id", projectId)
      .eq("milestone_id", milestoneId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (itemResult.error) throw new Error(`Failed to load plan item: ${itemResult.error.message}`);
  const item = itemResult.data;
  if (!item) return null;
  if (tickets.error) throw new Error(`Failed to load tickets: ${tickets.error.message}`);
  if (details.error) console.warn(`[portal] plan-item details unavailable: ${details.error.message}`);
  if (cost.error) console.warn(`[portal] costs unavailable: ${cost.error.message}`);

  const extra = (details.data ?? null) as {
    code: string | null;
    priority: ProblemPriority;
    delivery: string | null;
    summary: string | null;
    solution: string | null;
    resources: string | null;
  } | null;

  return {
    id: item.id,
    title: plain(item.title),
    description: plainOrNull(item.description),
    status: item.status,
    departmentId: item.department_id,
    dueDate: item.due_date,
    code: plainOrNull(extra?.code),
    priority: extra?.priority ?? "medium",
    delivery: plainOrNull(extra?.delivery),
    summary: plainOrNull(extra?.summary),
    solution: plainOrNull(extra?.solution),
    resources: parseResources(plainOrNull(extra?.resources)),
    cost: plainOrNull((cost.data as { cost_note: string } | null)?.cost_note),
    tickets: (tickets.data ?? []).map((t) => ({
      id: t.id,
      number: t.ticket_number,
      title: plain(t.title),
      status: t.status,
      priority: t.priority,
      category: t.category,
      departmentId: t.department_id,
      milestoneId: t.milestone_id,
      createdAt: t.created_at,
      createdByName: plainOrNull(one<{ display_name: string }>(t.profiles as never)?.display_name),
    })),
  };
}

// ------------------------------------------------------------------------ log

export interface LogEntry extends LogEvent {
  departmentId: string | null;
  ticketNumber: number | null;
  ticketTitle: string | null;
  problemCode: string | null;
  problemTitle: string | null;
  /** Null when the viewer can't see who did it. */
  actorName: string | null;
}

/**
 * Newest-first events for a project, optionally limited to [from, to) (epoch
 * ms). Row-level security already limits them to the viewer's folders. The
 * titles come from the tickets / plan items, which are fetched separately so
 * the log itself never holds readable text.
 */
export async function getProjectEvents(
  supabase: SupabaseClient,
  projectId: string,
  range: { from: number; to: number } | null,
  limit = 500,
  /** Narrow in the database (not after the fact) so a busy project can't push an item's own history past the limit. */
  only: { milestoneId?: string; excludeKind?: LogEvent["kind"] } = {}
): Promise<LogEntry[]> {
  // The ticket, plan item and person behind each event come along in the same
  // request (embedded through the foreign keys), so there are no follow-up
  // lookups and no long id lists in the URL. Row-level security applies to the
  // embedded rows too: anything the viewer can't see comes back as null.
  const run = (itemColumns: string) => {
    let query = supabase
      .from("project_events")
      .select(
        `id,kind,ticket_id,milestone_id,department_id,from_status,to_status,actor_id,created_at,tickets(ticket_number,title),project_milestones(${itemColumns}),profiles(display_name)`
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (only.milestoneId) query = query.eq("milestone_id", only.milestoneId);
    if (only.excludeKind) query = query.neq("kind", only.excludeKind);
    if (range) query = query.gte("created_at", new Date(range.from).toISOString()).lt("created_at", new Date(range.to).toISOString());
    return query;
  };

  let { data, error } = await run("title,code");
  // Before the problem-details migration `code` doesn't exist: retry without it.
  if (error) ({ data, error } = await run("title"));
  if (error) {
    // Before the log migration the table doesn't exist: show an empty log rather than an error page.
    console.warn(`[portal] project log unavailable: ${error.message}`);
    return [];
  }
  // The column list is built at runtime, so the client can't infer the row type.
  const rows = (data ?? []) as unknown as {
    id: string;
    kind: LogEvent["kind"];
    ticket_id: string | null;
    milestone_id: string | null;
    department_id: string | null;
    from_status: LogEvent["fromStatus"];
    to_status: LogEvent["toStatus"];
    actor_id: string | null;
    created_at: string;
    tickets: unknown;
    project_milestones: unknown;
    profiles: unknown;
  }[];

  return rows.map((r) => {
    const ticket = one<{ ticket_number: number; title: string }>(r.tickets as never);
    const item = one<{ title: string; code?: string | null }>(r.project_milestones as never);
    const actor = one<{ display_name: string }>(r.profiles as never);
    return {
      id: r.id,
      kind: r.kind,
      ticketId: r.ticket_id,
      milestoneId: r.milestone_id,
      departmentId: r.department_id,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      actorId: r.actor_id,
      createdAt: r.created_at,
      ticketNumber: ticket ? ticket.ticket_number : null,
      ticketTitle: ticket ? plain(ticket.title) : null,
      problemCode: plainOrNull(item?.code),
      problemTitle: item ? plain(item.title) : null,
      actorName: plainOrNull(actor?.display_name),
    };
  });
}
