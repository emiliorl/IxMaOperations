import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptLoose } from "@/lib/field-crypto";
import { syncMeetingsQuietly } from "@/lib/meeting-sync";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { readMeetings } from "./project-meetings";
import { ageInDays, countBy, sortNeedingAttention, weekWindow } from "./week-rules";

/**
 * The owner's "this week": everything coming up in the next seven days and everything waiting on the owner, across
 * every project, in one request. Only ever called for the owner (the page checks), on the owner's own signed-in client, so
 * row-level security still applies to everything read from the portal's tables; meetings are read by the server.
 * Each part is read on its own, so one that fails (a table that does not exist yet) shows as empty instead of
 * taking the whole page down.
 */

/** How many tickets the page lists; the rest are counted. */
const TICKET_LIMIT = 12;

export interface WeekMeeting {
  id: string;
  start: number;
  end: number;
  mode: "online" | "in_person";
  location: string | null;
  meetLink: string | null;
  /** Who booked it. */
  guest: string | null;
  /** Null for a booking made on the public page (no project). */
  projectName: string | null;
  projectSlug: string | null;
  areaName: string | null;
  problem: { code: string | null; title: string } | null;
  ticketNumber: number | null;
}
export interface WeekTicket {
  id: string;
  number: number;
  title: string;
  status: "open" | "in_progress";
  priority: string;
  projectName: string;
  projectSlug: string;
  areaName: string | null;
  ageDays: number;
}
export interface WeekDue {
  id: string;
  code: string | null;
  title: string;
  dueDate: string;
  projectName: string;
  projectSlug: string;
}
export interface WeekVisit {
  date: string;
  start: string;
  end: string;
  projectName: string;
  projectSlug: string;
}
export interface WeekData {
  firstDate: string;
  lastDate: string;
  meetings: WeekMeeting[];
  visits: WeekVisit[];
  tickets: { shown: WeekTicket[]; total: number };
  /** Tickets fixed and waiting for a client to check, by project. */
  waiting: { projectName: string; projectSlug: string; count: number }[];
  due: WeekDue[];
}

type Rows<T> = { data: T[] | null; error: { message: string } | null };
const rowsOf = <T,>(label: string, result: Rows<T>): T[] => {
  if (result.error) console.warn(`[portal] this week: ${label} unavailable: ${result.error.message}`);
  return result.data ?? [];
};
const hhmm = (time: string) => time.slice(0, 5);

