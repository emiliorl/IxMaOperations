import { z } from "zod";
import {
  MILESTONE_STATUSES,
  TICKET_CATEGORIES,
  TICKET_ENVIRONMENTS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "./constants";
import { LANGUAGES, isValidTimeZone } from "./preferences";

/** Server-side validation for portal form submissions (the browser is never trusted). */
const uuidOrEmpty = z.union([z.string().uuid(), z.literal("")]);

export const settingsInput = z.object({
  displayName: z.string().trim().min(1).max(120),
  timezone: z.string().trim().refine(isValidTimeZone),
  language: z.enum(LANGUAGES),
  notifyEmail: z.boolean(),
  notifyFixReady: z.boolean(),
  notifyReplies: z.boolean(),
});

export const loginInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export const ticketInput = z.object({
  projectSlug: z.string().trim().min(1).max(120),
  /** "" = project-wide ticket. */
  departmentId: uuidOrEmpty,
  milestoneId: uuidOrEmpty,
  // May be empty when the ticket is tied to a plan item (it is named after the item);
  // lib/portal/ticket-title.ts decides, because it needs to know about the item.
  title: z.string().trim().max(200),
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

/** "Still broken": a note is required, so the owner always knows what is still wrong. */
export const reopenTicketInput = z.object({
  ticketId: z.string().uuid(),
  message: z.string().trim().min(3).max(5000),
});

/** "It works": no note needed, just which ticket. */
export const confirmFixedInput = z.object({ ticketId: z.string().uuid() });

export const ticketStatusInput = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(TICKET_STATUSES),
});

export const milestoneStatusInput = z.object({
  milestoneId: z.string().uuid(),
  status: z.enum(MILESTONE_STATUSES),
});

const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;
const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "Invalid email.");

/** Owner: give someone folders on a project. Identify the person by id (existing row) or email (new). */
export const memberAccessInput = z
  .object({
    projectSlug: z.string().trim().regex(SLUG),
    userId: uuidOrEmpty,
    email: optionalEmail,
    /** Only used when the email has no login yet; the account is created with this name. */
    displayName: z.string().trim().max(120),
    role: z.enum(["lead", "member"]),
    allDepartments: z.boolean(),
    departmentIds: z.array(z.string().uuid()).max(100),
    /** Lets this person see the cost information too (full-access people always can). */
    canViewCosts: z.boolean(),
  })
  .refine((v) => v.userId !== "" || v.email !== "", "Choose a person.");

export const removeMemberInput = z.object({
  projectSlug: z.string().trim().regex(SLUG),
  userId: z.string().uuid(),
});

/** Owner: company-wide access (CEO / CFO ...). */
export const companyAccessInput = z
  .object({
    projectSlug: z.string().trim().regex(SLUG),
    organizationId: z.string().uuid(),
    userId: uuidOrEmpty,
    email: optionalEmail,
    displayName: z.string().trim().max(120),
    level: z.enum(["view", "full"]),
    canViewCosts: z.boolean(),
  })
  .refine((v) => v.userId !== "" || v.email !== "", "Choose a person.");

export const removeCompanyAccessInput = z.object({
  projectSlug: z.string().trim().regex(SLUG),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type TicketInput = z.infer<typeof ticketInput>;
