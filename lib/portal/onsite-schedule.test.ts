import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "../tz";
import { buildOnSiteDay, impliedVisits, localTime, mergeVisits, type BusySpan, type OnSiteDay } from "./onsite-schedule";

const tz = "America/Mexico_City"; // UTC-6, no daylight saving
const date = "2026-11-05"; // a Thursday
const at = (time: string) => zonedTimeToUtc(date, time, tz);
const meeting = (from: string, to: string, mine = false): BusySpan => ({ start: at(from), end: at(to), mine });
const longBefore = at("00:00"); // "now" earlier than the visit: the whole day is shown

const build = (busy: BusySpan[] | null, over: Partial<Parameters<typeof buildOnSiteDay>[0]> = {}) =>
  buildOnSiteDay({
    visit: { date, start: "10:00", end: "15:30" },
    timeZone: tz,
    now: longBefore,
    busy,
    lunch: { start: "12:00", end: "13:00" },
    bufferMinutes: 15,
    ...over,
  });

/** A readable picture of a day: "10:00-12:00 free" … */
const picture = (day: OnSiteDay) => day.segments.map((s) => `${localTime(s.start, tz)}-${localTime(s.end, tz)} ${s.kind}${s.mine ? "(mine)" : ""}`);
const windows = (day: OnSiteDay) => day.free.map((f) => `${localTime(f.start, tz)}-${localTime(f.end, tz)}`);

describe("an on-site day with nothing booked", () => {
  it("is free except for lunch", () => {
    const day = build([])!;
    expect(picture(day)).toEqual(["10:00-12:00 free", "12:00-13:00 lunch", "13:00-15:30 free"]);
    expect(windows(day)).toEqual(["10:00-12:00", "13:00-15:30"]);
  });
});

describe("meetings", () => {
  it("block their time, and the minutes around them are not offered (the owner has to get there and back)", () => {
    const day = build([meeting("11:00", "11:30")])!;
    expect(picture(day)).toEqual([
      "10:00-10:45 free",
      "10:45-11:00 gap",
      "11:00-11:30 busy",
      "11:30-12:00 gap", // 15 minutes of buffer, then only 15 minutes before lunch: too short to offer
      "12:00-13:00 lunch",
      "13:00-15:30 free",
    ]);
    expect(windows(day)).toEqual(["10:00-10:45", "13:00-15:30"]);
  });

  it("the stretch between a meeting and lunch is only worth it if it is long enough", () => {
    // 11:30 meeting end + 15 min buffer = 11:45; lunch at 12:00 -> 15 minutes: too short.
    const short = build([meeting("11:00", "11:30")])!;
    expect(windows(short)).not.toContain("11:45-12:00");
    // A meeting that ends at 11:00 leaves 11:15-12:00: 45 minutes.
    const long = build([meeting("10:15", "11:00")])!;
    expect(windows(long)).toEqual(["11:15-12:00", "13:00-15:30"]);
  });

  it("a meeting over lunch wins: lunch is only what is left of it", () => {
    const day = build([meeting("12:30", "13:30")])!;
    expect(picture(day)).toEqual([
      "10:00-12:00 free",
      "12:00-12:30 lunch",
      "12:30-13:30 busy",
      "13:30-13:45 gap",
      "13:45-15:30 free",
    ]);
  });

  it("two meetings that touch are one block; a mix of mine and someone else's is not shown as mine", () => {
    const day = build([meeting("10:00", "10:30", true), meeting("10:30", "11:00", false)])!;
    expect(picture(day).slice(0, 1)).toEqual(["10:00-11:00 busy"]);
    expect(build([meeting("10:00", "10:30", true), meeting("10:30", "11:00", true)])!.segments[0].mine).toBe(true);
  });

  it("a meeting of the project's own people is marked as theirs", () => {
    expect(picture(build([meeting("14:00", "14:30", true)])!)).toContain("14:00-14:30 busy(mine)");
  });

  it("a meeting that starts before the hours or runs past them only counts for the part inside", () => {
    const day = build([meeting("09:00", "10:30"), meeting("15:00", "17:00")])!;
    expect(picture(day)[0]).toBe("10:00-10:30 busy");
    expect(picture(day).at(-1)).toBe("15:00-15:30 busy");
  });

  it("a meeting entirely outside the hours changes nothing", () => {
    expect(windows(build([meeting("07:00", "08:00"), meeting("17:00", "18:00")])!)).toEqual(["10:00-12:00", "13:00-15:30"]);
  });

  it("a day full of meetings has no free time", () => {
    const day = build([meeting("10:00", "12:00"), meeting("13:00", "15:30")])!;
    expect(day.free).toEqual([]);
    expect(day.known).toBe(true);
  });
});

