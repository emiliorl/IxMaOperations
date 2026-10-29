import { describe, expect, it } from "vitest";
import { safeHttpUrl } from "./constants";
import { milestoneProgress } from "./progress";
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
