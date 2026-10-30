import { describe, expect, it } from "vitest";
import { DEFAULT_AVAILABILITY, type AvailabilityConfig, type BookingMode } from "./availability-config";
import {
  claimedOnSiteDays,
  dayPolicy,
  generateSlots,
  isSlotAvailable,
  isWithinWeekLimit,
  onSiteDaysInOrder,
  overlaps,
  weekStartOf,
  type ExistingMeeting,
  type Interval,
  type SlotQuery,
} from "./availability";
import { localDate, zonedTimeToUtc } from "./tz";

const TZ = "America/Mexico_City";
const CONFIG: AvailabilityConfig = { ...DEFAULT_AVAILABILITY, hostTimezone: TZ };
const at = (date: string, time: string) => zonedTimeToUtc(date, time, TZ);
const block = (date: string, from: string, to: string): Interval => ({ start: at(date, from), end: at(date, to) });
const meeting = (date: string, from: string, to: string, mode: BookingMode = "in_person", createdAt?: number): ExistingMeeting => ({
  ...block(date, from, to),
  mode,
  createdAt,
});
const hhmm = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);

// 2026-11-02 is a Monday.
const MON = "2026-11-02";
const TUE = "2026-11-03";
const WED = "2026-11-04";
const THU = "2026-11-05";
const FRI = "2026-11-06";
const SAT = "2026-11-07";
const NEXT_MON = "2026-11-09";

function query(overrides: Partial<SlotQuery> = {}): SlotQuery {
  return {
    mode: "online",
    durationMinutes: 30,
    now: at(MON, "06:00"),
    hostBusy: [],
    overrides: {},
    meetings: [],
    config: CONFIG,
    ...overrides,
  };
}

const startsOn = (slots: { start: number }[], date: string) =>
  slots.filter((s) => localDate(s.start, TZ) === date).map((s) => hhmm(s.start));
const daysOf = (slots: { start: number }[]) => Array.from(new Set(slots.map((s) => localDate(s.start, TZ))));

describe("online slots", () => {
  it("offers 09:00–17:00 on weekdays in 30-minute steps, last start 16:30", () => {
    const monday = startsOn(generateSlots(query()), MON);
    expect(monday[0]).toBe("09:00");
    expect(monday.at(-1)).toBe("16:30");
    expect(monday).toHaveLength(16);
  });

  it("offers nothing on weekends", () => {
    expect(startsOn(generateSlots(query()), SAT)).toEqual([]);
  });

  it("enforces minimum notice (2 h online)", () => {
    const slots = generateSlots(query({ now: at(MON, "08:30") }));
    expect(startsOn(slots, MON)[0]).toBe("10:30");
  });

  it("keeps the buffer around busy time", () => {
    const slots = startsOn(generateSlots(query({ hostBusy: [block(MON, "10:00", "11:00")] })), MON);
    expect(slots).toContain("09:00"); // 09:00–09:30, padded to 09:40
    expect(slots).not.toContain("09:30"); // padded to 10:10, touches the busy block
    expect(slots).not.toContain("10:30");
    expect(slots).not.toContain("11:00"); // padded start 10:50 overlaps
    expect(slots).toContain("11:30"); // padded start 11:20 is clear
  });

  it("the buffer is 10 minutes: an event that ends at 10:50 leaves 11:00 open", () => {
    expect(DEFAULT_AVAILABILITY.online.bufferMinutes).toBe(10);
    expect(DEFAULT_AVAILABILITY.inPerson.bufferMinutes).toBe(10);
    const slots = startsOn(generateSlots(query({ hostBusy: [block(MON, "10:00", "10:50")] })), MON);
    expect(slots).toContain("11:00"); // padded start 10:50 just touches the end of the event
    // One minute less of gap is still too close.
    const tight = startsOn(generateSlots(query({ hostBusy: [block(MON, "10:00", "10:51")] })), MON);
    expect(tight).not.toContain("11:00");
  });

  it("respects a day marked OFF but not other days", () => {
    const slots = generateSlots(query({ overrides: { [MON]: "OFF" } }));
    expect(startsOn(slots, MON)).toEqual([]);
    expect(startsOn(slots, TUE).length).toBeGreaterThan(0);
  });

  it("supports 15 and 45 minute durations", () => {
    const fifteen = startsOn(generateSlots(query({ durationMinutes: 15 })), MON);
    expect(fifteen).toContain("09:15");
    const fortyFive = startsOn(generateSlots(query({ durationMinutes: 45 })), MON);
    expect(fortyFive.at(-1)).toBe("16:00"); // 16:00–16:45; 16:30 would end 17:15
  });

  it("never offers slots beyond the booking horizon", () => {
    const slots = generateSlots(query());
    const lastDate = localDate(slots.at(-1)!.start, TZ);
    expect(lastDate <= "2026-12-17").toBe(true); // Nov 2 + 45 days
  });
});