describe("the timeline", () => {
  const cases: [string, BusySpan[]][] = [
    ["empty", []],
    ["one meeting", [meeting("11:00", "11:30")]],
    ["meeting over lunch", [meeting("12:30", "13:30")]],
    ["several", [meeting("10:00", "10:20"), meeting("10:30", "11:00", true), meeting("14:00", "15:00")]],
    ["overlapping", [meeting("10:00", "11:00"), meeting("10:30", "11:30")]],
  ];
  it.each(cases)("%s: covers the hours exactly, without gaps or overlaps", (_name, busy) => {
    const day = build(busy)!;
    expect(day.segments[0].start).toBe(day.start);
    expect(day.segments.at(-1)!.end).toBe(day.end);
    for (let i = 1; i < day.segments.length; i++) expect(day.segments[i].start).toBe(day.segments[i - 1].end);
    for (const s of day.segments) expect(s.end).toBeGreaterThan(s.start);
  });
});

describe("a day with fewer hours", () => {
  it("a morning-only visit has no lunch in it", () => {
    const day = build([], { visit: { date, start: "09:00", end: "11:30" } })!;
    expect(picture(day)).toEqual(["09:00-11:30 free"]);
  });
  it("lunch is only shown where it falls inside the hours", () => {
    const day = build([], { visit: { date, start: "12:30", end: "15:00" } })!;
    expect(picture(day)).toEqual(["12:30-13:00 lunch", "13:00-15:00 free"]);
  });
});

describe("today and the past", () => {
  it("today only shows what is still ahead", () => {
    const day = build([], { now: at("11:10") })!;
    expect(day.start).toBe(at("11:10"));
    expect(windows(day)).toEqual(["11:10-12:00", "13:00-15:30"]);
  });
  it("a day that is over is not shown", () => {
    expect(build([], { now: at("16:00") })).toBeNull();
    expect(build([], { now: at("15:30") })).toBeNull();
  });
});

describe("when the calendar could not be read", () => {
  it("shows the hours and claims no free time", () => {
    const day = build(null)!;
    expect(day.known).toBe(false);
    expect(day.free).toEqual([]);
    expect(day.segments).toEqual([]);
    expect(localTime(day.start, tz)).toBe("10:00");
    expect(localTime(day.end, tz)).toBe("15:30");
  });
});

describe("days with a meeting for the project but no announcement", () => {
  const usual = { start: "10:00", end: "15:30" };
  it("are shown with the usual hours", () => {
    expect(impliedVisits([{ start: at("11:00"), end: at("11:30") }], new Set(), tz, usual)).toEqual([{ date, start: "10:00", end: "15:30" }]);
  });
  it("stretch to cover a meeting outside the usual hours", () => {
    expect(impliedVisits([{ start: at("08:30"), end: at("09:00") }, { start: at("16:00"), end: at("16:30") }], new Set(), tz, usual)).toEqual([
      { date, start: "08:30", end: "16:30" },
    ]);
  });
  it("one per day however many meetings, and none for an announced day", () => {
    const two = [{ start: at("11:00"), end: at("11:30") }, { start: at("14:00"), end: at("14:30") }];
    expect(impliedVisits(two, new Set(), tz, usual)).toHaveLength(1);
    expect(impliedVisits(two, new Set([date]), tz, usual)).toEqual([]);
  });
  it("an announced day wins over an implied one and the list is in date order", () => {
    const merged = mergeVisits(
      [{ date: "2026-11-12", start: "09:00", end: "13:00" }],
      [
        { date: "2026-11-05", start: "10:00", end: "15:30" },
        { date: "2026-11-12", start: "10:00", end: "15:30" },
      ]
    );
    expect(merged).toEqual([
      { date: "2026-11-05", start: "10:00", end: "15:30" },
      { date: "2026-11-12", start: "09:00", end: "13:00" },
    ]);
  });
});
