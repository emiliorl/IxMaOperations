import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const calendar = {
  configured: true,
  /** Google's answer per event id: "active", "gone", or an Error to throw. */
  answers: {} as Record<string, "active" | "gone" | Error>,
  asked: [] as string[],
};
const database = {
  upcoming: [] as { id: string; googleEventId: string }[],
  cancelled: [] as string[][],
  readError: null as Error | null,
};

vi.mock("./google-calendar", () => ({
  isGoogleConfigured: () => calendar.configured,
  getEventStatus: async (id: string) => {
    calendar.asked.push(id);
    const answer = calendar.answers[id] ?? "active";
    if (answer instanceof Error) throw answer;
    return answer;
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
    { id: "m-1", googleEventId: "ev-1" },
    { id: "m-2", googleEventId: "ev-2" },
    { id: "m-3", googleEventId: "ev-3" },
  ];
  database.cancelled = [];
  database.readError = null;
});

describe("meetings removed from the calendar", () => {
  it("cancels exactly the ones whose event is gone, and leaves the rest", async () => {
    calendar.answers = { "ev-2": "gone" };
    const { syncCancelledMeetings } = await load();
    expect(await syncCancelledMeetings()).toBe(1);
    expect(database.cancelled).toEqual([["m-2"]]);
    expect(calendar.asked.sort()).toEqual(["ev-1", "ev-2", "ev-3"]);
  });

  it("does nothing when every event is still there", async () => {
    const { syncCancelledMeetings } = await load();
    expect(await syncCancelledMeetings()).toBe(0);
    expect(database.cancelled).toEqual([[]]);
  });

  it("never cancels a meeting it could not check: an error is not the same as gone", async () => {
    calendar.answers = { "ev-1": new Error("quota exceeded"), "ev-2": "gone", "ev-3": new Error("network down") };
    const { syncCancelledMeetings } = await load();
    expect(await syncCancelledMeetings()).toBe(1);
    expect(database.cancelled).toEqual([["m-2"]]);
  });

  it("leaves everything alone when the calendar is not connected", async () => {
    calendar.configured = false;
    const { syncCancelledMeetings } = await load();
    expect(await syncCancelledMeetings()).toBe(0);
    expect(calendar.asked).toEqual([]);
    expect(database.cancelled).toEqual([]);
  });

  it("asks nothing when there are no upcoming meetings", async () => {
    database.upcoming = [];
    const { syncCancelledMeetings } = await load();
    expect(await syncCancelledMeetings()).toBe(0);
    expect(calendar.asked).toEqual([]);
  });
});

describe("how often it asks Google", () => {
  it("asks once a minute at most, unless forced", async () => {
    calendar.answers = { "ev-1": "gone" };
    const { syncCancelledMeetings } = await load();
    expect(await syncCancelledMeetings()).toBe(1);
    const asked = calendar.asked.length;
    expect(await syncCancelledMeetings()).toBe(0); // inside the minute: no questions
    expect(calendar.asked.length).toBe(asked);
    await syncCancelledMeetings({ force: true }); // a booking or the daily digest wants the truth now
    expect(calendar.asked.length).toBe(asked * 2);
  });

  it("answers callers that arrive at the same time with one round of questions", async () => {
    calendar.answers = { "ev-3": "gone" };
    const { syncCancelledMeetings } = await load();
    const [a, b] = await Promise.all([syncCancelledMeetings(), syncCancelledMeetings({ force: true })]);
    expect(a).toBe(1);
    expect(b).toBe(1);
    expect(calendar.asked.length).toBe(3);
  });
});

describe("a failure never breaks the page", () => {
  it("the quiet version swallows a database error and a calendar outage", async () => {
    database.readError = new Error("database down");
    const { syncCancelledMeetingsQuietly } = await load();
    await expect(syncCancelledMeetingsQuietly({ force: true })).resolves.toBeUndefined();
    expect(database.cancelled).toEqual([]);
  });
});
