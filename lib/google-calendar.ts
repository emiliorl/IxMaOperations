/**
 * lib/google-calendar.ts
 *
 * Google Calendar access over plain `fetch` (no `googleapis` SDK — it's
 * large and slows serverless cold starts). Two separate identities:
 *
 *  1. HOST (the owner): a long-lived OAuth refresh token minted once with
 *     scripts/google-refresh-token.mjs. Used to read the owner's free/busy,
 *     read per-date overrides from the availability calendar, and create
 *     events (with a Meet link for online meetings).
 *  2. CLIENT (a visitor who clicks "Connect Google Calendar"): a one-time
 *     authorization code exchanged for a short-lived access token with ONLY
 *     the read-only `calendar.freebusy` scope. It is used once, in memory, to
 *     fetch busy start/end times, then discarded — never stored, no refresh
 *     token is requested (access_type=online). Titles, attendees and
 *     descriptions are not requested and cannot be read with that scope.
 *     This must stay true: it is what /privacy promises and what Google's
 *     verification reviews.
 */
import crypto from "node:crypto";
import type { BookingMode } from "./availability-config";
import type { DayOverride, Interval } from "./availability";
import { addDays } from "./tz";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const API = "https://www.googleapis.com/calendar/v3";
export const CLIENT_SCOPE = "https://www.googleapis.com/auth/calendar.freebusy";
/** Cookie + redirect path for the visitor-side OAuth popup (app/api/schedule/google/*). */
export const CLIENT_STATE_COOKIE = "ixma_gcal_state";
export const CLIENT_CALLBACK_PATH = "/api/schedule/google/callback";

