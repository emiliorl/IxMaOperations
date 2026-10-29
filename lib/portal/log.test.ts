import { describe, expect, it } from "vitest";
import { categoryOf, filterEvents, parseFilter, parseWeek, recentWeeks, summarize, weekRange, type LogEvent } from "./log";
import { ticketCountsByProblem, isActiveTicket, parseResources, serializeResources } from "./plan";
import { zonedTimeToUtc } from "@/lib/tz";

const TZ = "America/Mexico_City";
const ev = (kind: LogEvent["kind"], toStatus: string | null = null) => ({ kind, toStatus });

describe("what kind of change an event is", () => {
  it("plan status changes are progress", () => {
    expect(categoryOf(ev("plan_status", "completed"))).toBe("progress");
    expect(categoryOf(ev("plan_status", "pending"))).toBe("progress"); // moving back counts too
  });

  it("a ticket being opened is 'opened'", () => {
    expect(categoryOf(ev("ticket_opened", "open"))).toBe("opened");
  });

  it("a ticket moving to resolved or closed is 'solved'; other moves are plain activity", () => {
    expect(categoryOf(ev("ticket_status", "resolved"))).toBe("solved");
    expect(categoryOf(ev("ticket_status", "closed"))).toBe("solved");
    expect(categoryOf(ev("ticket_status", "in_progress"))).toBe("activity");
    expect(categoryOf(ev("ticket_status", "needs_review"))).toBe("activity");
    expect(categoryOf(ev("ticket_status", "open"))).toBe("activity"); // re-opened
  });

  it("comments are activity", () => {
    expect(categoryOf(ev("comment_added"))).toBe("activity");
  });
});

describe("filters and chip counts", () => {
  const events = [
    ev("plan_status", "in_progress"),
    ev("plan_status", "completed"),
    ev("ticket_opened", "open"),
    ev("ticket_status", "in_progress"),
    ev("ticket_status", "resolved"),
    ev("comment_added"),
  ];

  it("'all' keeps everything; each filter keeps only its category", () => {
    expect(filterEvents(events, "all")).toHaveLength(6);
    expect(filterEvents(events, "progress")).toHaveLength(2);
    expect(filterEvents(events, "opened")).toHaveLength(1);
    expect(filterEvents(events, "solved")).toHaveLength(1);
  });

  it("counts progress changes, tickets opened and tickets solved", () => {
    expect(summarize(events)).toEqual({ progress: 2, opened: 1, solved: 1 });
    expect(summarize([])).toEqual({ progress: 0, opened: 0, solved: 0 });
  });

  it("an unknown filter falls back to 'all'", () => {
    expect(parseFilter("solved")).toBe("solved");
    expect(parseFilter("hacked")).toBe("all");
    expect(parseFilter(undefined)).toBe("all");
  });
});

describe("weeks", () => {
  // Thursday 2026-10-29, 12:00 in Mexico City
  const now = zonedTimeToUtc("2026-10-29", "12:00", TZ);

  it("a week runs Monday 00:00 to the next Monday 00:00 in the host timezone", () => {
    const { from, to } = weekRange("2026-10-26", TZ);
    expect(from).toBe(zonedTimeToUtc("2026-10-26", "00:00", TZ));
    expect(to).toBe(zonedTimeToUtc("2026-11-02", "00:00", TZ));
    expect(to - from).toBe(7 * 86_400_000);
  });

  it("lists the last weeks, this one first", () => {
    const weeks = recentWeeks(now, TZ, 4);
    expect(weeks).toEqual(["2026-10-26", "2026-10-19", "2026-10-12", "2026-10-05"]);
  });

  it("the current week is the default; 'all' and a real Monday are honoured", () => {
    expect(parseWeek(undefined, now, TZ)).toBe("2026-10-26");
    expect(parseWeek("all", now, TZ)).toBe("all");
    expect(parseWeek("2026-10-12", now, TZ)).toBe("2026-10-12");
  });

  it("a date that isn't a Monday, or isn't a date, falls back to the current week", () => {
    expect(parseWeek("2026-10-28", now, TZ)).toBe("2026-10-26"); // a Wednesday
    expect(parseWeek("2026-13-45", now, TZ)).toBe("2026-10-26");
    expect(parseWeek("not-a-date", now, TZ)).toBe("2026-10-26");
    expect(parseWeek("'; drop table", now, TZ)).toBe("2026-10-26");
  });

  it("an event just before midnight Sunday belongs to the earlier week", () => {
    const sundayLate = zonedTimeToUtc("2026-11-01", "23:59", TZ);
    const mondayEarly = zonedTimeToUtc("2026-11-02", "00:01", TZ);
    const week = weekRange("2026-10-26", TZ);
    expect(sundayLate >= week.from && sundayLate < week.to).toBe(true);
    expect(mondayEarly >= week.from && mondayEarly < week.to).toBe(false);
  });
});

describe("problems: open tickets and links", () => {
  it("counts open and total tickets per problem, ignoring tickets with no problem", () => {
    const counts = ticketCountsByProblem([
      { milestoneId: "a", status: "open" },
      { milestoneId: "a", status: "in_progress" },
      { milestoneId: "a", status: "resolved" },
      { milestoneId: "b", status: "closed" },
      { milestoneId: null, status: "open" },
    ]);
    expect(counts.get("a")).toEqual({ open: 2, total: 3 });
    expect(counts.get("b")).toEqual({ open: 0, total: 1 });
    expect(counts.size).toBe(2);
  });

  it("open means anything not resolved or closed", () => {
    for (const s of ["open", "in_progress", "needs_review"]) expect(isActiveTicket(s)).toBe(true);
    for (const s of ["resolved", "closed"]) expect(isActiveTicket(s)).toBe(false);
  });

  it("links round-trip, and unsafe or malformed ones are dropped", () => {
    const stored = serializeResources([{ label: "Brief", url: "https://drive.google.com/x" }, { url: "https://example.com/a" }]);
    expect(parseResources(stored)).toEqual([
      { label: "Brief", url: "https://drive.google.com/x" },
      { label: "https://example.com/a", url: "https://example.com/a" },
    ]);
    expect(serializeResources([{ url: "javascript:alert(1)" }])).toBeNull();
    expect(parseResources(JSON.stringify([{ label: "x", url: "javascript:alert(1)" }, { label: "ok", url: "https://ok.test/" }]))).toEqual([
      { label: "ok", url: "https://ok.test/" },
    ]);
    expect(parseResources("not json")).toEqual([]);
    expect(parseResources(null)).toEqual([]);
    expect(parseResources(JSON.stringify({ not: "a list" }))).toEqual([]);
  });

  it("caps the number of links", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ url: `https://x.test/${i}` }));
    expect(serializeResources(many)).toBeNull();
  });
});
