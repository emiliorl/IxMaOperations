import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABILITY, type AvailabilityConfig } from "./availability-config";
import { analyzeOnSiteDay, describeOnSiteDay, suggestCloserStart, type OnSiteMeeting } from "./onsite";
import { zonedTimeToUtc } from "./tz";

const TZ = "America/Mexico_City";
const CONFIG: AvailabilityConfig = { ...DEFAULT_AVAILABILITY, hostTimezone: TZ };
const WED = "2026-11-04";
const at = (time: string) => zonedTimeToUtc(WED, time, TZ);
const m = (from: string, to: string, extra: Partial<OnSiteMeeting> = {}): OnSiteMeeting => ({
  start: at(from),
  end: at(to),
  ...extra,
});
const hhmm = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);

describe("analyzeOnSiteDay", () => {
  it("flags a day with only one in-person meeting", () => {
    expect(analyzeOnSiteDay([m("10:00", "10:30")], CONFIG)).toEqual([{ type: "single" }]);
  });

  it("flags 10:00 and 14:30 as a gap too big to be worth sitting through", () => {
    const issues = analyzeOnSiteDay([m("10:00", "10:30"), m("14:30", "15:00")], CONFIG);
    expect(issues).toEqual([{ type: "gap", minutes: 240, afterIndex: 0 }]);
  });

  it("does not flag meetings that are reasonably close", () => {
    expect(analyzeOnSiteDay([m("10:00", "10:30"), m("11:30", "12:00")], CONFIG)).toEqual([]);
  });

  it("uses the configured threshold (default 150 min)", () => {
    const meetings = [m("10:00", "10:30"), m("12:30", "13:00")]; // 120 min gap
    expect(analyzeOnSiteDay(meetings, CONFIG)).toEqual([]);
    const strict = { ...CONFIG, onSite: { ...CONFIG.onSite, sparseGapMinutes: 90 } };
    expect(analyzeOnSiteDay(meetings, strict)).toHaveLength(1);
  });

  it("flags meetings at different addresses, ignoring case, accents and punctuation", () => {
    const same = analyzeOnSiteDay(
      [m("10:00", "10:30", { location: "Av. Reforma 100, CDMX" }), m("11:00", "11:30", { location: "av reforma 100 cdmx" })],
      CONFIG
    );
    expect(same).toEqual([]);
    const differ = analyzeOnSiteDay(
      [m("10:00", "10:30", { location: "Av. Reforma 100" }), m("11:00", "11:30", { location: "Calle Hidalgo 5" })],
      CONFIG
    );
    expect(differ).toEqual([{ type: "locations", count: 2 }]);
  });

  it("returns nothing for a day with no meetings", () => {
    expect(analyzeOnSiteDay([], CONFIG)).toEqual([]);
  });

  it("is independent of input order", () => {
    const issues = analyzeOnSiteDay([m("14:30", "15:00"), m("10:00", "10:30")], CONFIG);
    expect(issues).toEqual([{ type: "gap", minutes: 240, afterIndex: 0 }]);
  });
});

describe("suggestCloserStart", () => {
  it("moves the later meeting to just after the first, rounded up to the half hour", () => {
    const suggestion = suggestCloserStart([m("10:00", "10:30"), m("14:30", "15:00")], 0, CONFIG);
    expect(suggestion).toBeTruthy();
    expect(hhmm(suggestion!.newStart)).toBe("11:00"); // 10:30 + 10 min buffer → 10:40 → 11:00
    expect(suggestion!.meetingIndex).toBe(1);
  });

  it("never proposes a time inside lunch (12:30–13:00)", () => {
    // First meeting ends 12:00 → 12:10 → rounds to 12:30, which is lunch → pushed to 13:00.
    const suggestion = suggestCloserStart([m("11:30", "12:00"), m("15:00", "15:30")], 0, CONFIG);
    expect(hhmm(suggestion!.newStart)).toBe("13:00");
  });

  it("returns null when moving would not make it earlier", () => {
    expect(suggestCloserStart([m("10:00", "10:30"), m("11:00", "11:30")], 0, CONFIG)).toBeNull();
  });
});

describe("describeOnSiteDay", () => {
  it("is empty when there is nothing to flag", () => {
    expect(describeOnSiteDay(WED, [m("10:00", "10:30"), m("11:00", "11:30")], [], CONFIG)).toEqual([]);
  });

  it("explains a single-meeting day and offers staying to work", () => {
    const meetings = [m("10:00", "10:30", { guestName: "Ana" })];
    const text = describeOnSiteDay(WED, meetings, analyzeOnSiteDay(meetings, CONFIG), CONFIG).join("\n");
    expect(text).toContain("Wednesday, November 4");
    expect(text).toContain("Only one in-person meeting");
    expect(text).toContain("10:00 AM");
    expect(text).toContain("Ana");
    expect(text).toContain("work from there");
  });

  it("explains a gap and suggests the closer time", () => {
    const meetings = [m("10:00", "10:30", { guestName: "Ana" }), m("14:30", "15:00", { guestName: "Luis" })];
    const text = describeOnSiteDay(WED, meetings, analyzeOnSiteDay(meetings, CONFIG), CONFIG).join("\n");
    expect(text).toContain("4h gap");
    expect(text).toContain("ask Luis to move to 11:00 AM");
    expect(text).toContain("work from their office");
  });
});
