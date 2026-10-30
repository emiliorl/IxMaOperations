import "server-only";
import { decryptLoose } from "@/lib/field-crypto";
import { createSupabaseServer, supabaseConfigured } from "@/lib/supabase/server";
import { timeZoneOrDefault } from "./preferences";

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Who is booking, and for which project and ticket, when a signed-in client books from
 * the portal. Everything here is looked up as that signed-in person, so row-level
 * security decides: a project or ticket they cannot open is simply not found, and the
 * booking becomes an ordinary anonymous one. Nothing in a booking request is trusted to
 * say which project it belongs to, who is booking, or where the office is.
 */
export interface BookingContext {
  projectId: string;
  projectSlug: string;
  projectName: string;
  officeLabel: string | null;
  officeAddress: string | null;
  ticketId: string | null;
  ticketNumber: number | null;
  /** The account's own name and email, so a booking can't be made in someone else's name. */
  name: string;
  email: string;
  timeZone: string;
}

export async function resolveBookingContext(input: { projectSlug?: string | null; ticketId?: string | null }): Promise<BookingContext | null> {
  const slug = input.projectSlug?.trim() ?? "";
  if (!SLUG.test(slug) || !supabaseConfigured()) return null;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: project } = await supabase.from("projects").select("id,name,slug,office_label,office_address").eq("slug", slug).maybeSingle();
  if (!project) return null;

  let ticket: { id: string; ticket_number: number } | null = null;
  if (input.ticketId && UUID.test(input.ticketId)) {
    const { data } = await supabase.from("tickets").select("id,ticket_number,project_id").eq("id", input.ticketId).maybeSingle();
    if (data && data.project_id === project.id) ticket = { id: data.id, ticket_number: data.ticket_number };
  }

  const { data: profile } = await supabase.from("profiles").select("display_name,timezone").eq("id", user.id).maybeSingle();
  return {
    projectId: project.id,
    projectSlug: project.slug,
    projectName: decryptLoose(project.name) ?? "",
    officeLabel: decryptLoose(project.office_label),
    officeAddress: decryptLoose(project.office_address),
    ticketId: ticket?.id ?? null,
    ticketNumber: ticket?.ticket_number ?? null,
    name: decryptLoose(profile?.display_name) ?? user.email,
    email: user.email,
    timeZone: timeZoneOrDefault((profile as { timezone?: string } | null)?.timezone),
  };
}
