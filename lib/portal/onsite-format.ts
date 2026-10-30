import { zonedTimeToUtc } from "../tz";

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * "Thursday, November 5" and "10:00 AM – 3:30 PM" for a day at the office. The day is
 * the owner's own calendar date; the hours are shown on the viewer's clock, because a
 * person reads them against their own watch. (Spanish: "Jueves, 5 de noviembre".)
 */
export function formatVisit(
  visit: { date: string; start: string; end: string },
  locale: string,
  viewerTimeZone: string,
  hostTimeZone: string
): { day: string; hours: string } {
  const day = new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }).format(Date.parse(`${visit.date}T12:00:00Z`));
  const time = new Intl.DateTimeFormat(locale, { timeZone: viewerTimeZone, hour: "numeric", minute: "2-digit" });
  return {
    day: sentence(day),
    hours: `${time.format(zonedTimeToUtc(visit.date, visit.start, hostTimeZone))} – ${time.format(zonedTimeToUtc(visit.date, visit.end, hostTimeZone))}`,
  };
}
