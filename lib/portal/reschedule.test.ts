import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/field-crypto", () => ({ decryptLoose: (value: string | null | undefined) => value ?? null }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: () => ({}) }));

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 5, 12, 0);

type Row = Record<string, unknown>;
const state = {
  rows: [] as Row[],
  /** What moving the table row answers per call, in order (default: moved). */
  dbResults: [] as ("moved" | "conflict" | "missing" | Error)[],
  dbCalls: [] as { id: string; start: number; end: number }[],
  eventError: null as Error | null,
  googleConfigured: true,
  eventMoves: [] as { id: string; start: number; end: number; tz: string }[],
  alerts: [] as { subject: string; lines: string[] }[],
};

vi.mock("./project-meetings", () => ({ readMeetings: async () => state.rows }));
vi.mock("@/lib/meetings", () => ({
  moveMeetingTimes: async (id: string, start: number, end: number) => {
    state.dbCalls.push({ id, start, end });
    const next = state.dbResults.shift() ?? "moved";
    if (next instanceof Error) throw next;
    return next;
  },
}));
vi.mock("@/lib/google-calendar", () => ({
  isGoogleConfigured: () => state.googleConfigured,
  moveEvent: async (id: string, start: number, end: number, tz: string) => {
    if (state.eventError) throw state.eventError;
    state.eventMoves.push({ id, start, end, tz });
  },
}));
vi.mock("@/lib/email", () => ({
  sendOwnerAlert: async (subject: string, lines: string[]) => {
    state.alerts.push({ subject, lines });
    return true;
  },
}));

const meeting = (extra: Row = {}): Row => ({
  id: "m-1",
  project_id: "p-1",
  status: "confirmed",
  mode: "in_person",
  start_time: new Date(NOW + 24 * HOUR).toISOString(),
  end_time: new Date(NOW + 24.5 * HOUR).toISOString(),
  guest_name: "Ana",
  guest_email: "ana@example.com",
  client_id: "u-ana",
  google_event_id: "ev-1",
  ...extra,
});
const ana = { id: "u-ana", email: "ana@example.com", isAdmin: false };
const luis = { id: "u-luis", email: "luis@example.com", isAdmin: false };
const owner = { id: "u-owner", email: "owner@example.com", isAdmin: true };

beforeEach(() => {
  state.rows = [meeting()];
  state.dbResults = [];
  state.dbCalls = [];
  state.eventError = null;
  state.googleConfigured = true;
  state.eventMoves = [];
  state.alerts = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

const load = () => import("./reschedule");

describe("which meetings a person may move", () => {
  it("their own, with its length and format", async () => {
    const { loadReschedulable } = await load();
    expect(await loadReschedulable("m-1", ana, NOW)).toMatchObject({ id: "m-1", projectId: "p-1", mode: "in_person", durationMinutes: 30, googleEventId: "ev-1", guestName: "Ana" });
  });

  it("the owner can move anyone's; a colleague cannot move someone else's", async () => {
    const { loadReschedulable } = await load();
    expect(await loadReschedulable("m-1", owner, NOW)).not.toBeNull();
    expect(await loadReschedulable("m-1", luis, NOW)).toBeNull();
  });

  it("not one that has started, been cancelled, or does not exist", async () => {
    const { loadReschedulable } = await load();
    state.rows = [meeting({ start_time: new Date(NOW - HOUR).toISOString(), end_time: new Date(NOW + HOUR).toISOString() })];
    expect(await loadReschedulable("m-1", ana, NOW)).toBeNull();
    state.rows = [meeting({ status: "cancelled" })];
    expect(await loadReschedulable("m-1", ana, NOW)).toBeNull();
    state.rows = [];
    expect(await loadReschedulable("m-1", ana, NOW)).toBeNull();
  });
});

describe("moving a meeting", () => {
  const start = NOW + 72 * HOUR;
  const run = async (viewer = ana) => {
    const { loadReschedulable, moveBooked } = await load();
    const found = (await loadReschedulable("m-1", viewer, NOW))!;
    return moveBooked({ meeting: found, start, viewer, projectName: "Domus" });
  };

  it("moves the table and then the calendar event, keeping the length, and tells the owner when a client does it", async () => {
    expect(await run()).toBe("moved");
    expect(state.dbCalls).toEqual([{ id: "m-1", start, end: start + 0.5 * HOUR }]);
    expect(state.eventMoves).toEqual([{ id: "ev-1", start, end: start + 0.5 * HOUR, tz: expect.any(String) }]);
    expect(state.alerts).toHaveLength(1);
    expect(state.alerts[0].subject).toBe("Meeting moved: Ana");
  });

  it("does not email the owner about their own move", async () => {
    expect(await run(owner)).toBe("moved");
    expect(state.alerts).toEqual([]);
  });

  it("says 'taken' when someone else just took that time, and touches nothing in the calendar", async () => {
    state.dbResults = ["conflict"];
    expect(await run()).toBe("taken");
    expect(state.eventMoves).toEqual([]);
    expect(state.alerts).toEqual([]);
  });

  it("puts the meeting back when the calendar refuses, so the two never disagree", async () => {
    state.eventError = new Error("Google 500");
    expect(await run()).toBe("error");
    expect(state.dbCalls).toHaveLength(2);
    expect(state.dbCalls[1]).toMatchObject({ id: "m-1", start: NOW + 24 * HOUR, end: NOW + 24.5 * HOUR }); // back to the original time
    expect(state.alerts).toEqual([]);
  });

  it("an error from the table is an error, and nothing else happens", async () => {
    state.dbResults = [new Error("database down")];
    expect(await run()).toBe("error");
    expect(state.eventMoves).toEqual([]);
  });

  it("a meeting that has gone from the table is an error", async () => {
    state.dbResults = ["missing"];
    expect(await run()).toBe("error");
    expect(state.eventMoves).toEqual([]);
  });

  it("a meeting with no calendar event is still moved in the table", async () => {
    state.rows = [meeting({ google_event_id: null })];
    expect(await run()).toBe("moved");
    expect(state.eventMoves).toEqual([]);
  });
});
