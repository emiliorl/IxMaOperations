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
 */
import { z } from "zod";

export const requestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  /** A package slug from lib/packages.ts, or "" for an open-ended custom brief. */
  packageSlug: z.string().optional().default(""),
  problem: z
    .string()
    .trim()
    .min(20, "Give a bit more detail — at least a couple of sentences."),
  timeline: z.string().trim().min(1, "Let me know your timeline, even roughly."),
  budgetRange: z.string().trim().optional().default(""),
  /** Project Estimator Wizard answers, if the request came from there — see lib/estimator-logic.ts. */
  surveyCategory: z.string().optional().default(""),
  surveyComplexity: z.string().optional().default(""),
  surveyDeliverable: z.string().optional().default(""),
  surveyUrgency: z.string().optional().default(""),
});

export type RequestFormValues = z.infer<typeof requestSchema>;