describe("in-person hours and notice", () => {
  const inPerson = (extra: Partial<SlotQuery> = {}) => query({ mode: "in_person", ...extra });

  it("runs 10:00–15:30: first start 10:00, a 30-min meeting may start at 15:00 and finishes by 15:30", () => {
    const slots = startsOn(generateSlots(inPerson()), WED);
    expect(slots[0]).toBe("10:00");
    expect(slots.at(-1)).toBe("15:00"); // 15:00–15:30
    expect(slots).not.toContain("15:30");
    expect(slots).not.toContain("09:30");
  });

  it("a 45-minute meeting must start by 14:45 so it still finishes by 15:30", () => {
    const slots = startsOn(generateSlots(inPerson({ durationMinutes: 45 })), WED);
    expect(slots.at(-1)).toBe("14:30"); // grid is 30 min; 15:00 would end 15:45
  });

  it("requires 24 hours' notice", () => {
    // now = Monday 06:00 → Monday itself is too soon, Tuesday from 10:00 is fine.
    const slots = generateSlots(inPerson());
    expect(startsOn(slots, MON)).toEqual([]);
    expect(startsOn(slots, TUE)[0]).toBe("10:00");

    // At 11:00 Monday, Tuesday 10:00 is only 23 h away → first slot is 11:00.
    const later = generateSlots(inPerson({ now: at(MON, "11:00") }));
    expect(startsOn(later, TUE)[0]).toBe("11:00");
  });

  it("is not offered on weekends", () => {
    expect(startsOn(generateSlots(inPerson()), SAT)).toEqual([]);
  });
});

