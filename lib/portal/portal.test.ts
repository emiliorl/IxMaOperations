import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./constants";
import { milestoneProgress } from "./progress";
import { canOpenTickets, canWriteIn, writableDepartments } from "./queries";
import { validateNewPassword } from "./password";
import { MAX_TITLE, resolveTicketFolder, resolveTicketTitle } from "./ticket-title";
import { commentInput, loginInput, ticketInput } from "./schemas";

describe("milestoneProgress", () => {
  it("is 0 for an empty plan, never NaN", () => {
    expect(milestoneProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("counts only completed milestones", () => {
    const result = milestoneProgress([
      { status: "completed" },
      { status: "in_progress" },
      { status: "blocked" },
      { status: "pending" },
    ]);
    expect(result).toEqual({ done: 1, total: 4, percent: 25 });
  });

  it("rounds to a whole percent and reaches 100", () => {
    expect(milestoneProgress([{ status: "completed" }, { status: "completed" }, { status: "pending" }]).percent).toBe(67);
    expect(milestoneProgress([{ status: "completed" }]).percent).toBe(100);
  });
});

describe("safeHttpUrl", () => {
  it("allows http and https", () => {
    expect(safeHttpUrl("https://staging.acme.test/app")).toBe("https://staging.acme.test/app");
    expect(safeHttpUrl("http://localhost:3000")).toBe("http://localhost:3000/");
  });

  it("blocks script and other schemes, and junk", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>1</script>")).toBeNull();
    expect(safeHttpUrl("ftp://x.test")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
  });
});

describe("input validation", () => {
  const ticket = {
    projectSlug: "acme-automation",
    departmentId: "",
    milestoneId: "",
    title: "Checkout times out",
    description: "Happens on staging.",
    category: "bug",
    priority: "high",
    environment: "staging",
    affectedUrl: "",
  };

  it("accepts a valid ticket, including project-wide (empty department)", () => {
    expect(ticketInput.safeParse(ticket).success).toBe(true);
  });

  it("rejects bad enum values, short titles and non-http URLs", () => {
    expect(ticketInput.safeParse({ ...ticket, priority: "urgent!!" }).success).toBe(false);
    expect(ticketInput.safeParse({ ...ticket, title: "x".repeat(201) }).success).toBe(false);
    expect(ticketInput.safeParse({ ...ticket, affectedUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(ticketInput.safeParse({ ...ticket, affectedUrl: "https://acme.test/checkout" }).success).toBe(true);
  });

  it("rejects a department id that is not a uuid", () => {
    expect(ticketInput.safeParse({ ...ticket, departmentId: "finance" }).success).toBe(false);
  });

  it("comments need a real ticket id and non-blank text", () => {
    const id = "40000000-0000-0000-0000-000000000001";
    expect(commentInput.safeParse({ ticketId: id, message: "  ", internal: false }).success).toBe(false);
    expect(commentInput.safeParse({ ticketId: "x", message: "hi", internal: false }).success).toBe(false);
    expect(commentInput.safeParse({ ticketId: id, message: "hi", internal: false }).success).toBe(true);
  });

  it("login needs a valid email and a password", () => {
    expect(loginInput.safeParse({ email: "ana@acme.test", password: "pw" }).success).toBe(true);
    expect(loginInput.safeParse({ email: "nope", password: "pw" }).success).toBe(false);
    expect(loginInput.safeParse({ email: "ana@acme.test", password: "" }).success).toBe(false);
  });
});

describe("what the page offers each kind of person", () => {
  const FIN = { id: "f", name: "Finance" };
  const OPS = { id: "o", name: "Operations" };
  const HR = { id: "h", name: "HR" };
  const folders = [FIN, OPS, HR];
  const none = { isMember: false, allDepartments: false, departmentIds: [] as string[], orgLevel: null };

  it("a person with one folder can write only there and project-wide", () => {
    const one = { ...none, isMember: true, departmentIds: ["f"] };
    expect(canWriteIn(one, false, "f")).toBe(true);
    expect(canWriteIn(one, false, null)).toBe(true);
    expect(canWriteIn(one, false, "o")).toBe(false);
    expect(writableDepartments(one, false, [FIN])).toEqual([FIN]);
  });

  it("a person with several folders can write in each of them, not the rest", () => {
    const several = { ...none, isMember: true, departmentIds: ["f", "o"] };
    expect(canWriteIn(several, false, "f")).toBe(true);
    expect(canWriteIn(several, false, "o")).toBe(true);
    expect(canWriteIn(several, false, "h")).toBe(false);
    expect(writableDepartments(several, false, folders)).toEqual([FIN, OPS]);
  });

  it("all-folders members and full executives can write anywhere; the owner too", () => {
    expect(canWriteIn({ ...none, isMember: true, allDepartments: true }, false, "h")).toBe(true);
    expect(canWriteIn({ ...none, orgLevel: "full" }, false, "h")).toBe(true);
    expect(canWriteIn(none, true, "h")).toBe(true);
    expect(writableDepartments({ ...none, orgLevel: "full" }, false, folders)).toEqual(folders);
  });

  it("a view-only executive and a stranger can write nowhere", () => {
    const view = { ...none, orgLevel: "view" as const };
    for (const dept of ["f", "o", null]) {
      expect(canWriteIn(view, false, dept)).toBe(false);
      expect(canWriteIn(none, false, dept)).toBe(false);
    }
    expect(canOpenTickets(view, false)).toBe(false);
    expect(canOpenTickets(none, false)).toBe(false);
  });

  it("who is offered the 'New ticket' button", () => {
    expect(canOpenTickets({ ...none, isMember: true }, false)).toBe(true);
    expect(canOpenTickets({ ...none, orgLevel: "full" }, false)).toBe(true);
    expect(canOpenTickets(none, true)).toBe(true);
  });
});

describe("naming and filing a ticket tied to a plan item", () => {
  it("uses the typed title when there is one", () => {
    expect(resolveTicketTitle("  Totals are wrong ", "Invoice automation")).toEqual({ ok: true, title: "Totals are wrong" });
  });

  it("names the ticket after the plan item when no title was typed", () => {
    expect(resolveTicketTitle("", "Invoice automation")).toEqual({ ok: true, title: "Invoice automation" });
    expect(resolveTicketTitle("   ", "Invoice automation")).toEqual({ ok: true, title: "Invoice automation" });
  });

  it("insists on a real title when the ticket isn't about a plan item", () => {
    expect(resolveTicketTitle("", null)).toEqual({ ok: false });
    expect(resolveTicketTitle("ab", null)).toEqual({ ok: false });
  });

  it("does not silently replace a too-short typed title with the plan item's", () => {
    expect(resolveTicketTitle("ab", "Invoice automation")).toEqual({ ok: false });
  });

  it("caps the title length", () => {
    const result = resolveTicketTitle("x".repeat(500), null);
    expect(result.ok && result.title.length).toBe(MAX_TITLE);
  });

  it("a plan item's folder decides where the ticket goes; project-wide items leave the choice", () => {
    expect(resolveTicketFolder("fin", "hr")).toBe("fin"); // can't file it under another folder
    expect(resolveTicketFolder(null, "ops")).toBe("ops");
    expect(resolveTicketFolder(null, "")).toBeNull();
    expect(resolveTicketFolder(undefined, "")).toBeNull();
  });
});

describe("choosing a password", () => {
  const email = "carla.ruiz@acme.com";
  const good = "correct horse battery";

  it("accepts a long passphrase typed twice", () => {
    expect(validateNewPassword(good, good, email)).toBeNull();
  });

  it("requires at least 12 characters", () => {
    expect(validateNewPassword("short1!", "short1!", email)).toBe("too_short");
    expect(validateNewPassword("elevenchars", "elevenchars", email)).toBe("too_short");
    expect(validateNewPassword("twelve chars", "twelve chars", email)).toBeNull();
  });

  it("requires both entries to match", () => {
    expect(validateNewPassword(good, good + "x", email)).toBe("mismatch");
  });

  it("rejects absurdly long input", () => {
    const huge = "a1".repeat(100);
    expect(validateNewPassword(huge, huge, email)).toBe("too_long");
  });

  it("rejects the person's own email or name-from-email", () => {
    expect(validateNewPassword("carla.ruiz@acme.com", "carla.ruiz@acme.com", email)).toBe("contains_email");
    expect(validateNewPassword("Carla.Ruiz-2026!!", "Carla.Ruiz-2026!!", email)).toBe("contains_email");
  });

  it("rejects the most-guessed passwords and single repeated characters", () => {
    expect(validateNewPassword("password1234", "password1234", email)).toBe("common");
    expect(validateNewPassword("aaaaaaaaaaaaaa", "aaaaaaaaaaaaaa", email)).toBe("common");
  });
});
