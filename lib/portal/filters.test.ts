import { describe, expect, it } from "vitest";
import {
  areaSummary,
  inFolder,
  matchesQuery,
  matchesTicketFilter,
  parseProjectTab,
  parseSearch,
  parseTicketFilter,
  parseTicketSort,
  projectFilterHref,
  resolveFolderFilter,
  sortTickets,
  ticketBucket,
  workspaceStats,
} from "./filters";
import { milestoneBreakdown, milestoneProgress } from "./progress";

const folders = new Set(["fin", "ops"]);

describe("which folder the project page shows", () => {
  it("'all' shows everything", () => {
    expect(resolveFolderFilter("all", folders, "fin")).toBeNull();
  });
  it("a folder the person can open is used", () => {
    expect(resolveFolderFilter("ops", folders, "fin")).toBe("ops");
  });
  it("nothing chosen falls back to the person's own folder", () => {
    expect(resolveFolderFilter(undefined, folders, "fin")).toBe("fin");
    expect(resolveFolderFilter(undefined, folders, null)).toBeNull();
  });
  it("an unknown or hidden folder id shows everything, not the default", () => {
    expect(resolveFolderFilter("hr", folders, "fin")).toBeNull();
    expect(resolveFolderFilter("", folders, "fin")).toBeNull();
  });
});

describe("what a folder view contains", () => {
  it("includes that folder and project-wide items, nothing else", () => {
    expect(inFolder("fin", "fin")).toBe(true);
    expect(inFolder("fin", null)).toBe(true);
    expect(inFolder("fin", "ops")).toBe(false);
    expect(inFolder(null, "ops")).toBe(true);
  });

  it("progress is computed from the folder's items, so the bar matches the list", () => {
    const items = [
      { departmentId: "fin", status: "completed" as const },
      { departmentId: "ops", status: "pending" as const },
      { departmentId: "ops", status: "pending" as const },
      { departmentId: null, status: "pending" as const },
    ];
    expect(milestoneProgress(items)).toEqual({ done: 1, total: 4, percent: 25 });
    expect(milestoneProgress(items.filter((i) => inFolder("fin", i.departmentId)))).toEqual({ done: 1, total: 2, percent: 50 });
  });
});

describe("ticket state tabs", () => {
  it("parses only known values", () => {
    expect(parseTicketFilter("open")).toBe("open");
    expect(parseTicketFilter("solved")).toBe("solved");
    expect(parseTicketFilter("review")).toBe("review");
    expect(parseTicketFilter("nonsense")).toBe("all");
    expect(parseTicketFilter(undefined)).toBe("all");
  });
  it("every status belongs to exactly one tab (so no ticket is counted twice)", () => {
    const tabs = ["open", "review", "solved"] as const;
    for (const status of ["open", "in_progress", "needs_review", "resolved", "closed"]) {
      expect(tabs.filter((tab) => matchesTicketFilter(status, tab))).toHaveLength(1);
      expect(matchesTicketFilter(status, "all")).toBe(true);
    }
  });
  it("'open' is work the owner still has to do; 'review' is waiting on the person; 'solved' is finished", () => {
    expect(["open", "in_progress"].map(ticketBucket)).toEqual(["open", "open"]);
    expect(ticketBucket("needs_review")).toBe("review");
    expect(["resolved", "closed"].map(ticketBucket)).toEqual(["solved", "solved"]);
    expect(matchesTicketFilter("needs_review", "open")).toBe(false);
    expect(matchesTicketFilter("needs_review", "review")).toBe(true);
  });
});

describe("filter links keep the other filter", () => {
  it("changing the ticket tab keeps the folder", () => {
    expect(projectFilterHref("acme", { dept: "fin", tickets: "open" }).query).toEqual({ dept: "fin", tickets: "open" });
  });
  it("changing the folder keeps the ticket tab", () => {
    expect(projectFilterHref("acme", { dept: "ops", tickets: "solved" }).query).toEqual({ dept: "ops", tickets: "solved" });
  });
  it("leaves out defaults so a clean URL stays clean", () => {
    expect(projectFilterHref("acme", {}).query).toEqual({});
    expect(projectFilterHref("acme", { tickets: "all" }).query).toEqual({});
    expect(projectFilterHref("acme", { dept: "all" }).query).toEqual({ dept: "all" });
  });
  it("points at the project page", () => {
    expect(projectFilterHref("acme", {}).pathname).toBe("/portal/projects/acme");
  });
});

describe("workspace tabs and search", () => {
  it("parses only known tabs; nothing chosen is null so the page can pick a sensible one", () => {
    expect(parseProjectTab("tickets")).toBe("tickets");
    expect(parseProjectTab("team")).toBe("team");
    expect(parseProjectTab("nope")).toBeNull();
    expect(parseProjectTab(undefined)).toBeNull();
  });
  it("trims and caps what was searched", () => {
    expect(parseSearch("  invoice ")).toBe("invoice");
    expect(parseSearch(undefined)).toBe("");
    expect(parseSearch("x".repeat(200))).toHaveLength(80);
  });
  it("matches every word, ignoring case and accents", () => {
    expect(matchesQuery("facturacion", ["Automatización de Facturación"])).toBe(true);
    expect(matchesQuery("INVOICE auto", ["Invoice automation"])).toBe(true);
    expect(matchesQuery("invoice payroll", ["Invoice automation"])).toBe(false);
    expect(matchesQuery("", ["anything"])).toBe(true);
  });
  it("finds a ticket by its number, with or without the #", () => {
    expect(matchesQuery("#3", [3, "Login fails"])).toBe(true);
    expect(matchesQuery("3", [3, "Login fails"])).toBe(true);
    expect(matchesQuery("#4", [3, "Login fails"])).toBe(false);
  });
  it("skips empty fields", () => {
    expect(matchesQuery("dw-1", [null, undefined, "DW-1"])).toBe(true);
  });
  it("links carry the tab and the search along, and leave out the empty ones", () => {
    expect(projectFilterHref("acme", { dept: "fin", tab: "tickets", q: "login" }).query).toEqual({ dept: "fin", tab: "tickets", q: "login" });
    expect(projectFilterHref("acme", { tab: null, q: "" }).query).toEqual({});
  });
});

