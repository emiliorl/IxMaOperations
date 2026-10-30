import { describe, expect, it } from "vitest";
import { ageInDays, countBy, groupByLocalDay, sortNeedingAttention, weekWindow } from "./week-rules";

const GT = "America/Guatemala"; // UTC-6, no daylight saving
const utc = (iso: string) => Date.parse(iso);

describe("the seven days", () => {
  it("run from the start of today to the start of the eighth day, on the person's own clock", () => {
    // 2026-11-05 at 23:30 in Guatemala is already 2026-11-06 05:30 UTC.
    const w = weekWindow(utc("2026-11-06T05:30:00Z"), GT);
    expect(w.firstDate).toBe("2026-11-05");
    expect(w.lastDate).toBe("2026-11-11");
    expect(w.from).toBe(utc("2026-11-05T06:00:00Z")); // midnight in Guatemala
    expect(w.to).toBe(utc("2026-11-12T06:00:00Z"));
  });

  it("is the same instant for a different clock only when the clocks agree", () => {
    const now = utc("2026-11-06T05:30:00Z");
    expect(weekWindow(now, "UTC").firstDate).toBe("2026-11-06");
    expect(weekWindow(now, GT).firstDate).toBe("2026-11-05");
  });

  it("can be longer or shorter", () => {
    const w = weekWindow(utc("2026-11-05T15:00:00Z"), "UTC", 3);
    expect(w.lastDate).toBe("2026-11-07");
    expect(w.to).toBe(utc("2026-11-08T00:00:00Z"));
  });
});

describe("meetings by day", () => {
  const m = (iso: string, name: string) => ({ start: utc(iso), name });

  it("groups by the day they start on the person's clock, in order, with each day's meetings in time order", () => {
    const groups = groupByLocalDay([m("2026-11-06T20:00:00Z", "late"), m("2026-11-05T16:00:00Z", "a"), m("2026-11-05T14:00:00Z", "early")], GT);
    expect(groups.map((g) => [g.date, g.items.map((i) => i.name)])).toEqual([
      ["2026-11-05", ["early", "a"]],
      ["2026-11-06", ["late"]],
    ]);
  });

  it("puts a late-night meeting on the day it is for the person, not on the UTC day", () => {
    // 03:00 UTC on the 6th is 21:00 on the 5th in Guatemala.
    expect(groupByLocalDay([m("2026-11-06T03:00:00Z", "evening")], GT)[0].date).toBe("2026-11-05");
    expect(groupByLocalDay([m("2026-11-06T03:00:00Z", "evening")], "UTC")[0].date).toBe("2026-11-06");
  });

  it("leaves out days with nothing, and copes with nothing at all", () => {
    expect(groupByLocalDay([], GT)).toEqual([]);
    expect(groupByLocalDay([m("2026-11-05T16:00:00Z", "a"), m("2026-11-09T16:00:00Z", "b")], GT).map((g) => g.date)).toEqual(["2026-11-05", "2026-11-09"]);
  });

  it("does not change what it was given", () => {
    const input = [m("2026-11-06T20:00:00Z", "b"), m("2026-11-05T16:00:00Z", "a")];
    groupByLocalDay(input, GT);
    expect(input.map((i) => i.name)).toEqual(["b", "a"]);
  });
});

describe("what needs the owner first", () => {
  const t = (id: string, priority: string, day: number) => ({ id, priority, createdAt: Date.UTC(2026, 10, day) });

  it("the most urgent first, and among equals the oldest", () => {
    const sorted = sortNeedingAttention([t("low-old", "low", 1), t("high-new", "high", 20), t("critical", "critical", 25), t("high-old", "high", 3), t("medium", "medium", 2)]);
    expect(sorted.map((x) => x.id)).toEqual(["critical", "high-old", "high-new", "medium", "low-old"]);
  });

  it("puts an unknown priority last rather than losing it", () => {
    expect(sortNeedingAttention([t("odd", "weird", 1), t("low", "low", 2)]).map((x) => x.id)).toEqual(["low", "odd"]);
  });

  it("does not change what it was given", () => {
    const input = [t("b", "low", 2), t("a", "high", 3)];
    sortNeedingAttention(input);
    expect(input.map((x) => x.id)).toEqual(["b", "a"]);
  });
});

describe("how long something has waited", () => {
  it("counts whole days, never negative", () => {
    const now = Date.UTC(2026, 10, 10, 12);
    expect(ageInDays(Date.UTC(2026, 10, 10, 1), now)).toBe(0);
    expect(ageInDays(Date.UTC(2026, 10, 7, 12), now)).toBe(3);
    expect(ageInDays(Date.UTC(2026, 10, 11), now)).toBe(0);
  });
});

describe("counting by project", () => {
  it("counts each key", () => {
    const counts = countBy([{ p: "a" }, { p: "b" }, { p: "a" }], (x) => x.p);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBeUndefined();
  });
});