describe("first come, first served in-person days", () => {
  const inPerson = (extra: Partial<SlotQuery> = {}) => query({ mode: "in_person", ...extra });

  it("with no in-person bookings that week, every weekday is open", () => {
    const days = daysOf(generateSlots(inPerson()));
    for (const d of [TUE, WED, THU, FRI, NEXT_MON]) expect(days).toContain(d);
  });

  it("one booked day leaves the rest of the week open", () => {
    const days = daysOf(generateSlots(inPerson({ meetings: [meeting(WED, "10:00", "10:30")] })));
    expect(days).toContain(TUE);
    expect(days).toContain(WED);
    expect(days).toContain(THU);
    expect(days).toContain(FRI);
  });

  it("two booked days lock in-person to those two days for that week", () => {
    const days = daysOf(
      generateSlots(inPerson({ meetings: [meeting(WED, "10:00", "10:30"), meeting(THU, "11:00", "11:30")] }))
    );
    expect(days).toContain(WED);
    expect(days).toContain(THU);
    expect(days).not.toContain(TUE);
    expect(days).not.toContain(FRI);
  });

  it("the lock is per week: the following week is fully open again", () => {
    const days = daysOf(
      generateSlots(inPerson({ meetings: [meeting(WED, "10:00", "10:30"), meeting(THU, "11:00", "11:30")] }))
    );
    expect(days).toContain(NEXT_MON);
    expect(days).toContain("2026-11-10");
  });

  it("two meetings on the SAME day claim only one day", () => {
    const days = daysOf(
      generateSlots(inPerson({ meetings: [meeting(WED, "10:00", "10:30"), meeting(WED, "14:00", "14:30")] }))
    );
    expect(days).toContain(TUE);
    expect(days).toContain(THU);
  });

  it("online meetings never claim an on-site day", () => {
    const days = daysOf(
      generateSlots(inPerson({ meetings: [meeting(TUE, "10:00", "10:30", "online"), meeting(WED, "10:00", "10:30", "online")] }))
    );
    expect(days).toContain(FRI);
  });

  it("IN-PERSON markers on the owner's calendar count as claimed days", () => {
    const days = daysOf(generateSlots(inPerson({ overrides: { [TUE]: "IN_PERSON", [THU]: "IN_PERSON" } })));
    expect(days).toContain(TUE);
    expect(days).toContain(THU);
    expect(days).not.toContain(WED);
    expect(days).not.toContain(FRI);
  });

  it("OFF and ONLINE-ONLY days are never offered, and do not use up the limit", () => {
    const days = daysOf(generateSlots(inPerson({ overrides: { [TUE]: "OFF", [WED]: "ONLINE_ONLY" } })));
    expect(days).not.toContain(TUE);
    expect(days).not.toContain(WED);
    expect(days).toContain(THU);
  });

  it("claimed days are flagged so the page can say \"already on-site\"", () => {
    const slots = generateSlots(inPerson({ meetings: [meeting(WED, "10:00", "10:30")] }));
    expect(slots.filter((s) => localDate(s.start, TZ) === WED).every((s) => s.onSite)).toBe(true);
    expect(slots.filter((s) => localDate(s.start, TZ) === THU).every((s) => !s.onSite)).toBe(true);
  });

  it("announced mode: only days the owner marked IN-PERSON are offered", () => {
    const config: AvailabilityConfig = { ...CONFIG, inPersonDayMode: "announced" };
    expect(generateSlots(inPerson({ config }))).toEqual([]);
    const days = daysOf(generateSlots(inPerson({ config, overrides: { [WED]: "IN_PERSON", [THU]: "IN_PERSON", [FRI]: "IN_PERSON" } })));
    expect(days).toEqual([WED, THU, FRI]); // no weekly cap in announced mode
  });

  it("the limit is configurable", () => {
    const config = { ...CONFIG, maxInPersonDaysPerWeek: 1 };
    const days = daysOf(generateSlots(inPerson({ config, meetings: [meeting(WED, "10:00", "10:30")] })));
    expect(days).toContain(WED);
    expect(days).not.toContain(THU);
  });
});

describe("weekly limit ordering (race tie-break)", () => {
  it("weekStartOf returns the Monday", () => {
    expect(weekStartOf(WED)).toBe(MON);
    expect(weekStartOf("2026-11-08")).toBe(MON); // Sunday belongs to the week that started Monday Nov 2
    expect(weekStartOf(NEXT_MON)).toBe(NEXT_MON);
  });

  it("claimedOnSiteDays merges meetings and owner markers", () => {
    const claimed = claimedOnSiteDays([meeting(WED, "10:00", "10:30")], { [FRI]: "IN_PERSON" }, TZ);
    expect(Array.from(claimed).sort()).toEqual([WED, FRI]);
  });

  it("orders days by who booked first, owner markers before everyone", () => {
    const meetings = [meeting(THU, "10:00", "10:30", "in_person", 200), meeting(TUE, "10:00", "10:30", "in_person", 100)];
    expect(onSiteDaysInOrder(meetings, {}, TZ, MON)).toEqual([TUE, THU]);
    expect(onSiteDaysInOrder(meetings, { [FRI]: "IN_PERSON" }, TZ, MON)).toEqual([FRI, TUE, THU]);
  });

  it("when three days were claimed at once, only the first two are within the limit", () => {
    const meetings = [
      meeting(FRI, "10:00", "10:30", "in_person", 300),
      meeting(TUE, "10:00", "10:30", "in_person", 100),
      meeting(THU, "10:00", "10:30", "in_person", 200),
    ];
    expect(isWithinWeekLimit(TUE, meetings, {}, CONFIG)).toBe(true);
    expect(isWithinWeekLimit(THU, meetings, {}, CONFIG)).toBe(true);
    expect(isWithinWeekLimit(FRI, meetings, {}, CONFIG)).toBe(false); // booked last → loses
  });

  it("a brand-new day is allowed only while the week has room", () => {
    const one = [meeting(TUE, "10:00", "10:30", "in_person", 100)];
    const two = [...one, meeting(WED, "10:00", "10:30", "in_person", 200)];
    expect(isWithinWeekLimit(THU, one, {}, CONFIG)).toBe(true);
    expect(isWithinWeekLimit(THU, two, {}, CONFIG)).toBe(false);
  });
});

