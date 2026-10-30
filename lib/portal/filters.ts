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
 *   onsite   when the owner is at the project's office, and the free stretches
 *   team     who is on the project (the owner manages access here)
 *   details  overview, meeting place and links
 */
export const PROJECT_TABS = ["plan", "tickets", "onsite", "team", "details"] as const;
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
  const words = searchWords(query);
  if (words.length === 0) return true;
  const haystack = fold(fields.filter((f) => f !== null && f !== undefined).join(" "));
  return words.every((word) => haystack.includes(word));
}

/** The words of a search, without case or accents; "#3" is the word "3". */
export function searchWords(query: string): string[] {
  return fold(query).replace(/#/g, " ").split(/\s+/).filter(Boolean);
}

/**
 * Where the searched words are in a text, as [start, end) positions in the text
 * AS WRITTEN (so "facturacion" marks "Facturación"), overlapping ones merged.
 */
export function findMatches(text: string, query: string): [number, number][] {
  const words = searchWords(query);
  if (words.length === 0 || !text) return [];
  // Fold one character at a time, remembering where each folded character came from.
  let folded = "";
  const origin: number[] = [];
  for (let i = 0; i < text.length; i++) {
    for (const ch of fold(text[i])) {
      folded += ch;
      origin.push(i);
    }
  }
  const found: [number, number][] = [];
  for (const word of words) {
    for (let at = folded.indexOf(word); at !== -1; at = folded.indexOf(word, at + word.length)) {
      found.push([origin[at], origin[at + word.length - 1] + 1]);
    }
  }
  found.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged: [number, number][] = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

/** A short piece of the text around the first match, on one line; null when nothing matches. */
export function snippet(text: string, query: string, radius = 60): string | null {
  const flat = text.replace(/\s+/g, " ").trim();
  const [first] = findMatches(flat, query);
  if (!first) return null;
  let start = Math.max(0, first[0] - radius);
  let end = Math.min(flat.length, first[1] + radius);
  // Don't cut a word in half at either edge.
  if (start > 0) {
    const space = flat.indexOf(" ", start);
    if (space !== -1 && space < first[0]) start = space + 1;
  }
  if (end < flat.length) {
    const space = flat.lastIndexOf(" ", end);
    if (space > first[1]) end = space;
  }
  return (start > 0 ? "…" : "") + flat.slice(start, end) + (end < flat.length ? "…" : "");
}

export interface SearchHit {
  /** 4 the ID itself, 3 in the title or ID, 2 in the other fields, 1 only in the longer texts. */
  score: number;
  /** Where the match is when the title does not show it, e.g. a comment. */
  extra: { source: string; snippet: string } | null;
}

/**
 * Does this problem or ticket match the search, and how well? Every word has to
 * appear somewhere across its fields and longer texts (description, comments,
 * action plan), so a search finds what a person remembers, not just a title.
 */
export function searchHit(
  query: string,
  item: {
    /** What it is called: "FIN-1", 12. Typing exactly one of these is an exact match. */
    ids: (string | number | null | undefined)[];
    title: string;
    fields: (string | null | undefined)[];
    /** Longer texts, each labelled with where it is from. */
    extras: { source: string; text: string }[];
  }
): SearchHit | null {
  const words = searchWords(query);
  if (words.length === 0) return null;
  const ids = item.ids.filter((id): id is string | number => id !== null && id !== undefined).map(String);
  const present = (texts: (string | null | undefined)[]) => {
    const haystack = fold(texts.filter(Boolean).join(" "));
    return words.every((word) => haystack.includes(word));
  };
  const primary = [item.title, ...ids, ...item.fields];
  if (!present([...primary, ...item.extras.map((extra) => extra.text)])) return null;

  const typed = words.join(" ");
  const exact = ids.some((id) => fold(id).replace(/#/g, "") === typed);
  const score = exact ? 4 : present([item.title, ...ids]) ? 3 : present(primary) ? 2 : 1;

  let extra: SearchHit["extra"] = null;
  if (score < 3) {
    for (const candidate of item.extras) {
      const excerpt = snippet(candidate.text, query);
      if (excerpt) {
        extra = { source: candidate.source, snippet: excerpt };
        break;
      }
    }
  }
  return { score, extra };
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
 * The problems table sorts by clicking a column heading: first click ascending,
 * second descending, third back to plan order. "-" in front means descending.
 * Ascending is the natural reading order: ID A→Z, most urgent status or priority
 * first, soonest due date first (no date last), fewest open tickets first.
 */
export const PLAN_SORT_KEYS = ["code", "title", "area", "status", "priority", "due", "tickets"] as const;
export type PlanSortKey = (typeof PLAN_SORT_KEYS)[number];
export type PlanSort = { key: PlanSortKey; desc: boolean } | null;

export function parsePlanSort(value: string | undefined): PlanSort {
  const desc = value?.startsWith("-") ?? false;
  const key = (desc ? value!.slice(1) : value) as PlanSortKey;
  return PLAN_SORT_KEYS.includes(key) ? { key, desc } : null;
}

/** The URL value for a sort (undefined = plan order, which is left out of the URL). */
export function planSortParam(sort: PlanSort): string | undefined {
  return sort ? (sort.desc ? "-" : "") + sort.key : undefined;
}

/** What clicking a column heading does next. */
export function nextPlanSort(current: PlanSort, key: PlanSortKey): PlanSort {
  if (!current || current.key !== key) return { key, desc: false };
  return current.desc ? null : { key, desc: true };
}

const STATUS_RANK: Record<string, number> = { blocked: 0, in_progress: 1, pending: 2, completed: 3 };
const PROBLEM_PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** A new array in the order the table shows; with no sort it is the plan order it came in. */
export function sortProblems<T extends { id: string; code: string | null; title: string; status: string; priority: string; dueDate: string | null; departmentId: string | null }>(
  items: readonly T[],
  sort: PlanSort,
  context: { areaLabel: (departmentId: string | null) => string; openTickets: (id: string) => number }
): T[] {
  if (!sort) return [...items];
  const text = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  const compare = (a: T, b: T): number => {
    switch (sort.key) {
      case "code":
        // A problem without an ID goes last, whichever way the column is sorted.
        return text(a.code ?? "\uffff", b.code ?? "\uffff");
      case "title":
        return text(a.title, b.title);
      case "area":
        return text(context.areaLabel(a.departmentId), context.areaLabel(b.departmentId));
      case "status":
        return (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
      case "priority":
        return (PROBLEM_PRIORITY_RANK[a.priority] ?? 1) - (PROBLEM_PRIORITY_RANK[b.priority] ?? 1);
      case "due":
        return 0; // handled below: the missing date is always last
      case "tickets":
        return context.openTickets(a.id) - context.openTickets(b.id);
    }
  };
  return items
    .map((item, position) => ({ item, position }))
    .sort((x, y) => {
      if (sort.key === "due") {
        // No date is always last, whichever way the column is sorted.
        if (x.item.dueDate === null || y.item.dueDate === null) {
          return x.item.dueDate === y.item.dueDate ? x.position - y.position : x.item.dueDate === null ? 1 : -1;
        }
        const byDate = x.item.dueDate.localeCompare(y.item.dueDate);
        return (sort.desc ? -byDate : byDate) || x.position - y.position;
      }
      if (sort.key === "code" && (x.item.code === null || y.item.code === null) && x.item.code !== y.item.code) {
        return x.item.code === null ? 1 : -1;
      }
      const result = compare(x.item, y.item);
      return (sort.desc ? -result : result) || x.position - y.position;
    })
    .map(({ item }) => item);
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
  filters: { dept?: string; tickets?: TicketFilter; tab?: ProjectTab | null; q?: string; sort?: TicketSort; mine?: boolean; psort?: string }
) {
  const query: Record<string, string> = {};
  if (filters.dept) query.dept = filters.dept;
  if (filters.tab) query.tab = filters.tab;
  if (filters.tickets && filters.tickets !== "all") query.tickets = filters.tickets;
  if (filters.q) query.q = filters.q;
  if (filters.sort && filters.sort !== "activity") query.sort = filters.sort;
  if (filters.mine) query.mine = "1";
  if (filters.psort) query.psort = filters.psort;
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
