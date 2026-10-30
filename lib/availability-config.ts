/**
 * lib/availability-config.ts
 *
 * The scheduler's rules in one place (CLIENT_PORTAL_AND_SCHEDULER_PLAN.md
 * §2.1b). Edit this file to change hours, notice, buffers or the lunch
 * window — nothing else hard-codes them. Times are wall-clock in
 * `hostTimezone`; weekdays are 0 = Sunday … 6 = Saturday.
 */
export type BookingMode = "online" | "in_person";

export interface ModeRules {
  /** Weekdays this mode is offered by default (before per-date overrides). */
  weekdays: number[];
  /** First start time and the time every meeting must END by ("HH:mm"). */
  startTime: string;
  endTime: string;
  /** Free minutes required before AND after a meeting. */
  bufferMinutes: number;
  /** Minimum notice before a slot can be booked. */
  minNoticeMinutes: number;
}

export interface AvailabilityConfig {
  hostTimezone: string;
  /** How many days ahead visitors can book. */
  horizonDays: number;
  durationsMinutes: number[];
  online: ModeRules;
  inPerson: ModeRules;
  /**
   * How in-person days are chosen:
   *  - "first_come": every weekday in `inPerson.weekdays` is open until
   *    `maxInPersonDaysPerWeek` different days have been claimed that week
   *    (by a booking or an IN-PERSON override); then in-person locks to those
   *    days and the rest of the week is online-only.
   *  - "announced": in-person is offered only on days the owner marks
   *    IN-PERSON on the availability calendar.
   */
  inPersonDayMode: "first_come" | "announced";
  maxInPersonDaysPerWeek: number;
  /**
   * On a day the owner is on-site, hide online slots. Off: online times stay bookable, and the day is only
   * marked as an on-site day, so someone booking online is told the owner will be at the office and can
   * choose to meet in person instead.
   */
  hideOnlineOnOnSiteDays: boolean;
  /** Thresholds for the owner alerts about inefficient on-site days (lib/onsite.ts). */
  onSite: {
    /** Flag a day when two consecutive in-person meetings are this far apart. */
    sparseGapMinutes: number;
    /** The daily digest looks this many days ahead. */
    digestLookaheadDays: number;
  };
  /**
   * Lunch is always the owner's on a day they are on-site: no meeting, online or in person, may overlap it
   * (see generateSlots in lib/availability.ts). On ordinary days nothing protects it.
   */
  lunch: { start: string; end: string };
}

export const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  hostTimezone: process.env.HOST_TIMEZONE || "America/Mexico_City",
  horizonDays: 45,
  durationsMinutes: [15, 30, 45],
  online: {
    weekdays: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "17:00",
    bufferMinutes: 10,
    minNoticeMinutes: 120,
  },
  inPerson: {
    // Open Mon–Fri; the first-come lock below keeps it to at most
    // maxInPersonDaysPerWeek real on-site days per week.
    weekdays: [1, 2, 3, 4, 5],
    startTime: "10:00",
    endTime: "15:30", // every meeting must FINISH by 3:30 pm (a 30-min meeting can start at 3:00)
    bufferMinutes: 10,
    minNoticeMinutes: 24 * 60,
  },
  inPersonDayMode: "first_come",
  maxInPersonDaysPerWeek: 2,
  hideOnlineOnOnSiteDays: false,
  onSite: { sparseGapMinutes: 150, digestLookaheadDays: 3 },
  lunch: { start: "12:30", end: "13:00" },
};
