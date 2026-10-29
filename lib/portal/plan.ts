import { safeHttpUrl } from "./constants";

/**
 * Helpers for problems (plan items): how many tickets are still open, and the
 * list of links attached to a problem. Pure; no I/O.
 */

export const PROBLEM_PRIORITIES = ["high", "medium", "low"] as const;
export type ProblemPriority = (typeof PROBLEM_PRIORITIES)[number];

/** Tickets that still need attention (everything except resolved / closed). */
export const ACTIVE_TICKET_STATUSES = ["open", "in_progress", "needs_review"] as const;
export const isActiveTicket = (status: string): boolean => (ACTIVE_TICKET_STATUSES as readonly string[]).includes(status);

export function ticketCountsByProblem(
  tickets: { milestoneId: string | null; status: string }[]
): Map<string, { open: number; total: number }> {
  const counts = new Map<string, { open: number; total: number }>();
  for (const ticket of tickets) {
    if (!ticket.milestoneId) continue;
    const entry = counts.get(ticket.milestoneId) ?? { open: 0, total: 0 };
    entry.total++;
    if (isActiveTicket(ticket.status)) entry.open++;
    counts.set(ticket.milestoneId, entry);
  }
  return counts;
}

export interface ResourceLink {
  label: string;
  url: string;
}

export const MAX_RESOURCES = 20;

/** Reads the stored list of links back; anything malformed or not http(s) is dropped, never rendered. */
export function parseResources(raw: string | null | undefined): ResourceLink[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .flatMap((item): ResourceLink[] => {
        if (typeof item !== "object" || item === null) return [];
        const { label, url } = item as Record<string, unknown>;
        const safe = typeof url === "string" ? safeHttpUrl(url) : null;
        return safe ? [{ label: typeof label === "string" && label.trim() ? label.trim().slice(0, 200) : safe, url: safe }] : [];
      })
      .slice(0, MAX_RESOURCES);
  } catch {
    return [];
  }
}

/** Validates and serialises links for storage. Returns null if any link is unusable. */
export function serializeResources(links: { label?: string; url: string }[]): string | null {
  if (links.length > MAX_RESOURCES) return null;
  const clean: ResourceLink[] = [];
  for (const link of links) {
    const url = safeHttpUrl(link.url);
    if (!url) return null;
    clean.push({ label: (link.label ?? "").trim().slice(0, 200) || url, url });
  }
  return JSON.stringify(clean);
}
