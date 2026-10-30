import { describe, expect, it } from "vitest";
import {
  buildOwnerDigest,
  clientEmail,
  digestWindowHours,
  oneLine,
  ownerAlertHeaders,
  ownerAlertMode,
  ownerSubject,
  shouldEmailAboutReply,
  wasAlertedInstantly,
  type DigestEvent,
} from "./notify";

describe("what interrupts the owner", () => {
  it("a new high or critical ticket, and a ticket sent back, email right away", () => {
    expect(ownerAlertMode({ kind: "opened", priority: "critical" })).toBe("now");
    expect(ownerAlertMode({ kind: "opened", priority: "high" })).toBe("now");
    expect(ownerAlertMode({ kind: "reopened" })).toBe("now");
  });
  it("everything else waits for the morning digest", () => {
    expect(ownerAlertMode({ kind: "opened", priority: "medium" })).toBe("digest");
    expect(ownerAlertMode({ kind: "opened", priority: "low" })).toBe("digest");
    expect(ownerAlertMode({ kind: "comment" })).toBe("digest");
    expect(ownerAlertMode({ kind: "confirmed" })).toBe("digest");
  });
  it("the digest leaves out what was already emailed, so nothing arrives twice", () => {
    expect(wasAlertedInstantly({ kind: "ticket_opened", fromStatus: null, toStatus: "open", priority: "critical" })).toBe(true);
    expect(wasAlertedInstantly({ kind: "ticket_opened", fromStatus: null, toStatus: "open", priority: "low" })).toBe(false);
    expect(wasAlertedInstantly({ kind: "ticket_status", fromStatus: "needs_review", toStatus: "open", priority: null })).toBe(true);
    expect(wasAlertedInstantly({ kind: "ticket_status", fromStatus: "closed", toStatus: "open", priority: null })).toBe(true);
    expect(wasAlertedInstantly({ kind: "ticket_status", fromStatus: "needs_review", toStatus: "closed", priority: null })).toBe(false);
    expect(wasAlertedInstantly({ kind: "comment_added", fromStatus: null, toStatus: null, priority: null })).toBe(false);
  });
});

describe("owner email tagging", () => {
  it("every subject starts with the same tag, so one filter catches them all", () => {
    expect(ownerSubject("Demo Automation", "New high ticket #3 — Login fails")).toBe("[Portal · Demo Automation] New high ticket #3 — Login fails");
  });
  it("keeps a client's text from breaking the subject (no line breaks, capped)", () => {
    const subject = ownerSubject("Acme\r\nBcc: x@y.z", "Title\nwith break " + "x".repeat(300));
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject.length).toBeLessThan(200);
    expect(oneLine("a\tb\n c")).toBe("a b c");
  });
  it("adds the headers a mail app can file by", () => {
    expect(ownerAlertHeaders("www.ixmaoperations.com", "demo-automation", "ticket_opened")).toEqual({
      "List-Id": "IxMa Portal alerts <portal-alerts.ixmaoperations.com>",
      "X-IxMa-Event": "ticket_opened",
      "X-IxMa-Project": "demo-automation",
    });
  });
});

