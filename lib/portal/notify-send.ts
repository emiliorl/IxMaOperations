import "server-only";
import { sendPortalEmail } from "@/lib/email";
import { decryptLoose } from "@/lib/field-crypto";
import { OUTGOING_URL } from "@/lib/site-url";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { clientEmail, ownerAlertHeaders, ownerAlertMode, ownerSubject, shouldEmailAboutReply, type ClientEmailKind, type OwnerEvent } from "./notify";
import { notificationPreferencesFrom, parseLanguage, wantsEmail } from "./preferences";

/** Minutes within which several owner replies count as one email to the person. */
const REPLY_BURST_MINUTES = 10;

const siteHost = () => new URL(OUTGOING_URL).host;
/** Where the owner's alerts go: a plus-address or a dedicated mailbox keeps them out of the main inbox. */
const ownerInbox = () => process.env.OWNER_ALERT_EMAIL || process.env.OWNER_EMAIL || null;

export { ownerInbox, siteHost };

/**
 * Email the owner about something a client did, but only when it cannot wait (see
 * lib/portal/notify.ts); anything else is left for the morning digest. Never
 * throws, so a failed email can never undo what the person just did.
 */
export async function alertOwner(input: {
  event: OwnerEvent;
  project: { name: string; slug: string };
  subject: string;
  lines: string[];
}): Promise<void> {
  if (ownerAlertMode(input.event) !== "now") return;
  const to = ownerInbox();
  if (!to) return;
  await sendPortalEmail({
    to,
    subject: ownerSubject(input.project.name, input.subject),
    text: input.lines.join("\n"),
    headers: ownerAlertHeaders(siteHost(), input.project.slug, input.event.kind),
  });
}

/**
 * Email the person who opened a ticket that the owner marked it fixed, or replied to
 * it, in the language they chose in Settings. Skipped when: they did it themselves,
 * they switched these emails (or this kind) off, they have no address, or (for
 * replies) they were just emailed. Never throws.
 */
export async function notifyTicketPerson(input: { ticketId: string; kind: ClientEmailKind; actorId: string }): Promise<void> {
  try {
    const db = supabaseAdmin();
    const { data: ticket } = await db
      .from("tickets")
      .select("id,ticket_number,title,created_by,projects(name)")
      .eq("id", input.ticketId)
      .maybeSingle();
    if (!ticket?.created_by || ticket.created_by === input.actorId) return;

    // The newer settings come from migrations that may not have been run yet: ask for fewer columns, never guess.
    let person: Record<string, unknown> | null = null;
    for (const columns of ["email,locale,notify_email,notify_fix_ready,notify_replies", "email,notify_email", "email"]) {
      const result = await db.from("profiles").select(columns).eq("id", ticket.created_by).maybeSingle();
      if (!result.error) {
        person = result.data as unknown as Record<string, unknown> | null;
        break;
      }
    }
    const address = decryptLoose(person?.email as string | undefined);
    if (!person || !address) return;
    if (!wantsEmail(input.kind, notificationPreferencesFrom(person))) return;

    if (input.kind === "owner_replied") {
      const since = new Date(Date.now() - REPLY_BURST_MINUTES * 60_000).toISOString();
      const { count } = await db
        .from("ticket_comments")
        .select("id", { count: "exact", head: true })
        .eq("ticket_id", input.ticketId)
        .eq("is_internal", false)
        .neq("author_id", ticket.created_by)
        .gte("created_at", since);
      if (!shouldEmailAboutReply(count ?? 1)) return;
    }

    const project = Array.isArray(ticket.projects) ? ticket.projects[0] : ticket.projects;
    const { subject, text } = clientEmail(
      input.kind,
      {
        number: ticket.ticket_number,
        title: decryptLoose(ticket.title) ?? "",
        project: decryptLoose((project as { name?: string } | null)?.name) ?? "",
        url: `${OUTGOING_URL}/portal/tickets/${ticket.id}`,
      },
      parseLanguage(person.locale)
    );
    await sendPortalEmail({ to: address, subject, text });
  } catch (error) {
    console.error("[notify] could not notify the ticket's person:", error instanceof Error ? error.message : error);
  }
}
