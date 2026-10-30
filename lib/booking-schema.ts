/**
 * lib/booking-schema.ts
 *
 * Zod schema for POST /api/schedule/book, shared by the Scheduler form
 * (client-side, translated messages) and the route (server-side, fixed
 * English instance) — same pattern as lib/schemas.ts.
 */
import { z } from "zod";
import { DEFAULT_AVAILABILITY } from "./availability-config";
import { isValidTimeZone } from "./tz";

const EN_ERRORS = {
  nameError: "Enter your name.",
  emailError: "Enter a valid email address.",
  locationError: "Enter the address for the in-person meeting.",
};

export function createBookingSchema(t: (key: keyof typeof EN_ERRORS) => string) {
  return z
    .object({
      mode: z.enum(["online", "in_person"]),
      durationMinutes: z
        .number()
        .int()
        .refine((n) => DEFAULT_AVAILABILITY.durationsMinutes.includes(n), "Unsupported duration."),
      /** ISO-8601 instant of the slot start (UTC, as returned by /api/schedule/availability). */
      start: z.string().datetime(),
      /** Visitor's IANA timezone, stored for the confirmation email. */
      timezone: z.string().refine(isValidTimeZone, "Invalid timezone."),
      locale: z.enum(["en", "es"]).default("en"),
      name: z.string().trim().min(2, t("nameError")).max(120),
      email: z.string().trim().email(t("emailError")).max(254),
      notes: z.string().trim().max(1000).optional().default(""),
      location: z.string().trim().max(200).optional().default(""),
      /** Set when a signed-in client books from the portal. Only a hint: the server checks it and ignores it if it does not hold. */
      projectSlug: z.string().trim().max(120).optional().default(""),
      ticketId: z.union([z.string().uuid(), z.literal("")]).optional().default(""),
    })
    .refine((v) => v.mode !== "in_person" || v.location.length >= 3, {
      message: t("locationError"),
      path: ["location"],
    });
}

export const bookingSchema = createBookingSchema((key) => EN_ERRORS[key]);

export type BookingValues = z.infer<typeof bookingSchema>;
