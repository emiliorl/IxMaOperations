import { describe, expect, it } from "vitest";
import { DEFAULT_OFFICE_DAYS, describeOfficeDays, isOfficeDay, normalizeOfficeDays, officeDaysFromForm } from "./office-days";

describe("an office's open days", () => {
  it("is Monday to Friday until someone says otherwise", () => {
    expect(DEFAULT_OFFICE_DAYS).toEqual([1, 2, 3, 4, 5]);
    expect(normalizeOfficeDays(undefined)).toEqual([1, 2, 3, 4, 5]);
    expect(normalizeOfficeDays(null)).toEqual([1, 2, 3, 4, 5]);
  });

  it("cleans what it is given: sorted, no repeats, only real weekdays", () => {
    expect(normalizeOfficeDays([4, 1, 1, 3])).toEqual([1, 3, 4]);
    expect(normalizeOfficeDays(["2", "5"])).toEqual([2, 5]);
    expect(normalizeOfficeDays([0, 7, -1, 2.5, "x", 6])).toEqual([0, 6]);
  });

  it("allows no days at all: that office is online only", () => {
    expect(normalizeOfficeDays([])).toEqual([]);
    expect(officeDaysFromForm([])).toEqual([]);
  });

  it("reads the owner's form: only Monday to Friday can be ticked", () => {
    expect(officeDaysFromForm(["1", "2", "3", "4"])).toEqual([1, 2, 3, 4]);
    expect(officeDaysFromForm(["0", "6", "5", "abc"])).toEqual([5]);
    expect(officeDaysFromForm([new File([], "x")])).toEqual([]);
  });
});

describe("is a date an office day", () => {
  const monToThu = [1, 2, 3, 4];
  it("follows the weekday of the date", () => {
    expect(isOfficeDay("2026-11-05", monToThu)).toBe(true); // Thursday
    expect(isOfficeDay("2026-11-06", monToThu)).toBe(false); // Friday: home office
    expect(isOfficeDay("2026-11-07", monToThu)).toBe(false); // Saturday
    expect(isOfficeDay("2026-11-02", monToThu)).toBe(true); // Monday
    expect(isOfficeDay("2026-11-06", [])).toBe(false);
  });
});

describe("the days in words", () => {
  it("names a run of days as a range, in the viewer's language", () => {
    expect(describeOfficeDays([1, 2, 3, 4], "en", "none")).toBe("Monday–Thursday");
    expect(describeOfficeDays([1, 2, 3, 4], "es", "ninguno")).toBe("lunes–jueves");
    expect(describeOfficeDays([1, 2, 3, 4, 5], "en", "none")).toBe("Monday–Friday");
  });

  it("lists days that are not a run", () => {
    expect(describeOfficeDays([1, 3, 5], "en", "none")).toBe("Monday, Wednesday, and Friday");
    expect(describeOfficeDays([2, 4], "en", "none")).toBe("Tuesday and Thursday");
    expect(describeOfficeDays([3], "en", "none")).toBe("Wednesday");
  });

  it("says so when there are none", () => {
    expect(describeOfficeDays([], "en", "no days")).toBe("no days");
  });
});
