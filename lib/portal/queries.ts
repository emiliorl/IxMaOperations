import type { SupabaseClient } from "@supabase/supabase-js";
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
 * can't see simply isn't returned (a hidden project looks identical to one
 * that doesn't exist, so nothing leaks through error messages).
 */

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
  departmentId: string | null;
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
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  organization: string | null;
  stagingUrl: string | null;
  productionUrl: string | null;
  officeLabel: string | null;
  officeAddress: string | null;
  departments: Department[];
  milestones: Milestone[];
  team: TeamMember[];
  tickets: TicketSummary[];
}

// PostgREST types an embedded to-one relation as an object or an array
// depending on the client's generics; normalise either shape.
function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function listProjects(supabase: SupabaseClient): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,slug,status,organizations(name)")
    .order("name");
  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    organization: one<{ name: string }>(row.organizations as never)?.name ?? null,
  }));
}

export async function getProjectDetail(supabase: SupabaseClient, slug: string): Promise<ProjectDetail | null> {
  const { data: project, error } = await supabase
    .from("projects")
    .select(
      "id,name,slug,description,status,staging_url,production_url,office_label,office_address,organizations(name)"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Failed to load project: ${error.message}`);
  if (!project) return null;

  const [departments, milestones, members, tickets] = await Promise.all([
    supabase.from("project_departments").select("departments(id,name)").eq("project_id", project.id),
    supabase
      .from("project_milestones")
      .select("id,title,description,status,department_id,due_date,sort_order")
      .eq("project_id", project.id)
      .order("sort_order")
      .order("due_date", { nullsFirst: false }),
    supabase.from("project_members").select("user_id,role,department_id,profiles(display_name)").eq("project_id", project.id),
    supabase
      .from("tickets")
      .select("id,ticket_number,title,status,priority,category,department_id,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  for (const result of [departments, milestones, members, tickets]) {
    if (result.error) throw new Error(`Failed to load project data: ${result.error.message}`);
  }

  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    status: project.status,
    organization: one<{ name: string }>(project.organizations as never)?.name ?? null,
    stagingUrl: project.staging_url,
    productionUrl: project.production_url,
    officeLabel: project.office_label,
    officeAddress: project.office_address,
    departments: (departments.data ?? [])
      .map((row) => one<Department>(row.departments as never))
      .filter((d): d is Department => d !== null)
      .sort((a, b) => a.name.localeCompare(b.name)),
    milestones: (milestones.data ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      status: m.status,
      departmentId: m.department_id,
      dueDate: m.due_date,
      sortOrder: m.sort_order,
    })),
    team: (members.data ?? []).map((m) => ({
      userId: m.user_id,
      name: one<{ display_name: string }>(m.profiles as never)?.display_name ?? "—",
      role: m.role,
      departmentId: m.department_id,
    })),
    tickets: (tickets.data ?? []).map((t) => ({
      id: t.id,
      number: t.ticket_number,
      title: t.title,
      status: t.status,
      priority: t.priority,
      category: t.category,
      departmentId: t.department_id,
      createdAt: t.created_at,
    })),
  };
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
  project: { id: string; name: string; slug: string };
  comments: TicketComment[];
}

export async function getTicketDetail(supabase: SupabaseClient, id: string): Promise<TicketDetail | null> {
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select(
      "id,ticket_number,title,description,status,priority,category,environment,affected_url,department_id,created_at,created_by,projects(id,name,slug)"
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

  const project = one<{ id: string; name: string; slug: string }>(ticket.projects as never);
  if (!project) return null;

  return {
    id: ticket.id,
    number: ticket.ticket_number,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    environment: ticket.environment,
    affectedUrl: ticket.affected_url,
    departmentId: ticket.department_id,
    departmentName: (department.data as { name: string } | null)?.name ?? null,
    createdAt: ticket.created_at,
    createdByName: (author.data as { display_name: string } | null)?.display_name ?? null,
    project,
    comments: (comments.data ?? []).map((c) => ({
      id: c.id,
      message: c.message,
      internal: c.is_internal,
      authorName: one<{ display_name: string }>(c.profiles as never)?.display_name ?? "—",
      createdAt: c.created_at,
    })),
  };
}
