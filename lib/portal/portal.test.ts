import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./constants";
import { milestoneProgress } from "./progress";
import { canOpenTickets, canWriteIn, writableDepartments } from "./queries";
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
    expect(ticketInput.safeParse({ ...ticket, title: "ab" }).success).toBe(false);
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
