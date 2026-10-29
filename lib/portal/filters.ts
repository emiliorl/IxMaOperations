import { isActiveTicket } from "./plan";

/**
 * Pure helpers for the project page's two filters (folder, ticket state), so
 * the rules can be tested and so changing one filter never silently drops the
 * other. No I/O.
 */

/**
 * "open"   the owner still has work to do (open, in progress)
 * "review" the owner says it's fixed and is waiting for the person to check
 * "solved" resolved or closed
 */
export const TICKET_FILTERS = ["all", "open", "review", "solved"] as const;
export type TicketFilter = (typeof TICKET_FILTERS)[number];
export type TicketBucket = Exclude<TicketFilter, "all">;

export function ticketBucket(status: string): TicketBucket {
  if (status === "needs_review") return "review";
  return isActiveTicket(status) ? "open" : "solved";
}

export function parseTicketFilter(value: string | undefined): TicketFilter {
  return TICKET_FILTERS.includes(value as TicketFilter) ? (value as TicketFilter) : "all";
}

/**
 * Which folder the page shows: "all" → everything the person can see; a folder
 * they can open → that folder; nothing chosen yet → `defaultFolder` (the
 * person's own folder when they have exactly one); anything else → everything.
 */
export function resolveFolderFilter(
  dept: string | undefined,
  knownFolderIds: ReadonlySet<string>,
  defaultFolder: string | null
): string | null {
  if (dept === "all") return null;
  if (dept && knownFolderIds.has(dept)) return dept;
  return dept === undefined ? defaultFolder : null;
}

/** Project-wide items (no folder) belong to every folder view. */
export function inFolder(folderFilter: string | null, departmentId: string | null): boolean {
  return folderFilter === null || departmentId === null || departmentId === folderFilter;
}

/** Does this ticket belong in the chosen state tab? */
export function matchesTicketFilter(status: string, filter: TicketFilter): boolean {
  return filter === "all" || ticketBucket(status) === filter;
}

/**
 * The workspace shows one part of the project at a time, so nobody scrolls past
 * the plan to reach the tickets.
 *   plan     the problems and their progress
 *   tickets  every ticket, open ones first
 *   team     who is on the project (the owner manages access here)
 *   details  overview, meeting place and links
 */
export const PROJECT_TABS = ["plan", "tickets", "team", "details"] as const;
export type ProjectTab = (typeof PROJECT_TABS)[number];

export function parseProjectTab(value: string | undefined): ProjectTab | null {
  return PROJECT_TABS.includes(value as ProjectTab) ? (value as ProjectTab) : null;
}

/** What was typed in the search box, trimmed and capped (it ends up in the URL). */
export function parseSearch(value: string | undefined): string {
  return (value ?? "").trim().slice(0, 80);
}

/**
 * Does every word typed appear in at least one of the fields? Ignores case and
 * accents ("facturacion" finds "Facturación"), and a leading "#" so "#3" finds ticket 3.
 */
export function matchesQuery(query: string, fields: (string | number | null | undefined)[]): boolean {
  const words = fold(query).replace(/#/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold(fields.filter((f) => f !== null && f !== undefined).join(" "));
  return words.every((word) => haystack.includes(word));
}

function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * How the ticket queue is ordered. Tickets that still need attention always
 * come before resolved ones, except for "newest".
 *   activity  the one that moved most recently first (default)
 *   priority  critical → low, then most recent
 *   newest    when it was opened
 */
export const TICKET_SORTS = ["activity", "priority", "newest"] as const;
export type TicketSort = (typeof TICKET_SORTS)[number];

export function parseTicketSort(value: string | undefined): TicketSort {
  return TICKET_SORTS.includes(value as TicketSort) ? (value as TicketSort) : "activity";
}

const PRIORITY_RANK: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };

/** A new array in the order the queue shows; the input is left alone. */
export function sortTickets<T extends { status: string; priority: string; createdAt: string; updatedAt: string }>(
  tickets: readonly T[],
  sort: TicketSort
): T[] {
  const time = (iso: string) => Date.parse(iso) || 0;
  const needsAttention = (ticket: T) => Number(isActiveTicket(ticket.status));
  return [...tickets].sort((a, b) => {
    if (sort === "newest") return time(b.createdAt) - time(a.createdAt);
    const group = needsAttention(b) - needsAttention(a);
    if (group !== 0) return group;
    if (sort === "priority") {
      const rank = (PRIORITY_RANK[b.priority] ?? 1) - (PRIORITY_RANK[a.priority] ?? 1);
      if (rank !== 0) return rank;
    }
    return time(b.updatedAt) - time(a.updatedAt);
  });
}

/**
 * The few numbers worth seeing before opening any list: what the owner is
 * still working on, what is waiting for the person, and what is stuck.
 */
export function workspaceStats(
  milestones: { status: string }[],
  tickets: { status: string }[]
): { open: number; review: number; solved: number; blocked: number } {
  const count = (bucket: TicketBucket) => tickets.filter((ticket) => ticketBucket(ticket.status) === bucket).length;
  return {
    open: count("open"),
    review: count("review"),
    solved: count("solved"),
    blocked: milestones.filter((m) => m.status === "blocked").length,
  };
}

/**
 * Link to the project page with the given filters. Each link changes one
 * thing and carries the rest along. `dept` is only included when the person
 * actually chose a folder (or "all"), so an untouched page keeps its default.
 */
export function projectFilterHref(
  slug: string,
  filters: { dept?: string; tickets?: TicketFilter; tab?: ProjectTab | null; q?: string; sort?: TicketSort; mine?: boolean }
) {
  const query: Record<string, string> = {};
  if (filters.dept) query.dept = filters.dept;
  if (filters.tab) query.tab = filters.tab;
  if (filters.tickets && filters.tickets !== "all") query.tickets = filters.tickets;
  if (filters.q) query.q = filters.q;
  if (filters.sort && filters.sort !== "activity") query.sort = filters.sort;
  if (filters.mine) query.mine = "1";
  return { pathname: `/portal/projects/${slug}`, query };
}

/**
 * The numbers on one area's card: progress through its plan items (project-wide
 * items count in every area, as in the area view itself), its tickets still
 * being worked on, and those waiting for the person to check.
 */
export function areaSummary(
  areaId: string | null,
  milestones: { status: string; departmentId: string | null }[],
  tickets: { status: string; departmentId: string | null }[]
): { done: number; total: number; percent: number; open: number; review: number } {
  const items = milestones.filter((m) => inFolder(areaId, m.departmentId));
  const done = items.filter((m) => m.status === "completed").length;
  const mine = tickets.filter((ticket) => inFolder(areaId, ticket.departmentId));
  return {
    done,
    total: items.length,
    percent: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
    open: mine.filter((ticket) => ticketBucket(ticket.status) === "open").length,
    review: mine.filter((ticket) => ticketBucket(ticket.status) === "review").length,
  };
}
