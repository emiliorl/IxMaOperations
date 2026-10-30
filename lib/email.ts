/**
 * lib/email.ts
 *
 * Resend client for the shared request flow (Stage 11 Task 11.3). Sends one
 * email to Emilio (OWNER_EMAIL) per submission from either the Packages or
 * Custom Projects path — there is no separate checkout confirmation email
 * since there's no checkout (PROJECT_BLUEPRINT.md Section 5).
 *
 * Stage 14: an optional `survey` block carries the Project Estimator
 * Wizard's result, including `internalPriceRange` — the one place that
 * number is allowed to surface. It renders only in this email body, never
 * in an API response or a component (STANDARDS.md Rule 2, packages.ts's
 * locked pricing rule).
 */
import { Resend } from "resend";
import { formatPriceRange, type Complexity, type Deliverable, type Urgency } from "./estimator-logic";

export interface RequestEmailSurvey {
  scopeTierName: string;
  complexity: Complexity;
  deliverable: Deliverable;
  urgency: Urgency;
  /** Internal-only — see file header. Never surfaced anywhere but this email. */
  internalPriceRange: { low: number; high: number };
}

export interface RequestEmailPayload {
  name: string;
  email: string;
  /** Display name of the selected package, if any — undefined for an open-ended custom brief. */
  packageName?: string;
  problem: string;
  timeline: string;
  budgetRange?: string;
  /** Project Estimator Wizard result, if the request came from there. */
  survey?: RequestEmailSurvey;
}

export interface BookingEmailPayload {
  mode: "online" | "in_person";
  guestName: string;
  guestEmail: string;
  /** Epoch ms of the meeting start/end. */
  start: number;
  end: number;
  /** Visitor's timezone (guest email) and the host's (owner email). */
  visitorTimezone: string;
  hostTimezone: string;
  locale: "en" | "es";
  meetLink: string | null;
  location?: string;
  notes?: string;
  /** On-site heads-up lines (lib/onsite.ts describeOnSiteDay) appended to the owner's email. */
  ownerNotes?: string[];
  /** Set when a signed-in client booked from the portal, e.g. "Demo Automation · ticket #3". Owner's email only. */
  context?: string;
}

function formatWhen(start: number, end: number, timeZone: string, locale: "en" | "es") {
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return `${date}, ${time.format(start)} – ${time.format(end)}`;
}

/**
 * Booking notifications. The owner email is the one that must arrive; the
 * guest email is best-effort (Google also sends the guest a calendar
 * invitation, and Resend's sandbox sender can only reach the owner until a
 * sending domain is verified — see the TODO on `from` below). Each send is
 * independent and never throws, so a failed email can't undo a booking.
 */
export async function sendBookingEmails(payload: BookingEmailPayload): Promise<{ owner: boolean; guest: boolean }> {
  const ownerEmail = process.env.OWNER_EMAIL;
  const modeLabel = payload.mode === "online" ? "Online (Google Meet)" : "In person";
  const where = payload.mode === "online" ? payload.meetLink ?? "(Meet link in the calendar invite)" : payload.location ?? "";

  const send = async (to: string, subject: string, lines: string[], replyTo?: string): Promise<boolean> => {
    try {
      const result = await getResendClient().emails.send({
        // TODO: swap to a verified sending domain once one exists for this project.
        from: "IxMaOperations Scheduling <onboarding@resend.dev>",
        to,
        replyTo,
        subject,
        text: lines.join("\n"),
      });
      if (result.error) throw new Error(result.error.message);
      return true;
    } catch (error) {
      console.error(`[email] booking email to ${to === ownerEmail ? "owner" : "guest"} failed:`, error);
      return false;
    }
  };

  const owner = ownerEmail
    ? await send(
        ownerEmail,
        `New booking: ${payload.guestName} — ${modeLabel}`,
        [
          `${payload.guestName} <${payload.guestEmail}> booked a meeting.`,
          "",
          `When: ${formatWhen(payload.start, payload.end, payload.hostTimezone, "en")}`,
          `Format: ${modeLabel}`,
          `${payload.mode === "online" ? "Link" : "Address"}: ${where}`,
          `Visitor timezone: ${payload.visitorTimezone}`,
          payload.context ? `From the client portal: ${payload.context}` : "",
          payload.notes ? `\nNotes:\n${payload.notes}` : "",
          ...(payload.ownerNotes?.length ? ["", "--- On-site heads-up ---", ...payload.ownerNotes] : []),
        ],
        payload.guestEmail
      )
    : false;

  const es = payload.locale === "es";
  const guest = await send(
    payload.guestEmail,
    es ? "Tu reunión con IxMaOperations está confirmada" : "Your meeting with IxMaOperations is confirmed",
    [
      es ? `Hola ${payload.guestName},` : `Hi ${payload.guestName},`,
      "",
      es ? "Tu reunión quedó confirmada." : "Your meeting is confirmed.",
      "",
      `${es ? "Cuándo" : "When"}: ${formatWhen(payload.start, payload.end, payload.visitorTimezone, payload.locale)}`,
      payload.mode === "online"
        ? `${es ? "Enlace de Google Meet" : "Google Meet link"}: ${where}`
        : `${es ? "Lugar" : "Location"}: ${where}`,
      "",
      es
        ? "También recibirás una invitación de Google Calendar."
        : "You will also get a Google Calendar invitation.",
      // Booked from the portal: they can manage it there. Anyone else can still reply or write.
      payload.context
        ? es
          ? "Puedes cancelar o reprogramar esta reunión desde la pestaña Reuniones de tu proyecto en el portal."
          : "You can cancel or reschedule this meeting from the Meetings tab of your project in the portal."
        : es
          ? "Para cancelar o reprogramar, responde a ese correo o escribe a eramirez@ixmaoperations.com."
          : "To cancel or reschedule, reply to that email or write to eramirez@ixmaoperations.com.",
    ]
  );

  return { owner, guest };
}

