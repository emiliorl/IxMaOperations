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
