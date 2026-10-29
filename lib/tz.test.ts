import { describe, expect, it } from "vitest";
import { addDays, isValidTimeZone, localDate, weekdayOf, zonedTimeToUtc } from "./tz";

describe("zonedTimeToUtc", () => {
  it("converts a fixed-offset zone (Mexico City is UTC-6, no DST since 2022)", () => {
    expect(zonedTimeToUtc("2026-03-10", "09:00", "America/Mexico_City")).toBe(Date.UTC(2026, 2, 10, 15, 0));
    expect(zonedTimeToUtc("2026-07-10", "09:00", "America/Mexico_City")).toBe(Date.UTC(2026, 6, 10, 15, 0));
  });

  it("respects the US DST switch on 2026-03-08 (EST -5 before, EDT -4 after)", () => {
    expect(zonedTimeToUtc("2026-03-07", "12:00", "America/New_York")).toBe(Date.UTC(2026, 2, 7, 17, 0));
    expect(zonedTimeToUtc("2026-03-08", "12:00", "America/New_York")).toBe(Date.UTC(2026, 2, 8, 16, 0));
  });

  it("respects the US fall-back on 2026-11-01", () => {
    expect(zonedTimeToUtc("2026-10-31", "12:00", "America/New_York")).toBe(Date.UTC(2026, 9, 31, 16, 0));
    expect(zonedTimeToUtc("2026-11-01", "12:00", "America/New_York")).toBe(Date.UTC(2026, 10, 1, 17, 0));
  });

  it("handles zones ahead of UTC", () => {
    expect(zonedTimeToUtc("2026-03-10", "09:00", "Asia/Tokyo")).toBe(Date.UTC(2026, 2, 10, 0, 0));
  });
});

describe("localDate", () => {
  it("returns the calendar date in the given zone, not in UTC", () => {
    const instant = Date.UTC(2026, 2, 10, 3, 0); // 03:00 UTC
    expect(localDate(instant, "UTC")).toBe("2026-03-10");
    expect(localDate(instant, "America/Mexico_City")).toBe("2026-03-09"); // 21:00 previous evening
    expect(localDate(instant, "Asia/Tokyo")).toBe("2026-03-10");
  });
});

describe("date helpers", () => {
  it("weekdayOf", () => {
    expect(weekdayOf("2026-11-02")).toBe(1); // Monday
    expect(weekdayOf("2026-11-01")).toBe(0); // Sunday
  });

  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("isValidTimeZone", () => {
    expect(isValidTimeZone("America/Mexico_City")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});
