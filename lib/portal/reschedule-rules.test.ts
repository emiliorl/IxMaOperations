import { describe, expect, it } from "vitest";
import type { ExistingMeeting } from "../availability";
import { DEFAULT_AVAILABILITY } from "../availability-config";
import { zonedTimeToUtc } from "../tz";
import { isNewTimeOffered, minutesOf, withoutMeeting } from "./reschedule-rules";

const TZ = "UTC";
const config = { ...DEFAULT_AVAILABILITY, hostTimezone: TZ };
const at = (date: string, time: string) => zonedTimeToUtc(date, time, TZ);
const MON = "2026-11-09";
const TUE = "2026-11-10";
const WED = "2026-11-11";
const THU = "2026-11-12";
const FRI = "2026-11-13";
// "Now" is a week earlier, so notice periods never get in the way.
const now = at("2026-11-02", "06:00");

const meeting = (date: string, from: string, to: string, mode: "online" | "in_person" = "in_person", createdAt?: number): ExistingMeeting => ({
  start: at(date, from),
  end: at(date, to),
  mode,
  createdAt: createdAt ?? at(date, from),
});
const query = (meetings: ExistingMeeting[], extra = {}) => ({ now, hostBusy: [], overrides: {}, meetings, config, ...extra });

describe("taking the moving meeting out of the others", () => {
  const a = meeting(MON, "10:00", "10:30");
  const b = meeting(WED, "11:00", "11:30");

  it("removes exactly that one, by its time and format", () => {
    expect(withoutMeeting([a, b], a)).toEqual([b]);
    expect(withoutMeeting([a, b], b)).toEqual([a]);
  });

  it("leaves the list alone when it isn't there", () => {
    expect(withoutMeeting([a], b)).toEqual([a]);
    expect(withoutMeeting([], a)).toEqual([]);
  });

  it("does not remove a meeting at the same time in another format", () => {
    const online = meeting(MON, "10:00", "10:30", "online");
    expect(withoutMeeting([online], a)).toEqual([online]);
  });
});

describe("a meeting's length", () => {
  it("is its minutes", () => {
    expect(minutesOf(meeting(MON, "10:00", "10:30"))).toBe(30);
    expect(minutesOf(meeting(MON, "10:00", "10:45"))).toBe(45);
  });
});

describe("where a meeting may be moved to", () => {
  it("to a free time of the same format and length", () => {
    const moving = meeting(WED, "10:00", "10:30", "online");
    expect(isNewTimeOffered(query([moving]), moving, at(THU, "10:00"))).toBe(true);
  });

  it("not to the time it already has", () => {
    const moving = meeting(WED, "10:00", "10:30", "online");
    expect(isNewTimeOffered(query([moving]), moving, moving.start)).toBe(false);
  });

  it("not to a time that is taken by someone else's meeting", () => {
    const moving = meeting(WED, "10:00", "10:30", "online");
    const other = meeting(THU, "10:00", "10:30", "online");
    expect(isNewTimeOffered(query([moving, other]), moving, other.start)).toBe(false);
  });

  it("not to a time the owner's calendar shows as busy", () => {
    const moving = meeting(WED, "10:00", "10:30", "online");
    expect(isNewTimeOffered(query([moving], { hostBusy: [{ start: at(THU, "09:30"), end: at(THU, "11:00") }] }), moving, at(THU, "10:00"))).toBe(false);
  });

  it("not to a time that is not on offer at all, like a Saturday or the middle of the night", () => {
    const moving = meeting(WED, "10:00", "10:30", "online");
    expect(isNewTimeOffered(query([moving]), moving, at("2026-11-14", "10:00"))).toBe(false);
    expect(isNewTimeOffered(query([moving]), moving, at(THU, "03:00"))).toBe(false);
  });

  it("not off the slot grid", () => {
    const moving = meeting(WED, "10:00", "10:30", "online");
    expect(isNewTimeOffered(query([moving]), moving, at(THU, "10:07"))).toBe(false);
  });
});

describe("the weekly in-person limit does not count the meeting that is moving", () => {
  // Two on-site days a week at most. Monday is this meeting's day, Tuesday belongs to someone else.
  const moving = meeting(MON, "11:00", "11:30");
  const tuesday = meeting(TUE, "11:00", "11:30");
  const wednesday = meeting(WED, "11:00", "11:30");

  it("moving the only meeting of a day to another day is allowed: it leaves the first, so the week has room", () => {
    // Counting it, Monday + Tuesday already fill the week and Friday would be refused. It is leaving Monday, so Friday is fine.
    expect(isNewTimeOffered(query([moving, tuesday]), moving, at(FRI, "11:00"))).toBe(true);
  });

  it("but not to a third day when two OTHER days already fill the week", () => {
    expect(isNewTimeOffered(query([moving, tuesday, wednesday]), moving, at(FRI, "11:00"))).toBe(false);
  });

  it("and always to a day that is already claimed", () => {
    expect(isNewTimeOffered(query([moving, tuesday, wednesday]), moving, at(TUE, "14:00"))).toBe(true);
  });
});