describe("on-site days and online slots", () => {
  /** Online slots of one day with whether each is marked "I'll be on-site that day". */
  const flags = (slots: { start: number; onSite: boolean }[], date: string) => slots.filter((s) => localDate(s.start, TZ) === date).map((s) => s.onSite);

  it("online stays bookable on an on-site day: it is marked, not hidden", () => {
    const slots = generateSlots(query({ meetings: [meeting(WED, "10:00", "10:30")] }));
    expect(startsOn(slots, WED).length).toBeGreaterThan(0);
    expect(flags(slots, WED).every(Boolean)).toBe(true); // every online time that day carries the hint
    expect(flags(slots, THU).some(Boolean)).toBe(false); // an ordinary day does not
  });

  it("an owner IN-PERSON marker marks that day's online times too", () => {
    const slots = generateSlots(query({ overrides: { [WED]: "IN_PERSON" } }));
    expect(startsOn(slots, WED).length).toBeGreaterThan(0);
    expect(flags(slots, WED).every(Boolean)).toBe(true);
    expect(flags(slots, TUE).some(Boolean)).toBe(false);
  });

  it("an online time is never offered on top of the in-person meeting that makes the day on-site", () => {
    const slots = startsOn(generateSlots(query({ meetings: [meeting(WED, "10:00", "10:30")] })), WED);
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30"); // inside the buffer
  });

  it("only says 'on-site' where the client's own office is open that day", () => {
    // The owner is on-site on Friday (another client), but this client's office is closed on Fridays.
    const overrides = { [FRI]: "IN_PERSON" as const };
    const closed = generateSlots(query({ overrides, officeWeekdays: [1, 2, 3, 4] }));
    expect(startsOn(closed, FRI).length).toBeGreaterThan(0); // still bookable online
    expect(flags(closed, FRI).some(Boolean)).toBe(false); // but no promise of a visit
    const open = generateSlots(query({ overrides, officeWeekdays: [1, 2, 3, 4, 5] }));
    expect(flags(open, FRI).every(Boolean)).toBe(true);
  });

  it("can still hide online on on-site days, if the setting is switched back on", () => {
    const config = { ...CONFIG, hideOnlineOnOnSiteDays: true };
    const slots = generateSlots(query({ config, meetings: [meeting(WED, "10:00", "10:30")] }));
    expect(startsOn(slots, WED)).toEqual([]);
    expect(startsOn(slots, THU).length).toBeGreaterThan(0);
  });

  it("the app's setting is: do not hide", () => {
    expect(DEFAULT_AVAILABILITY.hideOnlineOnOnSiteDays).toBe(false);
  });
});