export async function loadWeek(supabase: SupabaseClient, now: number, timeZone: string): Promise<WeekData> {
  const window = weekWindow(now, timeZone);
  // A meeting the owner removed or moved in the calendar must show as it is now.
  await syncMeetingsQuietly();

  const [meetingRows, projectRows, areaRows, ticketRows, reviewRows, dueRows, visitRows] = await Promise.all([
    readMeetings((columns) =>
      supabaseAdmin()
        .from("meetings")
        .select(`${columns},project_id`)
        .eq("status", "confirmed")
        .gt("end_time", new Date(now).toISOString())
        .lt("start_time", new Date(window.to).toISOString())
        .order("start_time")
        .limit(60)
    ).catch((error) => {
      console.warn("[portal] this week: meetings unavailable:", error instanceof Error ? error.message : error);
      return [];
    }),
    supabase.from("projects").select("id,name,slug"),
    supabase.from("departments").select("id,name"),
    supabase.from("tickets").select("id,ticket_number,title,status,priority,project_id,department_id,created_at").in("status", ["open", "in_progress"]).limit(500),
    supabase.from("tickets").select("project_id").eq("status", "needs_review").limit(500),
    supabase
      .from("project_milestones")
      .select("id,code,title,due_date,project_id")
      .gte("due_date", window.firstDate)
      .lte("due_date", window.lastDate)
      .neq("status", "completed")
      .order("due_date")
      .limit(60),
    supabase.from("onsite_visits").select("project_id,visit_date,start_time,end_time").gte("visit_date", window.firstDate).lte("visit_date", window.lastDate).order("visit_date"),
  ]);

  const projects = new Map(rowsOf<{ id: string; name: string; slug: string }>("projects", projectRows).map((p) => [p.id, { name: decryptLoose(p.name) ?? "", slug: p.slug }]));
  const areas = new Map(rowsOf<{ id: string; name: string }>("areas", areaRows).map((a) => [a.id, decryptLoose(a.name) ?? ""]));

  // Problems named by the week's meetings (the due ones come with their own names).
  const topicIds = Array.from(new Set(meetingRows.map((m) => m.milestone_id).filter((id): id is string => Boolean(id))));
  const topicRows =
    topicIds.length > 0
      ? rowsOf<{ id: string; code: string | null; title: string }>("problems", await supabase.from("project_milestones").select("id,code,title").in("id", topicIds))
      : [];
  const topics = new Map(topicRows.map((m) => [m.id, { code: decryptLoose(m.code), title: decryptLoose(m.title) ?? "" }]));
  const ticketIds = Array.from(new Set(meetingRows.map((m) => m.ticket_id).filter((id): id is string => Boolean(id))));
  const ticketNumbers = new Map(
    ticketIds.length > 0
      ? rowsOf<{ id: string; ticket_number: number }>("tickets", await supabase.from("tickets").select("id,ticket_number").in("id", ticketIds)).map((t) => [t.id, t.ticket_number] as const)
      : []
  );

  const meetings: WeekMeeting[] = meetingRows.map((row) => {
    const projectId = (row as { project_id?: string | null }).project_id ?? null;
    const project = projectId ? projects.get(projectId) : undefined;
    return {
      id: row.id,
      start: Date.parse(row.start_time),
      end: Date.parse(row.end_time),
      mode: row.mode,
      location: decryptLoose(row.location),
      meetLink: row.meet_link,
      guest: decryptLoose(row.guest_name),
      projectName: project?.name ?? null,
      projectSlug: project?.slug ?? null,
      areaName: (row.department_id && areas.get(row.department_id)) || null,
      problem: (row.milestone_id && topics.get(row.milestone_id)) || null,
      ticketNumber: (row.ticket_id && ticketNumbers.get(row.ticket_id)) || null,
    };
  });

  const needing = sortNeedingAttention(
    rowsOf<{ id: string; ticket_number: number; title: string; status: "open" | "in_progress"; priority: string; project_id: string; department_id: string | null; created_at: string }>("tickets", ticketRows)
      .filter((t) => projects.has(t.project_id))
      .map((t) => ({ ...t, createdAt: Date.parse(t.created_at) }))
  );
  const tickets = {
    total: needing.length,
    shown: needing.slice(0, TICKET_LIMIT).map((t): WeekTicket => ({
      id: t.id,
      number: t.ticket_number,
      title: decryptLoose(t.title) ?? "",
      status: t.status,
      priority: t.priority,
      projectName: projects.get(t.project_id)!.name,
      projectSlug: projects.get(t.project_id)!.slug,
      areaName: (t.department_id && areas.get(t.department_id)) || null,
      ageDays: ageInDays(t.createdAt, now),
    })),
  };

  const waiting = Array.from(countBy(rowsOf<{ project_id: string }>("tickets to check", reviewRows), (t) => t.project_id))
    .filter(([projectId]) => projects.has(projectId))
    .map(([projectId, count]) => ({ projectName: projects.get(projectId)!.name, projectSlug: projects.get(projectId)!.slug, count }))
    .sort((a, b) => b.count - a.count);

  const due = rowsOf<{ id: string; code: string | null; title: string; due_date: string; project_id: string }>("due problems", dueRows)
    .filter((m) => projects.has(m.project_id))
    .map((m): WeekDue => ({ id: m.id, code: decryptLoose(m.code), title: decryptLoose(m.title) ?? "", dueDate: m.due_date, projectName: projects.get(m.project_id)!.name, projectSlug: projects.get(m.project_id)!.slug }));

  const visits = rowsOf<{ project_id: string; visit_date: string; start_time: string; end_time: string }>("on-site days", visitRows)
    .filter((v) => projects.has(v.project_id))
    .map((v): WeekVisit => ({ date: v.visit_date, start: hhmm(v.start_time), end: hhmm(v.end_time), projectName: projects.get(v.project_id)!.name, projectSlug: projects.get(v.project_id)!.slug }));

  return { firstDate: window.firstDate, lastDate: window.lastDate, meetings, visits, tickets, waiting, due };
}
