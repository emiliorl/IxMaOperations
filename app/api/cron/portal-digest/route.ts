/**
 * GET /api/cron/portal-digest
 *
 * The owner's morning summary of what clients did in the portal: tickets opened,
 * comments, fixes confirmed or sent back. One email on weekday mornings
 * (vercel.json), grouped by project and ticket, instead of one email per event.
 * Anything urgent (a new high/critical ticket, a ticket sent back) was already
 * emailed as it happened, so the digest leaves those out. Sends nothing when
 * there is nothing to report.
 *
 * It reads the project log (supabase/migrations/20261029000500_project_log.sql),
 * which the database fills automatically, so there is no queue to keep in step.
 * The owner's own actions are left out: they know what they did.
 *
 * Auth: Vercel sends `Authorization: Bearer $CRON_SECRET`. With no CRON_SECRET
 * configured the route refuses everything.
 */
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { sendPortalEmail } from "@/lib/email";
import { decryptLoose } from "@/lib/field-crypto";
import { buildOwnerDigest, digestWindowHours, ownerAlertHeaders, wasAlertedInstantly, type DigestEvent } from "@/lib/portal/notify";
import { ownerInbox, siteHost } from "@/lib/portal/notify-send";
import { SITE_URL } from "@/lib/site-url";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const CHUNK = 100; // ids per request, to keep the request address short
const chunks = <T,>(items: T[]): T[][] => Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) => items.slice(i * CHUNK, (i + 1) * CHUNK));

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  const to = ownerInbox();
  if (!to) return NextResponse.json({ sent: false, reason: "No OWNER_EMAIL / OWNER_ALERT_EMAIL is set." });

  try {
    const db = supabaseAdmin();
    const since = new Date(Date.now() - digestWindowHours(Date.now(), DEFAULT_AVAILABILITY.hostTimezone) * 3_600_000).toISOString();

    const logged = await db
      .from("project_events")
      .select("kind,ticket_id,from_status,to_status,actor_id,created_at")
      .in("kind", ["ticket_opened", "ticket_status", "comment_added"])
      .not("ticket_id", "is", null)
      .gte("created_at", since)
      .order("created_at")
      .limit(2000);
    if (logged.error) throw new Error(logged.error.message);
    const events = logged.data ?? [];
    if (events.length === 0) return NextResponse.json({ sent: false, events: 0 });

    // Who did it: the owner's own actions are left out.
    const actorIds = Array.from(new Set(events.map((e) => e.actor_id).filter((id): id is string => Boolean(id))));
    const admins = new Set<string>();
    const names = new Map<string, string>();
    for (const ids of chunks(actorIds)) {
      const profiles = await db.from("profiles").select("id,display_name").in("id", ids);
      for (const row of profiles.data ?? []) names.set(row.id, decryptLoose(row.display_name) ?? "");
    }
    await Promise.all(
      actorIds.map(async (id) => {
        const { data } = await db.auth.admin.getUserById(id);
        if (data.user?.app_metadata?.role === "admin") admins.add(id);
      })
    );

    // The tickets they were about (titles are encrypted, hence decrypted here).
    const ticketIds = Array.from(new Set(events.map((e) => e.ticket_id as string)));
    const tickets = new Map<string, { number: number; title: string; priority: string; departmentId: string | null; project: string }>();
    for (const ids of chunks(ticketIds)) {
      const rows = await db.from("tickets").select("id,ticket_number,title,priority,department_id,projects(name)").in("id", ids);
      for (const row of rows.data ?? []) {
        const project = (Array.isArray(row.projects) ? row.projects[0] : row.projects) as { name: string } | null;
        tickets.set(row.id, {
          number: row.ticket_number,
          title: decryptLoose(row.title) ?? "",
          priority: row.priority,
          departmentId: row.department_id,
          project: decryptLoose(project?.name) ?? "",
        });
      }
    }
    const departmentIds = Array.from(new Set(Array.from(tickets.values()).map((t) => t.departmentId).filter((id): id is string => Boolean(id))));
    const areas = new Map<string, string>();
    for (const ids of chunks(departmentIds)) {
      const rows = await db.from("departments").select("id,name").in("id", ids);
      for (const row of rows.data ?? []) areas.set(row.id, decryptLoose(row.name) ?? "");
    }

    const digestEvents: DigestEvent[] = [];
    for (const event of events) {
      const ticket = tickets.get(event.ticket_id as string);
      if (!ticket) continue;
      if (event.actor_id && admins.has(event.actor_id)) continue;
      const entry = {
        kind: event.kind as DigestEvent["kind"],
        fromStatus: event.from_status as string | null,
        toStatus: event.to_status as string | null,
        priority: ticket.priority,
      };
      if (wasAlertedInstantly(entry)) continue;
      digestEvents.push({
        projectName: ticket.project,
        ticketId: event.ticket_id as string,
        ticketNumber: ticket.number,
        title: ticket.title,
        area: ticket.departmentId ? (areas.get(ticket.departmentId) ?? null) : null,
        priority: ticket.priority,
        kind: entry.kind,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        actorName: event.actor_id ? (names.get(event.actor_id) ?? null) : null,
      });
    }

    const digest = buildOwnerDigest(digestEvents, SITE_URL);
    if (!digest) return NextResponse.json({ sent: false, events: events.length, tickets: 0 });

    const sent = await sendPortalEmail({
      to,
      subject: digest.subject,
      text: digest.lines.join("\n"),
      headers: ownerAlertHeaders(siteHost(), "all", "digest"),
    });
    return NextResponse.json({ sent, events: events.length, tickets: digest.tickets });
  } catch (error) {
    console.error("[cron] portal digest failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Digest failed." }, { status: 500 });
  }
}
