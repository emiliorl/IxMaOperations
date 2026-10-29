import { describe, expect, it } from "vitest";
import { inFolder, matchesTicketFilter, parseTicketFilter, projectFilterHref, resolveFolderFilter, ticketBucket } from "./filters";
import { milestoneProgress } from "./progress";

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