describe("dayPolicy", () => {
  it("online weekdays by default, in-person weekdays too (first come), nothing on weekends", () => {
    expect(dayPolicy(MON, undefined, CONFIG)).toEqual({ online: true, inPerson: true, onSite: false });
    expect(dayPolicy(SAT, undefined, CONFIG)).toEqual({ online: false, inPerson: false, onSite: false });
  });

  it("a claimed day is on-site, and online is still offered (unless hiding is switched on)", () => {
    expect(dayPolicy(WED, undefined, CONFIG, true)).toEqual({ online: true, inPerson: true, onSite: true });
    expect(dayPolicy(WED, undefined, { ...CONFIG, hideOnlineOnOnSiteDays: true }, true)).toEqual({ online: false, inPerson: true, onSite: true });
  });

  it("an on-site override on a weekend offers in-person only", () => {
    expect(dayPolicy(SAT, "IN_PERSON", CONFIG)).toEqual({ online: false, inPerson: true, onSite: true });
  });

  it("ONLINE-ONLY and OFF behave as named", () => {
    expect(dayPolicy(WED, "ONLINE_ONLY", CONFIG)).toEqual({ online: true, inPerson: false, onSite: false });
    expect(dayPolicy(WED, "OFF", CONFIG)).toEqual({ online: false, inPerson: false, onSite: false });
  });
});

describe("lunch on an on-site day", () => {
  it("lunch is 12:30–13:00", () => {
    expect(DEFAULT_AVAILABILITY.lunch).toEqual({ start: "12:30", end: "13:00" });
  });

  it("is always protected: with nothing else booked, the 12:30 slot is not offered, in person or online", () => {
    const claimed = [meeting(WED, "10:00", "10:30")]; // makes Wednesday an on-site day
    for (const mode of ["in_person", "online"] as const) {
      const slots = startsOn(generateSlots(query({ mode, meetings: claimed })), WED);
      expect(slots, mode).not.toContain("12:30");
      expect(slots, mode).toContain("12:00"); // ends exactly when lunch starts
      expect(slots, mode).toContain("13:00"); // starts exactly when lunch ends
    }
  });

  it("whatever else is booked: a morning meeting, an afternoon one, or both", () => {
    for (const meetings of [
      [meeting(WED, "10:00", "10:30")],
      [meeting(WED, "14:00", "14:30")],
      [meeting(WED, "10:00", "10:30"), meeting(WED, "14:00", "14:30")],
    ]) {
      expect(startsOn(generateSlots(query({ mode: "in_person", meetings })), WED)).not.toContain("12:30");
    }
  });

  it("someone booking the 12:00 slot cannot push the afternoon out: lunch stays free and the afternoon stays open", () => {
    // 12:00–12:30 is the last slot before lunch. With it booked the afternoon is still on offer (the old rule closed it).
    const slots = startsOn(generateSlots(query({ mode: "in_person", meetings: [meeting(WED, "10:00", "10:30"), meeting(WED, "12:00", "12:30")] })), WED);
    expect(slots).toContain("13:00");
    expect(slots).toContain("14:00");
    expect(slots).not.toContain("12:30");
  });

  it("holds for 15-minute meetings too: 12:30 and 12:45 are hidden, 12:15 and 13:00 are fine", () => {
    const slots = startsOn(generateSlots(query({ mode: "in_person", durationMinutes: 15, meetings: [meeting(WED, "10:00", "10:30")] })), WED);
    expect(slots).not.toContain("12:30");
    expect(slots).not.toContain("12:45");
    expect(slots).toContain("12:15");
    expect(slots).toContain("13:00");
  });

  it("does not apply on an ordinary day, when the owner is not on-site", () => {
    expect(startsOn(generateSlots(query({ meetings: [meeting(TUE, "10:00", "10:30", "online")] })), TUE)).toContain("12:30");
    expect(startsOn(generateSlots(query()), THU)).toContain("12:30");
  });

  it("a day marked IN-PERSON on the calendar protects lunch too", () => {
    expect(startsOn(generateSlots(query({ overrides: { [WED]: "IN_PERSON" } })), WED)).not.toContain("12:30");
  });
});

