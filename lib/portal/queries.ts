import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptLoose } from "@/lib/field-crypto";
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
  createdAt: string;
}

export interface ProjectDetail {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
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

export async function getProjectDetail(supabase: SupabaseClient, slug: string): Promise<ProjectDetail | null> {
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id,organization_id,name,slug,description,status,staging_url,production_url,office_label,office_address,organizations(name)"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load project: ${error.message}`);
  if (!project) return null;

  const [departments, milestones, members, memberFolders, tickets] = await Promise.all([
    supabase.from("project_departments").select("departments(id,name)").eq("project_id", project.id),
    supabase
      .from("project_milestones")
      .select("id,title,description,status,department_id,due_date,sort_order")
      .eq("project_id", project.id)
      .order("sort_order")
      .order("due_date", { nullsFirst: false }),
    supabase.from("project_members").select("user_id,role,all_departments,profiles(display_name)").eq("project_id", project.id),
    supabase.from("project_member_departments").select("user_id,department_id").eq("project_id", project.id),
    supabase
      .from("tickets")
      .select("id,ticket_number,title,status,priority,category,department_id,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  for (const result of [departments, milestones, members, memberFolders, tickets]) {
    if (result.error) throw new Error(`Failed to load project data: ${result.error.message}`);
  }

  const foldersByUser = new Map<string, string[]>();
  for (const row of memberFolders.data ?? []) {
    foldersByUser.set(row.user_id, [...(foldersByUser.get(row.user_id) ?? []), row.department_id]);
  }

  return {
    id: project.id,
    organizationId: project.organization_id,
    name: plain(project.name),
    slug: project.slug,
    description: plainOrNull(project.description),
    status: project.status,
    organization: plainOrNull(one<{ name: string }>(project.organizations as never)?.name),
    stagingUrl: plainOrNull(project.staging_url),
    productionUrl: plainOrNull(project.production_url),
    officeLabel: plainOrNull(project.office_label),
    officeAddress: plainOrNull(project.office_address),
    departments: (departments.data ?? [])
      .map((row) => one<Department>(row.departments as never))
      .filter((d): d is Department => d !== null)
      .map((d) => ({ id: d.id, name: plain(d.name) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    milestones: (milestones.data ?? []).map((m) => ({
      id: m.id,
      title: plain(m.title),
      description: plainOrNull(m.description),
      status: m.status,
      departmentId: m.department_id,
      dueDate: m.due_date,
      sortOrder: m.sort_order,
    })),
    team: (members.data ?? []).map((m) => ({
      userId: m.user_id,
      name: plainOrNull(one<{ display_name: string }>(m.profiles as never)?.display_name) ?? "—",
      role: m.role,
      allDepartments: m.all_departments,
      departmentIds: foldersByUser.get(m.user_id) ?? [],
    })),
    tickets: (tickets.data ?? []).map((t) => ({
      id: t.id,
      number: t.ticket_number,
      title: plain(t.title),
      status: t.status,
      priority: t.priority,
      category: t.category,
      departmentId: t.department_id,
      createdAt: t.created_at,
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
  createdAt: string;
  createdByName: string | null;
  project: { id: string; organizationId: string; name: string; slug: string };
  comments: TicketComment[];
}

export async function getTicketDetail(supabase: SupabaseClient, id: string): Promise<TicketDetail | null> {
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      "id,ticket_number,title,description,status,priority,category,environment,affected_url,department_id,created_at,created_by,projects(id,organization_id,name,slug)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load ticket: ${error.message}`);
  if (!ticket) return null;

  const [comments, department, author] = await Promise.all([
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
  ]);
  if (comments.error) throw new Error(`Failed to load comments: ${comments.error.message}`);

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
}

/** Everyone with company-wide access to a company. Only the owner can read these rows. */
export async function listCompanyAccess(supabase: SupabaseClient, organizationId: string): Promise<CompanyAccessEntry[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id,access_level,profiles(display_name,email)")
    .eq("organization_id", organizationId);
  if (error) throw new Error(`Failed to load company access: ${error.message}`);
  return (data ?? [])
    .map((row) => {
      const profile = one<{ display_name: string; email: string }>(row.profiles as never);
      return {
        userId: row.user_id,
        name: plainOrNull(profile?.display_name) ?? "—",
        email: plain(profile?.email),
        level: row.access_level as OrgAccessLevel,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
