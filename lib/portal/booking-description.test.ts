import { describe, expect, it } from "vitest";
import { portalContextLine, portalEventDescription, portalMeetingTitle } from "./booking-description";

const topic = {
  projectName: "Domus",
  areaName: "RRHH",
  problem: { code: "RH-1", title: "Marcajes incompletos", priority: "high" },
  ticketNumber: 3,
};

describe("what the owner sees for a portal booking", () => {
  it("puts the problem's ID in the event title, and leaves the title alone without one", () => {
    expect(portalMeetingTitle("IxMaOperations call — Ana", topic)).toBe("IxMaOperations call — Ana · RH-1");
    expect(portalMeetingTitle("IxMaOperations call — Ana", { problem: null })).toBe("IxMaOperations call — Ana");
    expect(portalMeetingTitle("IxMaOperations call — Ana", { problem: { code: null, title: "x", priority: "low" } })).toBe("IxMaOperations call — Ana");
  });

  it("describes the topic in one line for emails", () => {
    expect(portalContextLine(topic)).toBe("Domus · RRHH · [RH-1] Marcajes incompletos (priority: high) · ticket #3");
    expect(portalContextLine({ projectName: "Domus", areaName: null, problem: null, ticketNumber: null })).toBe("Domus");
  });

  it("lists who, where and what in the calendar description, with a link back to the portal", () => {
    const text = portalEventDescription({
      topic,
      guestName: "Ana",
      guestEmail: "ana@example.com",
      notes: "Probamos el lector nuevo.",
      visitorTimezone: "America/Guatemala",
      portalUrl: "https://example.com/portal/tickets/abc",
    });
    expect(text).toContain("Client: Ana <ana@example.com>");
    expect(text).toContain("Team: RRHH");
    expect(text).toContain("Problem: [RH-1] Marcajes incompletos (priority: high)");
    expect(text).toContain("Ticket: #3");
    expect(text).toContain("Portal: https://example.com/portal/tickets/abc");
    expect(text).toContain("Notes from Ana:\nProbamos el lector nuevo.");
    expect(text).toContain("Visitor timezone: America/Guatemala");
  });

  it("leaves out the lines that don't apply", () => {
    const text = portalEventDescription({
      topic: { projectName: "Domus", areaName: null, problem: null, ticketNumber: null },
      guestName: "Ana",
      guestEmail: "ana@example.com",
      notes: "",
      visitorTimezone: "UTC",
      portalUrl: null,
    });
    expect(text).not.toMatch(/Team:|Problem:|Ticket:|Portal:|Notes from/);
  });
});
