/**
 * What the portal emails, to whom, and when. Pure (no sending, no database), so the
 * rules can be tested; lib/portal/notify-send.ts does the sending.
 *
 * The aim is that an email always means something:
 *
 *   The owner is interrupted only by what cannot wait: a new HIGH or CRITICAL
 *   ticket, or a client saying "still broken". Everything else a client does
 *   (medium/low tickets, comments, closing a ticket) is gathered into ONE digest
 *   on weekday mornings, grouped by project and ticket. Every email carries the
 *   same subject tag and a List-Id header, so one mail filter files them all
 *   away from the main inbox.
 *
 *   A client is emailed when the owner marks THEIR ticket as fixed (the one
 *   thing they must act on) and when the owner replies on it. Nothing else: the
 *   portal shows the rest. The email never contains the message itself, only
 *   the ticket's title and a link, because the portal is where content is
 *   protected and e-mail is not.
 */

// ------------------------------------------------------------- owner: now or later

export type OwnerEvent =
  | { kind: "opened"; priority: string }
  | { kind: "reopened" } // a person sent a fixed/closed ticket back
  | { kind: "comment" }
  | { kind: "confirmed" }; // a person checked a fix and closed the ticket

/** "now" = an email as it happens; "digest" = wait for the morning summary. */
export function ownerAlertMode(event: OwnerEvent): "now" | "digest" {
  if (event.kind === "opened") return event.priority === "high" || event.priority === "critical" ? "now" : "digest";
  if (event.kind === "reopened") return "now";
  return "digest";
}

/**
 * Was this logged event already emailed to the owner as it happened? The digest
 * leaves those out, so nothing arrives twice. Takes the project log's own shape
 * (supabase/migrations/20261029000500_project_log.sql).
 */
export function wasAlertedInstantly(event: { kind: string; fromStatus: string | null; toStatus: string | null; priority: string | null }): boolean {
  if (event.kind === "ticket_opened") return ownerAlertMode({ kind: "opened", priority: event.priority ?? "medium" }) === "now";
  if (event.kind === "ticket_status") {
    const reopened = event.toStatus === "open" && ["needs_review", "resolved", "closed"].includes(event.fromStatus ?? "");
    return reopened && ownerAlertMode({ kind: "reopened" }) === "now";
  }
  return false;
}

/** One line, no control characters, capped: safe to put in a subject or header. */
export function oneLine(text: string, max = 120): string {
  const flat = text.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1).trimEnd() + "…" : flat;
}

/** The same tag on every owner email, so a single filter can catch them all. */
export function ownerSubject(projectName: string, text: string): string {
  return `[Portal · ${oneLine(projectName, 40)}] ${oneLine(text)}`;
}

/**
 * Headers a mail app can filter on ("list:portal-alerts.ixmaoperations.com" →
 * skip the inbox, label "Portal"). `siteHost` is the site's host name.
 */
export function ownerAlertHeaders(siteHost: string, projectSlug: string, event: string): Record<string, string> {
  const host = siteHost.replace(/^www\./, "");
  return {
    "List-Id": `IxMa Portal alerts <portal-alerts.${host}>`,
    "X-IxMa-Event": oneLine(event, 40),
    "X-IxMa-Project": oneLine(projectSlug, 80),
  };
}

// ---------------------------------------------------------------- owner: the digest

export interface DigestEvent {
  projectName: string;
  ticketId: string;
  ticketNumber: number;
  title: string;
  area: string | null;
  priority: string;
  kind: "ticket_opened" | "ticket_status" | "comment_added";
  fromStatus: string | null;
  toStatus: string | null;
  actorName: string | null;
}

/**
 * Hours the morning digest looks back. The cron runs on weekday mornings, so
 * Monday covers the whole weekend. A few minutes of overlap: a late run must
 * never lose an event (better one repeated than one missed).
 */
export function digestWindowHours(now: number, timeZone: string): number {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(now);
  return (day === "Mon" ? 72 : 24) + 10 / 60;
}

function describe(events: DigestEvent[]): string {
  const parts: string[] = [];
  const opened = events.find((e) => e.kind === "ticket_opened");
  if (opened) parts.push(`opened${opened.actorName ? ` by ${opened.actorName}` : ""}`);
  const comments = events.filter((e) => e.kind === "comment_added").length;
  if (comments > 0) parts.push(`${comments} comment${comments === 1 ? "" : "s"}`);
  if (events.some((e) => e.kind === "ticket_status" && e.toStatus === "closed")) parts.push("confirmed fixed and closed");
  if (events.some((e) => e.kind === "ticket_status" && e.toStatus === "open")) parts.push("sent back (still broken)");
  return parts.join(", ");
}

