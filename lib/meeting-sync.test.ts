import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const HOUR = 3_600_000;
const NOW = Date.now();
/** A time well in the future, so "upcoming" is true whenever the tests run. */
const at = (hours: number) => NOW + hours * HOUR;

type Answer = "gone" | Error | { start: number | null; end: number | null };

const calendar = {
  configured: true,
  /** Google's answer per event id. Default: still there, unmoved. */
  answers: {} as Record<string, Answer>,
  asked: [] as string[],
};
const database = {
  upcoming: [] as { id: string; googleEventId: string; start: number; end: number }[],
  cancelled: [] as string[][],
  moved: [] as { id: string; start: number; end: number }[],
  moveResult: {} as Record<string, "moved" | "conflict" | "missing" | Error>,
  readError: null as Error | null,
};

vi.mock("./google-calendar", () => ({
  isGoogleConfigured: () => calendar.configured,
  getEventState: async (id: string) => {
    calendar.asked.push(id);
    const answer = calendar.answers[id];
    const meeting = database.upcoming.find((m) => m.googleEventId === id)!;
    if (answer === undefined) return { state: "active", start: meeting.start, end: meeting.end };
    if (answer instanceof Error) throw answer;
    if (answer === "gone") return { state: "gone" };
    return { state: "active", ...answer };
  },
}));
vi.mock("./meetings", () => ({
  listUpcomingConfirmedWithEvents: async () => {
    if (database.readError) throw database.readError;
    return database.upcoming;
  },
  cancelMeetings: async (ids: string[]) => {
    database.cancelled.push(ids);
  },
  moveMeetingTimes: async (id: string, start: number, end: number) => {
    const result = database.moveResult[id] ?? "moved";
    if (result instanceof Error) throw result;
    if (result === "moved") database.moved.push({ id, start, end });
    return result;
  },
}));

/** A fresh copy of the module each time, so the throttle starts open. */
const load = async () => {
  vi.resetModules();
  return import("./meeting-sync");
};

beforeEach(() => {
  calendar.configured = true;
  calendar.answers = {};
  calendar.asked = [];
  database.upcoming = [
    { id: "m-1", googleEventId: "ev-1", start: at(24), end: at(24.5) },
    { id: "m-2", googleEventId: "ev-2", start: at(48), end: at(48.5) },
    { id: "m-3", googleEventId: "ev-3", start: at(72), end: at(72.5) },
  ];
  database.cancelled = [];
  database.moved = [];
  database.moveResult = {};
  database.readError = null;
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("meetings removed from the calendar", () => {
  it("cancels exactly the ones whose event is gone, and leaves the rest", async () => {
    calendar.answers = { "ev-2": "gone" };
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 1, moved: 0 });
    expect(database.cancelled).toEqual([["m-2"]]);
    expect(calendar.asked.sort()).toEqual(["ev-1", "ev-2", "ev-3"]);
  });

  it("does nothing when every event is still there, where it was", async () => {
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 0, moved: 0 });
    expect(database.moved).toEqual([]);
  });

  it("never cancels a meeting it could not check: an error is not the same as gone", async () => {
    calendar.answers = { "ev-1": new Error("quota exceeded"), "ev-2": "gone", "ev-3": new Error("network down") };
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 1, moved: 0 });
    expect(database.cancelled).toEqual([["m-2"]]);
  });

  it("leaves everything alone when the calendar is not connected, and asks nothing when there are no meetings", async () => {
    calendar.configured = false;
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 0, moved: 0 });
    expect(calendar.asked).toEqual([]);
    calendar.configured = true;
    database.upcoming = [];
    const again = await load();
    expect(await again.syncMeetings()).toEqual({ cancelled: 0, moved: 0 });
    expect(calendar.asked).toEqual([]);
  });
});

describe("meetings moved in the calendar", () => {
  it("follows a meeting dragged to another day: the table gets the new time", async () => {
    calendar.answers = { "ev-1": { start: at(96), end: at(96.5) } };
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 0, moved: 1 });
    expect(database.moved).toEqual([{ id: "m-1", start: at(96), end: at(96.5) }]);
  });

  it("follows a change of length too", async () => {
    calendar.answers = { "ev-1": { start: at(24), end: at(25) } };
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 0, moved: 1 });
    expect(database.moved[0]).toEqual({ id: "m-1", start: at(24), end: at(25) });
  });

  it("ignores a difference under a minute: that is rounding, not a move", async () => {
    calendar.answers = { "ev-1": { start: at(24) + 30_000, end: at(24.5) + 30_000 } };
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 0, moved: 0 });
    expect(database.moved).toEqual([]);
  });

  it("does not follow a move that would land on top of another meeting: it is left as it was", async () => {
    calendar.answers = { "ev-1": { start: at(48), end: at(48.5) } };
    database.moveResult = { "m-1": "conflict" };
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 0, moved: 0 });
    expect(database.moved).toEqual([]);
  });

  it("leaves an all-day event, and one dragged into the past, alone", async () => {
    calendar.answers = { "ev-1": { start: null, end: null }, "ev-2": { start: NOW - 5 * HOUR, end: NOW - 4 * HOUR } };
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 0, moved: 0 });
    expect(database.moved).toEqual([]);
  });

  it("a failed move does not stop the others, and a cancellation in the same run still happens", async () => {
    calendar.answers = { "ev-1": { start: at(100), end: at(100.5) }, "ev-2": { start: at(120), end: at(120.5) }, "ev-3": "gone" };
    database.moveResult = { "m-1": new Error("database hiccup") };
    const { syncMeetings } = await load();
    expect(await syncMeetings()).toEqual({ cancelled: 1, moved: 1 });
    expect(database.moved.map((m) => m.id)).toEqual(["m-2"]);
    expect(database.cancelled).toEqual([["m-3"]]);
  });
});

describe("how often it asks Google", () => {
  it("asks once a minute at most, unless forced", async () => {
    calendar.answers = { "ev-1": "gone" };
    const { syncMeetings } = await load();
    expect((await syncMeetings()).cancelled).toBe(1);
    const asked = calendar.asked.length;
    expect(await syncMeetings()).toEqual({ cancelled: 0, moved: 0 }); // inside the minute: no questions
    expect(calendar.asked.length).toBe(asked);
    await syncMeetings({ force: true }); // a booking or the daily digest wants the truth now
    expect(calendar.asked.length).toBe(asked * 2);
  });

  it("answers callers that arrive at the same time with one round of questions", async () => {
    calendar.answers = { "ev-3": "gone" };
    const { syncMeetings } = await load();
    const [a, b] = await Promise.all([syncMeetings(), syncMeetings({ force: true })]);
    expect(a.cancelled).toBe(1);
    expect(b.cancelled).toBe(1);
    expect(calendar.asked.length).toBe(3);
  });
});

describe("a failure never breaks the page", () => {
  it("the quiet version swallows a database error", async () => {
    database.readError = new Error("database down");
    const { syncMeetingsQuietly } = await load();
    await expect(syncMeetingsQuietly({ force: true })).resolves.toBeUndefined();
    expect(database.cancelled).toEqual([]);
  });
});
