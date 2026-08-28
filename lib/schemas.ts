/**
 * lib/schemas.ts
 *
 * Zod schema for the shared request flow (Stage 11 Task 11.2/11.3) — used
 * by both BriefForm.tsx (client-side validation) and
 * app/api/request/route.ts (server-side validation), so the two never
 * drift apart.
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
});

export type RequestFormValues = z.infer<typeof requestSchema>;
