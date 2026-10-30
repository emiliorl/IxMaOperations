import "server-only";
import { getEventStatus, isGoogleConfigured } from "./google-calendar";
import { cancelMeetings, listUpcomingConfirmedWithEvents } from "./meetings";

/**
 * A meeting is kept in two places: the meetings table (which decides the weekly in-person
 * limit, whether online times are hidden on an on-site day, the lunch rule, and which days the
 * portal shows as visits) and the owner's Google Calendar. Deleting or cancelling the event in
 * Google used to leave the table saying "confirmed", so a day with its only in-person meeting
 * removed still counted as an on-site day.
 *
 * This asks Google about each upcoming confirmed meeting and cancels the ones that are gone.
 * Cancelling is what frees the day: nothing counts a cancelled meeting any more.
 *
 * It never cancels on a guess: if Google cannot be asked, or does not answer for a meeting,
 * that meeting is left exactly as it is. It is throttled (the schedule is read often) and shared
 * between callers that arrive at the same time.
 */

/** Many reads of the schedule, one question to Google a minute. */
const MIN_INTERVAL_MS = 60_000;
/** A safety cap on questions per run: more upcoming meetings than this is not a normal calendar. */
const MAX_CHECKS = 40;

let lastRun = 0;
let running: Promise<number> | null = null;

/**
 * Cancels the upcoming meetings whose Google event is gone, and says how many. `force` skips the
 * throttle (bookings and the daily digest want the truth, not a minute-old answer).
 */
export function syncCancelledMeetings({ force = false }: { force?: boolean } = {}): Promise<number> {
  if (running) return running;
  if (!force && Date.now() - lastRun < MIN_INTERVAL_MS) return Promise.resolve(0);
  running = run().finally(() => {
    lastRun = Date.now();
    running = null;
  });
  return running;
}

async function run(): Promise<number> {
  if (!isGoogleConfigured()) return 0;
  const upcoming = await listUpcomingConfirmedWithEvents(MAX_CHECKS);
  if (upcoming.length === 0) return 0;

  const gone: string[] = [];
  await Promise.all(
    upcoming.map(async (meeting) => {
      try {
        if ((await getEventStatus(meeting.googleEventId)) === "gone") gone.push(meeting.id);
      } catch (error) {
        // Could not tell: leave it as it is.
        console.warn("[schedule] could not check a booked event against the calendar:", error instanceof Error ? error.message : error);
      }
    })
  );
  await cancelMeetings(gone);
  if (gone.length > 0) console.info(`[schedule] ${gone.length} meeting(s) removed from the calendar were cancelled here too.`);
  return gone.length;
}

/** For callers where a failed sync must never break the page or the request: it logs and carries on. */
export async function syncCancelledMeetingsQuietly(options?: { force?: boolean }): Promise<void> {
  try {
    await syncCancelledMeetings(options);
  } catch (error) {
    console.warn("[schedule] syncing cancelled meetings failed:", error instanceof Error ? error.message : error);
  }
}