export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see .env.example.`);
  return value;
}

const hostCalendarId = () => encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");

// ---------------------------------------------------------------- host token

let cachedHostToken: { value: string; expiresAt: number } | null = null;

async function getHostAccessToken(): Promise<string> {
  if (cachedHostToken && cachedHostToken.expiresAt > Date.now() + 60_000) return cachedHostToken.value;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new GoogleApiError(`Host token refresh failed: ${data.error_description ?? data.error ?? res.status}`, res.status);
  }
  cachedHostToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedHostToken.value;
}

async function hostFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getHostAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleApiError(`Google Calendar API ${res.status}: ${data?.error?.message ?? "request failed"}`, res.status);
  return data as T;
}

// ------------------------------------------------------------------ free/busy

interface FreeBusyResponse {
  calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
}

function toIntervals(busy: { start: string; end: string }[] | undefined): Interval[] {
  return (busy ?? []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

/** The owner's busy periods between two instants. */
export async function getHostBusy(timeMin: number, timeMax: number): Promise<Interval[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const data = await hostFetch<FreeBusyResponse>("/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      items: [{ id: calendarId }],
    }),
  });
  const calendar = data.calendars?.[calendarId];
  if (!calendar || calendar.errors?.length) {
    // Fail closed: an unreadable calendar must never look "completely free".
    throw new GoogleApiError("Host free/busy unavailable.", 502);
  }
  return toIntervals(calendar.busy);
}

// ------------------------------------------------------------------ overrides

const OVERRIDE_PRECEDENCE: DayOverride[] = ["OFF", "ONLINE_ONLY", "IN_PERSON"]; // most restrictive first

export function parseOverrideTitle(summary: string | undefined): DayOverride | null {
  const title = (summary ?? "").trim().toLowerCase();
  if (/^(in[\s-]?person|on[\s-]?site)\b/.test(title)) return "IN_PERSON";
  if (/^online([\s-]?only)?\b/.test(title)) return "ONLINE_ONLY";
  if (/^(off|unavailable|closed)\b/.test(title)) return "OFF";
  return null;
}

interface CalendarEvent {
  summary?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

/**
 * Per-date overrides from the secondary "availability" calendar
 * (GOOGLE_AVAILABILITY_CALENDAR_ID): all-day events titled IN-PERSON,
 * ONLINE-ONLY or OFF. If several apply to a date, the most restrictive wins.
 * Returns {} when no availability calendar is configured.
 */
export async function getAvailabilityOverrides(timeMin: number, timeMax: number): Promise<Record<string, DayOverride>> {
  const calendarId = process.env.GOOGLE_AVAILABILITY_CALENDAR_ID;
  if (!calendarId) return {};
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: "true",
    maxResults: "250",
    fields: "items(summary,status,start,end)",
  });
  const data = await hostFetch<{ items?: CalendarEvent[] }>(`/calendars/${encodeURIComponent(calendarId)}/events?${params}`);
  const result: Record<string, DayOverride> = {};
  for (const event of data.items ?? []) {
    if (event.status === "cancelled" || !event.start?.date || !event.end?.date) continue; // all-day events only
    const override = parseOverrideTitle(event.summary);
    if (!override) continue;
    for (let day = event.start.date; day < event.end.date; day = addDays(day, 1)) {
      const existing = result[day];
      if (!existing || OVERRIDE_PRECEDENCE.indexOf(override) < OVERRIDE_PRECEDENCE.indexOf(existing)) result[day] = override;
    }
  }
  return result;
}

// --------------------------------------------------------------------- events

export interface CreateEventInput {
  mode: BookingMode;
  title: string;
  description: string;
  start: number;
  end: number;
  hostTimezone: string;
  guestEmail: string;
  guestName: string;
  /** Required for in-person meetings. */
  location?: string;
}

export interface CreatedEvent {
  id: string;
  meetLink: string | null;
  htmlLink: string | null;
}

export async function createMeetingEvent(input: CreateEventInput): Promise<CreatedEvent> {
  const body: Record<string, unknown> = {
    summary: input.title,
    description: input.description,
    start: { dateTime: new Date(input.start).toISOString(), timeZone: input.hostTimezone },
    end: { dateTime: new Date(input.end).toISOString(), timeZone: input.hostTimezone },
    attendees: [{ email: input.guestEmail, displayName: input.guestName }],
    reminders: { useDefault: true },
  };
  if (input.mode === "in_person") {
    body.location = input.location;
  } else {
    body.conferenceData = {
      createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
    };
  }
  const event = await hostFetch<{
    id: string;
    hangoutLink?: string;
    htmlLink?: string;
    conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  }>(`/calendars/${hostCalendarId()}/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const meetLink =
    event.hangoutLink ?? event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ?? null;
  return { id: event.id, meetLink, htmlLink: event.htmlLink ?? null };
}

export async function deleteEvent(eventId: string): Promise<void> {
  await hostFetch(`/calendars/${hostCalendarId()}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, { method: "DELETE" });
}

// --------------------------------------------------- client "Connect Google"

export function buildClientAuthUrl(state: string, redirectUri: string): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CLIENT_SCOPE,
    access_type: "online", // no refresh token — the grant dies with this one request
    include_granted_scopes: "false",
    prompt: "select_account",
    state,
  }).toString();
  return url.toString();
}

/**
 * Exchanges the visitor's one-time code and immediately reads their busy
 * times for [timeMin, timeMax]. The access token never leaves this function.
 */
export async function fetchClientBusy(code: string, redirectUri: string, timeMin: number, timeMax: number): Promise<Interval[]> {
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const token = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !token.access_token) {
    throw new GoogleApiError(`Client code exchange failed: ${token.error ?? tokenRes.status}`, tokenRes.status);
  }
  const busyRes = await fetch(`${API}/freeBusy`, {
    method: "POST",
    headers: { authorization: `Bearer ${token.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      items: [{ id: "primary" }],
    }),
    cache: "no-store",
  });
  const data = (await busyRes.json().catch(() => ({}))) as FreeBusyResponse;
  if (!busyRes.ok) throw new GoogleApiError(`Client free/busy failed: ${busyRes.status}`, busyRes.status);
  return toIntervals(data.calendars?.primary?.busy);
}
