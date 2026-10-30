import { describe, expect, it } from "vitest";
import { bookingSchema } from "../booking-schema";
import { onsitePresenceInput, onsiteVisitInput, removeOnsiteVisitInput } from "./schemas";

const visit = { projectSlug: "demo-automation", date: "2026-11-05", start: "10:00", end: "15:30" };

describe("announcing an on-site day", () => {
  it("accepts a project, a date and hours", () => {
    expect(onsiteVisitInput.safeParse(visit).success).toBe(true);
  });
  it("refuses hours that don't end after they start", () => {
    expect(onsiteVisitInput.safeParse({ ...visit, start: "15:30", end: "10:00" }).success).toBe(false);
    expect(onsiteVisitInput.safeParse({ ...visit, start: "10:00", end: "10:00" }).success).toBe(false);
  });
  it("refuses times and dates that aren't real", () => {
    for (const bad of [{ start: "25:00" }, { start: "9:00" }, { end: "10:60" }, { date: "2026-13-40" }, { date: "5 Nov" }, { date: "" }]) {
      expect(onsiteVisitInput.safeParse({ ...visit, ...bad }).success).toBe(false);
    }
  });
  it("refuses a project name that could be anything but a slug", () => {
    expect(onsiteVisitInput.safeParse({ ...visit, projectSlug: "../x" }).success).toBe(false);
    expect(onsiteVisitInput.safeParse({ ...visit, projectSlug: "" }).success).toBe(false);
  });
});

describe("removing a day and switching the schedule", () => {
  it("removing needs a real id", () => {
    expect(removeOnsiteVisitInput.safeParse({ projectSlug: "demo", visitId: "7d8c6f0e-1b2a-4c3d-9e4f-0a1b2c3d4e5f" }).success).toBe(true);
    expect(removeOnsiteVisitInput.safeParse({ projectSlug: "demo", visitId: "not-an-id" }).success).toBe(false);
  });
  it("showing needs a yes or no", () => {
    expect(onsitePresenceInput.safeParse({ projectSlug: "demo", enabled: true }).success).toBe(true);
    expect(onsitePresenceInput.safeParse({ projectSlug: "demo", enabled: "yes" }).success).toBe(false);
  });
});

describe("a booking that says where it came from", () => {
  const booking = {
    mode: "online",
    durationMinutes: 30,
    start: "2026-11-05T16:00:00.000Z",
    timezone: "America/Mexico_City",
    locale: "es",
    name: "Ana Morales",
    email: "ana@example.com",
  };
  it("is still an ordinary booking without it (the public page)", () => {
    const parsed = bookingSchema.safeParse(booking);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.projectSlug).toBe("");
  });
  it("may carry a project and a ticket, which the server checks again", () => {
    expect(bookingSchema.safeParse({ ...booking, projectSlug: "demo-automation", ticketId: "7d8c6f0e-1b2a-4c3d-9e4f-0a1b2c3d4e5f" }).success).toBe(true);
  });
  it("refuses a ticket that isn't an id", () => {
    expect(bookingSchema.safeParse({ ...booking, projectSlug: "demo", ticketId: "'; drop table meetings" }).success).toBe(false);
  });
});
