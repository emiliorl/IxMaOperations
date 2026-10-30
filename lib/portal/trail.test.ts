import { describe, expect, it } from "vitest";
import { TRAIL_LIMIT, pageKind, previousPage, recordVisit } from "./trail";

const PLAN = "/portal/projects/domus?dept=rrhh";
const TICKETS = "/portal/projects/domus?tab=tickets&tickets=open&dept=rrhh";
const TICKET = "/portal/tickets/abc";
const PROBLEM = "/portal/projects/domus/problems/p1";
const BOOK = "/portal/book?project=domus&ticket=abc";

describe("remembering where the person has been", () => {
  it("adds each new page, and ignores the same page twice in a row", () => {
    let trail = recordVisit([], PLAN);
    trail = recordVisit(trail, TICKET);
    trail = recordVisit(trail, TICKET);
    expect(trail).toEqual([PLAN, TICKET]);
  });

  it("treats a page already on the trail as going back, and forgets what came after it", () => {
    const trail = recordVisit([PLAN, TICKET, BOOK], TICKET);
    expect(trail).toEqual([PLAN, TICKET]);
    expect(recordVisit(trail, PLAN)).toEqual([PLAN]);
  });

  it("keeps only the latest pages", () => {
    let trail: string[] = [];
    for (let i = 0; i < TRAIL_LIMIT + 10; i++) trail = recordVisit(trail, `/portal/tickets/${i}`);
    expect(trail).toHaveLength(TRAIL_LIMIT);
    expect(trail[trail.length - 1]).toBe(`/portal/tickets/${TRAIL_LIMIT + 9}`);
  });
});

describe("where back goes", () => {
  it("goes to the page before, with its tab, filter and area exactly as they were", () => {
    expect(previousPage([TICKETS, TICKET], TICKET)).toBe(TICKETS);
    expect(previousPage([PLAN, PROBLEM], PROBLEM)).toBe(PLAN);
  });

  it("goes one step at a time through ticket → booking and back", () => {
    expect(previousPage([PLAN, TICKET, BOOK], BOOK)).toBe(TICKET);
    expect(previousPage([PLAN, TICKET], TICKET)).toBe(PLAN);
  });

  it("is nothing when the person landed cold, so the page's own fixed address is used", () => {
    expect(previousPage([TICKET], TICKET)).toBeNull();
    expect(previousPage([], TICKET)).toBeNull();
  });

  it("skips the same page with another filter, sign-in, and a ticket form that was already sent", () => {
    expect(previousPage([PLAN, "/portal/tickets/abc?files=failed", TICKET], TICKET)).toBe(PLAN);
    expect(previousPage(["/portal/login", TICKET], TICKET)).toBeNull();
    expect(previousPage(["/portal/set-password", TICKET], TICKET)).toBeNull();
    // new ticket form → ticket opened: back from the ticket skips the form and returns to where the form was opened
    expect(previousPage([PLAN, "/portal/projects/domus/tickets/new?dept=rrhh", TICKET], TICKET)).toBe(PLAN);
  });

  it("still goes back from the new-ticket form itself", () => {
    expect(previousPage([PLAN, "/portal/projects/domus/tickets/new"], "/portal/projects/domus/tickets/new")).toBe(PLAN);
  });
});

describe("what kind of page it is", () => {
  it("names the places a back link can lead", () => {
    expect(pageKind("/portal")).toBe("projects");
    expect(pageKind(PLAN)).toBe("project");
    expect(pageKind(PROBLEM)).toBe("problem");
    expect(pageKind(TICKET)).toBe("ticket");
    expect(pageKind("/portal/projects/domus/log")).toBe("log");
    expect(pageKind(BOOK)).toBe("other");
    expect(pageKind("/portal/settings")).toBe("other");
  });
});