/**
 * The morning summary: one block per project, one entry per ticket however many
 * things happened on it. Null when there is nothing to report (then nothing is sent).
 */
export function buildOwnerDigest(events: DigestEvent[], siteUrl: string): { subject: string; lines: string[]; tickets: number } | null {
  const byProject = new Map<string, Map<string, DigestEvent[]>>();
  for (const event of events) {
    const tickets = byProject.get(event.projectName) ?? new Map<string, DigestEvent[]>();
    tickets.set(event.ticketId, [...(tickets.get(event.ticketId) ?? []), event]);
    byProject.set(event.projectName, tickets);
  }
  const count = Array.from(byProject.values()).reduce((sum, tickets) => sum + tickets.size, 0);
  if (count === 0) return null;

  const lines = ["What your clients did since the last summary (anything urgent was already emailed to you as it happened):", ""];
  for (const [project, tickets] of Array.from(byProject).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(project);
    // Most active first.
    for (const group of Array.from(tickets.values()).sort((a, b) => b.length - a.length || b[0].ticketNumber - a[0].ticketNumber)) {
      const first = group[0];
      lines.push(`  #${first.ticketNumber}  ${oneLine(first.title, 90)}${first.area ? ` · ${first.area}` : ""} · ${first.priority}`);
      lines.push(`      ${describe(group)}`);
      lines.push(`      ${siteUrl}/portal/tickets/${first.ticketId}`);
    }
    lines.push("");
  }
  return {
    subject: `[Portal] Digest: ${count} ticket${count === 1 ? "" : "s"} with client activity`,
    lines,
    tickets: count,
  };
}

// ----------------------------------------------------------------------- clients

export type ClientEmailKind = "fix_ready" | "owner_replied";

/**
 * The email a person gets about THEIR ticket. In both languages, since the
 * portal does not know which one a person prefers: Spanish first, then English.
 * Only the title and a link, never the message itself.
 */
export function clientEmail(
  kind: ClientEmailKind,
  ticket: { number: number; title: string; project: string; url: string }
): { subject: string; text: string } {
  const title = oneLine(ticket.title, 100);
  const project = oneLine(ticket.project, 60);
  const ref = `#${ticket.number} “${title}” (${project})`;

  const es =
    kind === "fix_ready"
      ? [
          "Hola,",
          "",
          `Marcamos tu ticket ${ref} como corregido. Por favor pruébalo: si funciona, ciérralo; si no, cuéntanos qué ves y se reabre este mismo ticket.`,
        ]
      : ["Hola,", "", `Respondimos en tu ticket ${ref}. Ábrelo para leer la respuesta.`];
  const en =
    kind === "fix_ready"
      ? [
          "Hi,",
          "",
          `We marked your ticket ${ref} as fixed. Please try it: if it works, close it; if not, tell us what you see and this same ticket reopens.`,
        ]
      : ["Hi,", "", `We replied on your ticket ${ref}. Open it to read the reply.`];

  return {
    subject:
      kind === "fix_ready"
        ? `Tu ticket #${ticket.number} está listo para revisar · Ticket #${ticket.number} is ready for your review`
        : `Respondimos en tu ticket #${ticket.number} · We replied on ticket #${ticket.number}`,
    text: [
      ...es,
      "",
      `Abrir el ticket: ${ticket.url}`,
      "",
      "—",
      "",
      ...en,
      "",
      `Open the ticket: ${ticket.url}`,
      "",
      "—",
      "Responde desde el portal, no por correo. Puedes desactivar estos avisos en el menú de tu cuenta.",
      "Please reply from the portal, not by email. You can turn these emails off in your account menu.",
    ].join("\n"),
  };
}

/**
 * Should the owner's reply email the person? Not when they just got one: a
 * reply sent in quick bursts is one email, not five. `recentReplies` counts the
 * owner's replies on the ticket in the last few minutes INCLUDING the one just
 * written.
 */
export function shouldEmailAboutReply(recentReplies: number): boolean {
  return recentReplies <= 1;
}