describe("the morning digest", () => {
  const event = (over: Partial<DigestEvent>): DigestEvent => ({
    projectName: "Demo Automation",
    ticketId: "t1",
    ticketNumber: 1,
    title: "Invoice export fails",
    area: "Finance",
    priority: "medium",
    kind: "ticket_opened",
    fromStatus: null,
    toStatus: "open",
    actorName: "Ana Morales",
    ...over,
  });

  it("sends nothing when nothing happened", () => {
    expect(buildOwnerDigest([], "https://x.test")).toBeNull();
  });
  it("is one entry per ticket however many things happened on it", () => {
    const digest = buildOwnerDigest(
      [event({}), event({ kind: "comment_added", toStatus: null }), event({ kind: "comment_added", toStatus: null })],
      "https://x.test"
    )!;
    expect(digest.tickets).toBe(1);
    expect(digest.subject).toBe("[Portal] Digest: 1 ticket with client activity");
    const text = digest.lines.join("\n");
    expect(text).toContain("opened by Ana Morales, 2 comments");
    expect(text).toContain("https://x.test/portal/tickets/t1");
  });
  it("groups by project and puts the busiest ticket first", () => {
    const digest = buildOwnerDigest(
      [
        event({ ticketId: "a", ticketNumber: 1 }),
        event({ ticketId: "b", ticketNumber: 2, kind: "comment_added", toStatus: null }),
        event({ ticketId: "b", ticketNumber: 2, kind: "comment_added", toStatus: null }),
        event({ projectName: "Other Project", ticketId: "c", ticketNumber: 1 }),
      ],
      "https://x.test"
    )!;
    expect(digest.tickets).toBe(3);
    const text = digest.lines.join("\n");
    expect(text.indexOf("Demo Automation")).toBeLessThan(text.indexOf("Other Project"));
    expect(text.indexOf("#2")).toBeLessThan(text.indexOf("#1"));
  });
  it("describes a fix being confirmed and a ticket being sent back", () => {
    const text = buildOwnerDigest(
      [
        event({ ticketId: "a", kind: "ticket_status", fromStatus: "needs_review", toStatus: "closed" }),
        event({ ticketId: "b", ticketNumber: 2, kind: "ticket_status", fromStatus: "needs_review", toStatus: "open" }),
      ],
      "https://x.test"
    )!.lines.join("\n");
    expect(text).toContain("confirmed fixed and closed");
    expect(text).toContain("sent back (still broken)");
  });
  it("on Monday it looks back over the weekend, other days one day, always with a little overlap", () => {
    const monday = Date.parse("2026-11-02T15:00:00Z");
    const tuesday = Date.parse("2026-11-03T15:00:00Z");
    expect(digestWindowHours(monday, "America/Mexico_City")).toBeGreaterThan(72);
    expect(digestWindowHours(monday, "America/Mexico_City")).toBeLessThan(73);
    expect(digestWindowHours(tuesday, "America/Mexico_City")).toBeGreaterThan(24);
    expect(digestWindowHours(tuesday, "America/Mexico_City")).toBeLessThan(25);
  });
});

describe("emails to a client", () => {
  const ticket = { number: 3, title: "Invoice export fails", project: "Demo Automation", url: "https://x.test/portal/tickets/abc" };

  it("tells them a fix is ready to check, in both languages, with a link", () => {
    const { subject, text } = clientEmail("fix_ready", ticket);
    expect(subject).toContain("Tu ticket #3 está listo para revisar");
    expect(subject).toContain("Ticket #3 is ready for your review");
    expect(text).toContain("Marcamos tu ticket");
    expect(text).toContain("We marked your ticket");
    expect(text).toContain("https://x.test/portal/tickets/abc");
  });
  it("tells them they were answered, without repeating the answer", () => {
    const { subject, text } = clientEmail("owner_replied", ticket);
    expect(subject).toContain("Respondimos en tu ticket #3");
    expect(text).toContain("We replied on your ticket");
    expect(text).not.toMatch(/the answer is|respuesta:/i);
  });
  it("says where to change them and where to reply", () => {
    const { text } = clientEmail("fix_ready", ticket);
    expect(text).toMatch(/Configuración/);
    expect(text).toMatch(/Settings/);
  });
  it("in the language the person chose it is only that language", () => {
    const es = clientEmail("fix_ready", ticket, "es");
    expect(es.subject).toBe("Tu ticket #3 está listo para revisar");
    expect(es.text).toContain("Marcamos tu ticket");
    expect(es.text).not.toContain("We marked");
    expect(es.text.match(/https:\/\/x\.test/g)).toHaveLength(1);

    const en = clientEmail("owner_replied", ticket, "en");
    expect(en.subject).toBe("We replied on ticket #3");
    expect(en.text).toContain("We replied on your ticket");
    expect(en.text).not.toContain("Respondimos");
  });
  it("with no language chosen yet it is both, Spanish first", () => {
    const { subject } = clientEmail("fix_ready", ticket, null);
    expect(subject.indexOf("Tu ticket")).toBeLessThan(subject.indexOf("Ticket #3 is ready"));
  });
  it("a title with line breaks cannot break the email's layout or subject", () => {
    const { subject, text } = clientEmail("fix_ready", { ...ticket, title: "Bad\r\nBcc: x@y.z" });
    expect(subject).not.toMatch(/[\r\n]/);
    expect(text).toContain("Bad Bcc: x@y.z");
  });
  it("a burst of replies is one email", () => {
    expect(shouldEmailAboutReply(1)).toBe(true);
    expect(shouldEmailAboutReply(2)).toBe(false);
    expect(shouldEmailAboutReply(5)).toBe(false);
  });
});
