/**
 * Allowed values for portal fields. These mirror the CHECK constraints in
 * supabase/migrations/*_portal.sql — the database is the real validator; this
 * list lets the UI render options and zod reject bad input early.
 */
export const PROJECT_STATUSES = ["discovery", "in_progress", "review", "completed", "maintenance"] as const;
export const MILESTONE_STATUSES = ["pending", "in_progress", "completed", "blocked"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "needs_review", "resolved", "closed"] as const;
export const TICKET_CATEGORIES = ["bug", "feature", "scope_change", "question", "access"] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const TICKET_ENVIRONMENTS = ["staging", "production", "local", "n/a"] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketEnvironment = (typeof TICKET_ENVIRONMENTS)[number];

/** Only http(s) URLs are ever rendered as links (blocks `javascript:` etc.). */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
