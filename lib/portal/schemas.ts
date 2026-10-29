import { z } from "zod";
import {
  MILESTONE_STATUSES,
  TICKET_CATEGORIES,
  TICKET_ENVIRONMENTS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "./constants";

/** Server-side validation for portal form submissions (the browser is never trusted). */
const uuidOrEmpty = z.union([z.string().uuid(), z.literal("")]);

export const loginInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export const ticketInput = z.object({
  projectSlug: z.string().trim().min(1).max(120),
  /** "" = project-wide ticket. */
  departmentId: uuidOrEmpty,
  milestoneId: uuidOrEmpty,
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(1).max(5000),
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  environment: z.enum(TICKET_ENVIRONMENTS),
  affectedUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Use a full http(s) address."),
});

export const commentInput = z.object({
  ticketId: z.string().uuid(),
  message: z.string().trim().min(1).max(5000),
  internal: z.boolean(),
});

export const ticketStatusInput = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(TICKET_STATUSES),
});

export const milestoneStatusInput = z.object({
  milestoneId: z.string().uuid(),
  status: z.enum(MILESTONE_STATUSES),
});

export type TicketInput = z.infer<typeof ticketInput>;
