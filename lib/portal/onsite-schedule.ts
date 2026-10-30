import { localDate, zonedTimeToUtc } from "../tz";

/**
 * A day the owner is at a client's office, laid out as a timeline: which
 * stretches are meetings (busy), lunch, and free, so a person can see when to walk
 * up and when not to. Pure (no I/O), so the rules can be tested; the calendar and
 * the database are read in lib/portal/onsite.ts.
 *
 * Free time is what is left of the hours at the office after: meetings (with a few
 * minutes of buffer before and after each, because the owner has to get there and
 * back), the lunch hour, and anything too short to be worth walking up for.
 *
 * Other people's meetings are only ever "busy": this module is never given a
 * name or a company, only times.
 */

export interface Span {
  start: number;
  end: number;
}
/** `mine`: it is a meeting of THIS project's people (they may see it as theirs); anyone else's is just busy. */
export interface BusySpan extends Span {
  mine: boolean;
}
export type SegmentKind = "busy" | "lunch" | "free" | "gap";
export interface Segment extends Span {
  kind: SegmentKind;
  mine?: boolean;
}

/** The hours at the office on one day: the owner's local date, wall-clock times ("HH:mm"). */
export interface VisitWindow {
  date: string;
  start: string;
  end: string;
}

export interface OnSiteDay {
  date: string;
  /** The hours at the office, as instants (for today, from now: what has passed is not shown). */
  start: number;
  end: number;
  /** False when the calendar could not be read: only the hours are known, and no free time is claimed. */
  known: boolean;
  /** Contiguous from `start` to `end`. Empty when not known. */
  segments: Segment[];
  /** The stretches worth walking up in. Empty when not known. */
  free: Span[];
}

const MINUTE = 60_000;
/** Shorter than this is not worth walking up for. */
export const MIN_FREE_MINUTES = 20;

const clip = (span: Span, from: number, to: number): Span | null => {
  const start = Math.max(span.start, from);
  const end = Math.min(span.end, to);
  return end > start ? { start, end } : null;
};

/** Meetings that touch or overlap become one block; it is "mine" only if every part of it is. */
function mergeBusy(spans: BusySpan[]): BusySpan[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: BusySpan[] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
      last.mine = last.mine && span.mine;
    } else merged.push({ ...span });
  }
  return merged;
}

/** `span` without the parts covered by `holes` (which must be sorted and not overlap). */
function subtract(span: Span, holes: Span[]): Span[] {
  const pieces: Span[] = [];
  let cursor = span.start;
  for (const hole of holes) {
    if (hole.end <= cursor || hole.start >= span.end) continue;
    if (hole.start > cursor) pieces.push({ start: cursor, end: hole.start });
    cursor = Math.max(cursor, hole.end);
  }
  if (cursor < span.end) pieces.push({ start: cursor, end: span.end });
  return pieces;
}

export function buildOnSiteDay(input: {
  visit: VisitWindow;
  timeZone: string;
  now: number;
  /** The owner's busy times; null when the calendar could not be read. */
  busy: BusySpan[] | null;
  lunch: { start: string; end: string };
  bufferMinutes: number;
  minFreeMinutes?: number;
}): OnSiteDay | null {
  const { visit, timeZone, now } = input;
  const minFree = (input.minFreeMinutes ?? MIN_FREE_MINUTES) * MINUTE;
  const buffer = input.bufferMinutes * MINUTE;

  const end = zonedTimeToUtc(visit.date, visit.end, timeZone);
  const start = Math.max(zonedTimeToUtc(visit.date, visit.start, timeZone), now);
  if (end <= start) return null; // the day is over

  if (input.busy === null) return { date: visit.date, start, end, known: false, segments: [], free: [] };

  const busy = mergeBusy(
    input.busy.flatMap((b) => {
      const inside = clip(b, start, end);
      return inside ? [{ ...inside, mine: b.mine }] : [];
    })
  );
  const lunchWindow = clip(
    { start: zonedTimeToUtc(visit.date, input.lunch.start, timeZone), end: zonedTimeToUtc(visit.date, input.lunch.end, timeZone) },
    start,
    end
  );
  // A meeting over lunch wins: lunch is only what is left of it.
  const lunch = lunchWindow ? subtract(lunchWindow, busy) : [];

  const blocked: Segment[] = [
    ...busy.map((b): Segment => ({ start: b.start, end: b.end, kind: "busy", mine: b.mine })),
    ...lunch.map((l): Segment => ({ start: l.start, end: l.end, kind: "lunch" })),
  ].sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  const free: Span[] = [];

  // The stretch between two blocks: free, except the buffer next to a meeting, and unless it is too short.
  const remainder = (from: number, to: number, afterBusy: boolean, beforeBusy: boolean) => {
    const a = from + (afterBusy ? buffer : 0);
    const z = to - (beforeBusy ? buffer : 0);
    if (z - a >= minFree) {
      if (a > from) segments.push({ start: from, end: a, kind: "gap" });
      segments.push({ start: a, end: z, kind: "free" });
      free.push({ start: a, end: z });
      if (to > z) segments.push({ start: z, end: to, kind: "gap" });
    } else segments.push({ start: from, end: to, kind: "gap" });
  };

  let cursor = start;
  let previous: Segment | null = null;
  for (const block of blocked) {
    if (block.start > cursor) remainder(cursor, block.start, previous?.kind === "busy", block.kind === "busy");
    segments.push(block);
    cursor = block.end;
    previous = block;
  }
  if (cursor < end) remainder(cursor, end, previous?.kind === "busy", false);

  return { date: visit.date, start, end, known: true, segments, free };
}

/** "HH:mm" on the wall clock of a zone. */
export function localTime(utcMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(utcMs);
}

/**
 * Days with a meeting booked for the project but no announced visit: the owner will be
 * there anyway, so they are shown too. Hours are the usual in-person hours, stretched
 * to cover a meeting that falls outside them.
 */
export function impliedVisits(
  meetings: Span[],
  announced: ReadonlySet<string>,
  timeZone: string,
  usual: { start: string; end: string }
): VisitWindow[] {
  const byDate = new Map<string, Span[]>();
  for (const meeting of meetings) {
    const date = localDate(meeting.start, timeZone);
    if (!announced.has(date)) byDate.set(date, [...(byDate.get(date) ?? []), meeting]);
  }
  return Array.from(byDate, ([date, spans]) => {
    const starts = spans.map((s) => localTime(s.start, timeZone));
    const ends = spans.map((s) => localTime(s.end, timeZone));
    return {
      date,
      start: [usual.start, ...starts].sort()[0],
      end: [usual.end, ...ends].sort().at(-1)!,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

/** Announced and implied visits together, soonest first, one per date (an announced one wins). */
export function mergeVisits(announced: VisitWindow[], implied: VisitWindow[]): VisitWindow[] {
  const dates = new Set(announced.map((v) => v.date));
  return [...announced, ...implied.filter((v) => !dates.has(v.date))].sort((a, b) => a.date.localeCompare(b.date));
}