/**
 * A plain alert to the owner (e.g. the daily on-site digest). Never throws;
 * returns whether Resend accepted it.
 */
export async function sendOwnerAlert(subject: string, lines: string[]): Promise<boolean> {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) return false;
  try {
    const result = await getResendClient().emails.send({
      // TODO: swap to a verified sending domain once one exists for this project.
      from: "IxMaOperations Scheduling <onboarding@resend.dev>",
      to: ownerEmail,
      subject,
      text: lines.join("\n"),
    });
    if (result.error) throw new Error(result.error.message);
    return true;
  } catch (error) {
    console.error("[email] owner alert failed:", error);
    return false;
  }
}

/**
 * An email from the portal: to the owner (tagged alerts and the morning digest)
 * or to a client about their own ticket. Never throws; returns whether Resend
 * accepted it.
 *
 * PORTAL_EMAIL_FROM must be an address on a domain verified in Resend. The
 * sandbox sender used as the fallback only delivers to the Resend account's own
 * address, so until a domain is verified the owner's emails arrive and clients'
 * do not (the failure is logged).
 */
export async function sendPortalEmail(input: {
  to: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
}): Promise<boolean> {
  try {
    const result = await getResendClient().emails.send({
      from: process.env.PORTAL_EMAIL_FROM || "IxMa Operations Portal <onboarding@resend.dev>",
      to: input.to,
      subject: input.subject,
      text: input.text,
      headers: input.headers,
    });
    if (result.error) throw new Error(result.error.message);
    return true;
  } catch (error) {
    console.error("[email] portal email failed:", error instanceof Error ? error.message : error);
    return false;
  }
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set — see .env.example.");
  }
  return new Resend(apiKey);
}

export async function sendRequestEmail(payload: RequestEmailPayload) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    throw new Error("OWNER_EMAIL is not set — see .env.example.");
  }

  const resend = getResendClient();
  const subject = payload.packageName
    ? `Package request: ${payload.packageName}`
    : "Custom project brief";

  const lines = [
    `From: ${payload.name} <${payload.email}>`,
    payload.packageName ? `Package: ${payload.packageName}` : "Package: (custom / not listed)",
    `Timeline: ${payload.timeline}`,
    `Budget range: ${payload.budgetRange || "(not provided)"}`,
    "",
    "What they're trying to solve:",
    payload.problem,
  ];

  if (payload.survey) {
    lines.push(
      "",
      "--- Project Estimator Wizard ---",
      `Matched scope tier: ${payload.survey.scopeTierName}`,
      `Complexity: ${payload.survey.complexity}`,
      `Deliverable: ${payload.survey.deliverable}`,
      `Urgency: ${payload.survey.urgency}`,
      `Suggested reference price (internal only — do not quote verbatim): ${formatPriceRange(payload.survey.internalPriceRange)}`
    );
  }

  const result = await resend.emails.send({
    // TODO: swap to a verified sending domain once one exists for this project.
    from: "IxMaOperations Requests <onboarding@resend.dev>",
    to: ownerEmail,
    replyTo: payload.email,
    subject,
    text: lines.join("\n"),
  });

  // The Resend SDK returns { data, error } instead of throwing on an
  // API-level failure (e.g. an unverified `from` domain) — without this
  // check, a rejected send would still look like success to the caller.
  if (result.error) {
    throw new Error(`Resend rejected the email: ${result.error.message}`);
  }

  return result;
}
