import "server-only";
import type { BookingMode } from "./availability-config";
import type { ExistingMeeting } from "./availability";
import { decryptOptional, encryptField, encryptOptional } from "./field-crypto";
import type { OnSiteMeeting } from "./onsite";
import { supabaseAdmin } from "./supabase-admin";

/**
 * Data access for public.meetings (supabase/migrations/*_meetings.sql).
 * Personal fields are encrypted here, before they reach the database
 * (lib/field-crypto.ts); nothing outside this file writes to the table.
 */

const PG_EXCLUSION_VIOLATION = "23P01";
const STALE_PENDING_MS = 5 * 60_000;

/** Booked meetings (pending or confirmed) overlapping [from, to]. */
export async function listActiveMeetings(from: number, to: number): Promise<ExistingMeeting[]> {
  const { data, error } = await supabaseAdmin()
    .from("meetings")
    .select("start_time,end_time,mode,created_at")
    .in("status", ["pending", "confirmed"])
    .lt("start_time", new Date(to).toISOString())
    .gt("end_time", new Date(from).toISOString());
  if (error) throw new Error(`Failed to read meetings: ${error.message}`);
  return (data ?? []).map((row) => ({
    start: Date.parse(row.start_time),
    end: Date.parse(row.end_time),
    mode: row.mode as ExistingMeeting["mode"],
    createdAt: Date.parse(row.created_at),
  }));
}

/**
 * Confirmed in-person meetings in [from, to] WITH guest name and address
 * decrypted — for the owner's on-site alerts only (lib/onsite.ts). Never
 * return this to a browser.
 */
export async function listConfirmedInPerson(from: number, to: number): Promise<OnSiteMeeting[]> {
  const { data, error } = await supabaseAdmin()
    .from("meetings")
    .select("start_time,end_time,guest_name,location")
    .eq("status", "confirmed")
    .eq("mode", "in_person")
    .gte("start_time", new Date(from).toISOString())
    .lt("start_time", new Date(to).toISOString())
    .order("start_time");
  if (error) throw new Error(`Failed to read in-person meetings: ${error.message}`);
  return (data ?? []).map((row) => ({
    start: Date.parse(row.start_time),
    end: Date.parse(row.end_time),
    guestName: decryptOptional(row.guest_name) ?? undefined,
    location: decryptOptional(row.location),
  }));
}

export interface NewMeeting {
  mode: BookingMode;
  title: string;
  start: number;
  end: number;
  visitorTimezone: string;
  guestName: string;
  guestEmail: string;
  notes?: string;
  location?: string;
  /** Set when a signed-in client booked from the portal (already verified): it ties the meeting to the project. */
  projectId?: string;
  ticketId?: string;
}

export type InsertResult = { ok: true; id: string } | { ok: false; reason: "conflict" };

/**
 * Reserves the slot by inserting a 'pending' row. The exclusion constraint
 * makes this the atomic double-booking guard: if another request holds an
 * overlapping time, this returns { reason: "conflict" } instead of inserting.
 */
export async function insertPendingMeeting(meeting: NewMeeting): Promise<InsertResult> {
  const db = supabaseAdmin();
  // A crashed request must not hold a slot forever.
  await db
    .from("meetings")
    .delete()
    .eq("status", "pending")
    .lt("created_at", new Date(Date.now() - STALE_PENDING_MS).toISOString());

  const { data, error } = await db
    .from("meetings")
    .insert({
      mode: meeting.mode,
      title: meeting.title,
      start_time: new Date(meeting.start).toISOString(),
      end_time: new Date(meeting.end).toISOString(),
      timezone: meeting.visitorTimezone,
      guest_name: encryptField(meeting.guestName),
      guest_email: encryptField(meeting.guestEmail),
      notes: encryptOptional(meeting.notes),
      location: encryptOptional(meeting.location),
      project_id: meeting.projectId ?? null,
      ticket_id: meeting.ticketId ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === PG_EXCLUSION_VIOLATION) return { ok: false, reason: "conflict" };
    throw new Error(`Failed to reserve slot: ${error.message}`);
  }
  return { ok: true, id: data.id };
}

export async function confirmMeeting(id: string, event: { googleEventId: string; meetLink: string | null }): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("meetings")
    .update({ status: "confirmed", google_event_id: event.googleEventId, meet_link: event.meetLink })
    .eq("id", id);
  if (error) throw new Error(`Failed to confirm meeting: ${error.message}`);
}

/** Releases a reservation whose Google event could not be created. */
export async function releasePendingMeeting(id: string): Promise<void> {
  await supabaseAdmin().from("meetings").delete().eq("id", id).eq("status", "pending");
}