describe("a client's office days (home-office days)", () => {
  const MON_TO_THU = [1, 2, 3, 4];

  it("offers no in-person times on a day the client's office is closed", () => {
    expect(startsOn(generateSlots(query({ mode: "in_person", officeWeekdays: MON_TO_THU })), FRI)).toEqual([]);
    // The same Friday is open for in-person meetings when there is no such limit (the public page).
    expect(startsOn(generateSlots(query({ mode: "in_person" })), FRI).length).toBeGreaterThan(0);
  });

  it("still offers the days the office is open", () => {
    // (Monday itself is inside the 24-hour notice for in-person meetings at the test's clock, so it starts Tuesday.)
    for (const day of [TUE, WED, THU]) {
      expect(startsOn(generateSlots(query({ mode: "in_person", officeWeekdays: MON_TO_THU })), day).length, day).toBeGreaterThan(0);
    }
  });

  it("holds even on a Friday the owner marked IN-PERSON on the calendar", () => {
    const slots = generateSlots(query({ mode: "in_person", overrides: { [FRI]: "IN_PERSON" }, officeWeekdays: MON_TO_THU }));
    expect(startsOn(slots, FRI)).toEqual([]);
  });

  it("does not touch online meetings: the closed day is still bookable by video", () => {
    expect(startsOn(generateSlots(query({ mode: "online", officeWeekdays: MON_TO_THU })), FRI).length).toBeGreaterThan(0);
  });

  it("an office with no open days has no in-person times at all", () => {
    expect(generateSlots(query({ mode: "in_person", officeWeekdays: [] }))).toEqual([]);
  });

  it("the final check before booking refuses a closed day too", () => {
    const q = query({ mode: "in_person", officeWeekdays: MON_TO_THU });
    expect(isSlotAvailable(q, at(FRI, "11:00"))).toBe(false);
    expect(isSlotAvailable(q, at(THU, "11:00"))).toBe(true);
  });
});

describe("a cancelled in-person meeting", () => {
  it("stops the day being marked on-site when it was the only one", () => {
    const marked = (meetings: ReturnType<typeof meeting>[]) =>
      generateSlots(query({ mode: "online", meetings })).filter((s) => localDate(s.start, TZ) === WED).map((s) => s.onSite);
    expect(marked([meeting(WED, "10:00", "10:30")]).every(Boolean)).toBe(true); // "I'll be on-site that day"
    // Cancelled meetings are not read any more (only pending and confirmed ones are), so the day is ordinary again.
    const cancelled = marked([]);
    expect(cancelled.length).toBeGreaterThan(0);
    expect(cancelled.some(Boolean)).toBe(false);
  });

  it("gives its slot of the week back: a third in-person day can be claimed again", () => {
    const twoDays = [meeting(MON, "10:00", "10:30"), meeting(WED, "10:00", "10:30")];
    expect(startsOn(generateSlots(query({ mode: "in_person", meetings: twoDays })), FRI)).toEqual([]); // the week's limit is used
    const oneCancelled = [meeting(MON, "10:00", "10:30")];
    expect(startsOn(generateSlots(query({ mode: "in_person", meetings: oneCancelled })), FRI).length).toBeGreaterThan(0);
  });
});

describe("isSlotAvailable", () => {
  it("accepts an offered start and rejects one that was not offered", () => {
    const q = query({ hostBusy: [block(MON, "10:00", "11:00")] });
    expect(isSlotAvailable(q, at(MON, "09:00"))).toBe(true);
    expect(isSlotAvailable(q, at(MON, "10:30"))).toBe(false);
    expect(isSlotAvailable(q, at(MON, "09:07"))).toBe(false); // off the slot grid
    expect(isSlotAvailable(q, at(SAT, "10:00"))).toBe(false);
  });

  it("rejects an in-person slot on a day the weekly limit has closed", () => {
    const q = query({ mode: "in_person", meetings: [meeting(WED, "10:00", "10:30"), meeting(THU, "10:00", "10:30")] });
    expect(isSlotAvailable(q, at(FRI, "11:00"))).toBe(false);
    expect(isSlotAvailable(q, at(WED, "11:00"))).toBe(true);
  });
});

describe("overlaps", () => {
  it("treats touching intervals as non-overlapping", () => {
    expect(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 })).toBe(false);
    expect(overlaps({ start: 0, end: 11 }, { start: 10, end: 20 })).toBe(true);
  });
});