describe("ticket queue order", () => {
  const ticket = (id: string, status: string, priority: string, updatedAt: string, createdAt = "2026-10-01T00:00:00Z") => ({
    id,
    status,
    priority,
    createdAt,
    updatedAt,
  });
  const list = [
    ticket("old-open-low", "open", "low", "2026-10-02T00:00:00Z"),
    ticket("solved-fresh", "resolved", "critical", "2026-10-28T00:00:00Z"),
    ticket("new-open-medium", "in_progress", "medium", "2026-10-20T00:00:00Z"),
    ticket("old-open-critical", "needs_review", "critical", "2026-10-05T00:00:00Z", "2026-09-01T00:00:00Z"),
  ];
  const ids = (sort: Parameters<typeof sortTickets>[1]) => sortTickets(list, sort).map((t) => t.id);

  it("parses only known sorts", () => {
    expect(parseTicketSort("priority")).toBe("priority");
    expect(parseTicketSort("newest")).toBe("newest");
    expect(parseTicketSort("junk")).toBe("activity");
    expect(parseTicketSort(undefined)).toBe("activity");
  });
  it("activity: what still needs attention first, the most recently changed on top", () => {
    expect(ids("activity")).toEqual(["new-open-medium", "old-open-critical", "old-open-low", "solved-fresh"]);
  });
  it("priority: critical first among what needs attention; solved still last", () => {
    expect(ids("priority")).toEqual(["old-open-critical", "new-open-medium", "old-open-low", "solved-fresh"]);
  });
  it("newest: by when it was opened, solved or not", () => {
    expect(ids("newest").at(-1)).toBe("old-open-critical");
  });
  it("does not reorder the list it was given", () => {
    const before = list.map((t) => t.id);
    sortTickets(list, "priority");
    expect(list.map((t) => t.id)).toEqual(before);
  });
  it("links keep the sort and 'mine', and leave out the defaults", () => {
    expect(projectFilterHref("acme", { sort: "priority", mine: true }).query).toEqual({ sort: "priority", mine: "1" });
    expect(projectFilterHref("acme", { sort: "activity", mine: false }).query).toEqual({});
  });
});

describe("quick stats", () => {
  it("counts what is open, waiting on the person, solved and blocked", () => {
    const tickets = [{ status: "open" }, { status: "in_progress" }, { status: "needs_review" }, { status: "closed" }];
    expect(workspaceStats([{ status: "blocked" }, { status: "completed" }], tickets)).toEqual({ open: 2, review: 1, solved: 1, blocked: 1 });
    expect(workspaceStats([], [])).toEqual({ open: 0, review: 0, solved: 0, blocked: 0 });
  });
});

describe("what an area card shows", () => {
  const items = [
    { status: "completed", departmentId: null }, // project-wide: counts in every area
    { status: "completed", departmentId: "fin" },
    { status: "pending", departmentId: "fin" },
    { status: "in_progress", departmentId: "ops" },
  ];
  const tickets = [
    { status: "open", departmentId: "fin" },
    { status: "in_progress", departmentId: "fin" },
    { status: "needs_review", departmentId: "fin" },
    { status: "closed", departmentId: "fin" },
    { status: "open", departmentId: "ops" },
  ];

  it("summarises one area, with project-wide items included", () => {
    expect(areaSummary("fin", items, tickets)).toEqual({ done: 2, total: 3, percent: 67, open: 2, review: 1 });
    expect(areaSummary("ops", items, tickets)).toEqual({ done: 1, total: 2, percent: 50, open: 1, review: 0 });
  });
  it("'all areas' summarises everything", () => {
    expect(areaSummary(null, items, tickets)).toEqual({ done: 2, total: 4, percent: 50, open: 3, review: 1 });
  });
  it("an area with nothing in it is 0%, not a division error", () => {
    expect(areaSummary("hr", [], [])).toEqual({ done: 0, total: 0, percent: 0, open: 0, review: 0 });
  });
});

describe("plan status breakdown", () => {
  it("counts each status in a fixed order and leaves out the empty ones", () => {
    const list = [{ status: "pending" }, { status: "completed" }, { status: "pending" }, { status: "blocked" }] as { status: "pending" | "completed" | "blocked" }[];
    expect(milestoneBreakdown(list)).toEqual([
      { status: "completed", count: 1 },
      { status: "blocked", count: 1 },
      { status: "pending", count: 2 },
    ]);
    expect(milestoneBreakdown([])).toEqual([]);
  });
});
