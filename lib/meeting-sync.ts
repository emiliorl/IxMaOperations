import "server-only";
import { getEventState, isGoogleConfigured } from "./google-calendar";
import { cancelMeetings, listUpcomingConfirmedWithEvents, moveMeetingTimes } from "./meetings";

/**
 * A meeting is kept in two places: the meetings table (which decides the weekly in-person limit, whether a day counts
 * as an on-site day, the lunch rule, the overlap guard, and which days the portal shows as visits) and the owner's
 * Google Calendar. The owner changes things in Google; this makes the table follow:
 *   - an event deleted or cancelled there → the meeting is cancelled here, which frees its time and its day;
 *   - an event dragged to another time or day → the meeting moves here too, so the day it left stops counting as
 *     an on-site day and the one it joined starts to.
 *
 * It never acts on a guess: if Google cannot be asked, or does not answer for a meeting, that meeting is left exactly
 * as it is. A move that would land on top of another booked meeting is not applied (the overlap guard refuses it; it is
 * logged, and the owner sorts it out in the calendar). It is throttled (the schedule is read often) and shared between
 * callers that arrive at the same time.
 */

/** Many reads of the schedule, one round of questions to Google a minute. */
const MIN_INTERVAL_MS = 60_000;
/** A safety cap on questions per run: more upcoming meetings than this is not a normal calendar. */
const MAX_CHECKS = 40;
/** A difference smaller than this is rounding, not a move. */
const MOVE_TOLERANCE_MS = 60_000;

export interface SyncResult {
  cancelled: number;
  moved: number;
}

let lastRun = 0;
let running: Promise<SyncResult> | null = null;

/**
 * Brings the upcoming meetings in line with the calendar. `force` skips the throttle (bookings and the daily digest
 * want the truth, not a minute-old answer).
 */
export function syncMeetings({ force = false }: { force?: boolean } = {}): Promise<SyncResult> {
  if (running) return running;
  if (!force && Date.now() - lastRun < MIN_INTERVAL_MS) return Promise.resolve({ cancelled: 0, moved: 0 });
  running = run().finally(() => {
    lastRun = Date.now();
    running = null;
  });
  return running;
}

async function run(): Promise<SyncResult> {
  if (!isGoogleConfigured()) return { cancelled: 0, moved: 0 };
  const upcoming = await listUpcomingConfirmedWithEvents(MAX_CHECKS);
  if (upcoming.length === 0) return { cancelled: 0, moved: 0 };

  const gone: string[] = [];
  const moves: { id: string; start: number; end: number }[] = [];
  await Promise.all(
    upcoming.map(async (meeting) => {
      try {
        const event = await getEventState(meeting.googleEventId);
        if (event.state === "gone") return void gone.push(meeting.id);
        // An all-day event has no clock time to follow; an event dragged into the past is left for the owner to sort out.
        if (event.start === null || event.end === null || event.end <= event.start || event.end <= Date.now()) return;
        if (Math.abs(event.start - meeting.start) >= MOVE_TOLERANCE_MS || Math.abs(event.end - meeting.end) >= MOVE_TOLERANCE_MS) {
          moves.push({ id: meeting.id, start: event.start, end: event.end });
        }
      } catch (error) {
        // Could not tell: leave it as it is.
        console.warn("[schedule] could not check a booked event against the calendar:", error instanceof Error ? error.message : error);
      }
    })
  );

  await cancelMeetings(gone);
  let moved = 0;
  for (const move of moves) {
    try {
      const result = await moveMeetingTimes(move.id, move.start, move.end);
      if (result === "moved") moved++;
      else if (result === "conflict") console.warn("[schedule] a meeting moved in the calendar now overlaps another booked meeting: left as it was here.");
    } catch (error) {
      console.warn("[schedule] could not follow a moved meeting:", error instanceof Error ? error.message : error);
    }
  }
  if (gone.length > 0) console.info(`[schedule] ${gone.length} meeting(s) removed from the calendar were cancelled here too.`);
  if (moved > 0) console.info(`[schedule] ${moved} meeting(s) moved in the calendar were moved here too.`);
  return { cancelled: gone.length, moved };
}

/** For callers where a failed sync must never break the page or the request: it logs and carries on. */
export async function syncMeetingsQuietly(options?: { force?: boolean }): Promise<void> {
  try {
    await syncMeetings(options);
  } catch (error) {
    console.warn("[schedule] syncing meetings with the calendar failed:", error instanceof Error ? error.message : error);
  }
}
