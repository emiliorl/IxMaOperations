/**
 * lib/schemas.ts
 *
 * Zod schema for the shared request flow (Stage 11 Task 11.2/11.3) — used
 * by both BriefForm.tsx (client-side validation) and
 * app/api/request/route.ts (server-side validation), so the two never
 * drift apart.
 *
 * Stage 14: the four survey* fields optionally carry the Project Estimator
 * Wizard's answers through to the server, which re-validates them with
 * lib/estimator-logic.ts's parseSurveyAnswers (never trust the raw strings
 * for the internal price calculation — validate against the same known
 * option sets the wizard offers). They're loose strings here, not z.enum,
 * so a future wizard copy/option change can't turn an in-flight submission
 * into a hard validation failure.
 *
 * i18n pivot (Aug 29, 2026): `createRequestSchema(t)` builds the same
 * shape with translated error messages, for BriefForm.tsx to resolve
 * against in whichever locale the visitor is on. `requestSchema` below
 * stays the fixed English instance used by app/api/request/route.ts —
 * server-side validation failures are a rare edge case (the client already
 * validated in its own locale before submitting) and the resulting email
 * is English-only regardless of the visitor's locale anyway, so there's
 * no real payoff to threading a locale through the API route for this.
 */
import { z } from "zod";

const EN_ERRORS = {
  nameError: "Enter your name.",
  emailError: "Enter a valid email address.",
  problemError: "Give a bit more detail — at least a couple of sentences.",
  timelineError: "Let me know your timeline, even roughly.",
};

export function createRequestSchema(t: (key: keyof typeof EN_ERRORS) => string) {
  return z.object({
    name: z.string().trim().min(2, t("nameError")),
    email: z.string().trim().email(t("emailError")),
    /** A package slug from lib/packages.ts, or "" for an open-ended custom brief. */
    packageSlug: z.string().optional().default(""),
    problem: z.string().trim().min(20, t("problemError")),
    timeline: z.string().trim().min(1, t("timelineError")),
    budgetRange: z.string().trim().optional().default(""),
    /** Project Estimator Wizard answers, if the request came from there — see lib/estimator-logic.ts. */
    surveyCategory: z.string().optional().default(""),
    surveyComplexity: z.string().optional().default(""),
    surveyDeliverable: z.string().optional().default(""),
    surveyUrgency: z.string().optional().default(""),
  });
}

export const requestSchema = createRequestSchema((key) => EN_ERRORS[key]);

export type RequestFormValues = z.infer<typeof requestSchema>;
