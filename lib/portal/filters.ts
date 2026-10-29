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
 * Link to the project page with the given filters. Each link changes one
 * filter and carries the other along. `dept` is only included when the person
 * actually chose a folder (or "all"), so an untouched page keeps its default.
 */
export function projectFilterHref(slug: string, filters: { dept?: string; tickets?: TicketFilter }) {
  const query: Record<string, string> = {};
  if (filters.dept) query.dept = filters.dept;
  if (filters.tickets && filters.tickets !== "all") query.tickets = filters.tickets;
  return { pathname: `/portal/projects/${slug}`, query };
}
