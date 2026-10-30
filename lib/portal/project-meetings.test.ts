import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/field-crypto", () => ({ decryptLoose: (value: string | null | undefined) => value ?? null }));
vi.mock("@/lib/meeting-sync", () => ({ syncCancelledMeetingsQuietly: async () => undefined }));

const NOW = Date.UTC(2026, 10, 5, 12, 0);
const hour = 3_600_000;

type Row = Record<string, unknown>;
const state = {
  meetings: [] as Row[],
  /** What deleteEvent does: resolve, or throw this. */
  deleteError: null as Error | null,
  googleConfigured: true,
  deletedEvents: [] as string[],
  cancelled: [] as string[][],
  alerts: [] as { subject: string; lines: string[] }[],
  /** Columns this fake database doesn't have (a migration not applied yet). */
  missingColumns: [] as string[],
};

/**
 * A stand-in for a query on the meetings table: supports eq/gt/or filters, answers with the matching rows,
 * and behaves like a database that lacks some columns: asking for one is an error, and rows don't carry it.
 */
const meetingsQuery = () => {
  const filters: ((row: Row) => boolean)[] = [];
  let limit = Infinity;
  let selected: string[] = [];
  const q: Record<string, unknown> = {};
  q.select = (columns: string) => ((selected = columns.split(",")), q);
  q.eq = (column: string, value: unknown) => (filters.push((row) => row[column] === value), q);
  q.gt = (column: string, value: string) => (filters.push((row) => String(row[column]) > value), q);
  // "client_id.eq.<id>,client_id.is.null": either condition.
  q.or = (expression: string) => {
    const tests = expression.split(",").map((part) => {
      const [column, op, ...rest] = part.split(".");
      return (row: Row) => (op === "is" ? row[column] === null : row[column] === rest.join("."));
    });
    filters.push((row) => tests.some((test) => test(row)));
    return q;
  };
  q.order = () => q;
  q.limit = (count: number) => {
    limit = count;
    return q;
  };
  q.then = (resolve: (v: unknown) => unknown) => {
    const missing = selected.find((column) => state.missingColumns.includes(column));
    if (missing) return Promise.resolve({ data: null, error: { message: `column meetings.${missing} does not exist` } }).then(resolve);
    const rows = state.meetings
      .filter((row) => filters.every((f) => f(row)))
      .slice(0, limit)
      .map((row) => Object.fromEntries(selected.filter((column) => column in row).map((column) => [column, row[column]])));
    return Promise.resolve({ data: rows, error: null }).then(resolve);
  };
  return q;
};

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: () => ({ from: () => meetingsQuery() }) }));

class FakeGoogleError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}
vi.mock("@/lib/google-calendar", () => ({
  GoogleApiError: FakeGoogleError,
  isGoogleConfigured: () => state.googleConfigured,
  deleteEvent: async (id: string) => {
    if (state.deleteError) throw state.deleteError;
    state.deletedEvents.push(id);
  },
}));
vi.mock("@/lib/meetings", () => ({
  cancelMeetings: async (ids: string[]) => {
    state.cancelled.push(ids);
  },
}));
vi.mock("@/lib/email", () => ({
  sendOwnerAlert: async (subject: string, lines: string[]) => {
    state.alerts.push({ subject, lines });
    return true;
  },
}));

const PROJECT = "p-1";
const meeting = (id: string, extra: Row = {}): Row => ({
  id,
  project_id: PROJECT,
  status: "confirmed",
  mode: "in_person",
  start_time: new Date(NOW + 24 * hour).toISOString(),
  end_time: new Date(NOW + 24.5 * hour).toISOString(),
  location: "Zona 14",
  meet_link: null,
  guest_name: "Ana",
  guest_email: "ana@example.com",
  client_id: "u-ana",
  ticket_id: null,
  google_event_id: `ev-${id}`,
  department_id: null,
  milestone_id: null,
  ...extra,
});

const ana = { id: "u-ana", email: "ana@example.com", isAdmin: false };
const luis = { id: "u-luis", email: "luis@example.com", isAdmin: false };
const owner = { id: "u-owner", email: "owner@example.com", isAdmin: true };

/** The signed-in person's own client: used only to put names on the team, problem and ticket. */
const labels = {
  from: (table: string) => {
    const data: Record<string, unknown[]> = {
      departments: [{ id: "d-rrhh", name: "RRHH" }],
      project_milestones: [{ id: "m-1", code: "RH-1", title: "Marcajes" }],
      tickets: [{ id: "t-1", ticket_number: 7 }],
    };
    const q: Record<string, unknown> = { select: () => q, in: () => q };
    q.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: data[table] ?? [], error: null }).then(resolve);
    return q;
  },
} as never;

beforeEach(() => {
  state.meetings = [];
  state.deleteError = null;
  state.googleConfigured = true;
  state.deletedEvents = [];
  state.cancelled = [];
  state.alerts = [];
  state.missingColumns = [];
});

const load = () => import("./project-meetings");

describe("a project's meetings list", () => {
  beforeEach(() => {
    state.meetings = [meeting("m-ana"), meeting("m-luis", { client_id: "u-luis", guest_name: "Luis", guest_email: "luis@example.com" })];
  });

  it("shows a person only the meetings they booked, never a colleague's", async () => {
    const { listProjectMeetings } = await load();
    const list = await listProjectMeetings(labels, { id: PROJECT }, ana, NOW);
    expect(list.map((m) => m.id)).toEqual(["m-ana"]);
    expect(list[0]).toMatchObject({ mine: true, bookedBy: null, mode: "in_person", location: "Zona 14" });
  });

  it("shows the owner everyone's, with who booked each", async () => {
    const { listProjectMeetings } = await load();
    const list = await listProjectMeetings(labels, { id: PROJECT }, owner, NOW);
    expect(list.map((m) => [m.id, m.bookedBy, m.mine])).toEqual([
      ["m-ana", "Ana", false],
      ["m-luis", "Luis", false],
    ]);
  });

  it("a busy project's other meetings can't push a person's own off the list", async () => {
    const ANA = "00000000-0000-0000-0000-0000000000a1";
    const LUIS = "00000000-0000-0000-0000-0000000000a2";
    // Thirty colleague meetings come first in time; the person's own is the last of all.
    state.meetings = [
      ...Array.from({ length: 30 }, (_, i) =>
        meeting(`other-${i}`, { client_id: LUIS, guest_email: "luis@example.com", start_time: new Date(NOW + (2 + i) * hour).toISOString() })
      ),
      meeting("mine-late", { client_id: ANA, start_time: new Date(NOW + 400 * hour).toISOString(), end_time: new Date(NOW + 401 * hour).toISOString() }),
      meeting("old-no-account", { client_id: null, guest_email: "ana@example.com", start_time: new Date(NOW + 500 * hour).toISOString(), end_time: new Date(NOW + 501 * hour).toISOString() }),
    ];
    const { listProjectMeetings } = await load();
    const list = await listProjectMeetings(labels, { id: PROJECT }, { id: ANA, email: "ana@example.com", isAdmin: false }, NOW);
    expect(list.map((m) => m.id)).toEqual(["mine-late", "old-no-account"]);
  });

  it("leaves out cancelled meetings, meetings that already ended, and other projects'", async () => {
    state.meetings = [
      meeting("ok"),
      meeting("cancelled", { status: "cancelled" }),
      meeting("past", { start_time: new Date(NOW - 3 * hour).toISOString(), end_time: new Date(NOW - 2 * hour).toISOString() }),
      meeting("other-project", { project_id: "p-2" }),
    ];
    const { listProjectMeetings } = await load();
    expect((await listProjectMeetings(labels, { id: PROJECT }, owner, NOW)).map((m) => m.id)).toEqual(["ok"]);
  });

  it("puts names on the team, problem and ticket a meeting is about", async () => {
    state.meetings = [meeting("m-1", { department_id: "d-rrhh", milestone_id: "m-1", ticket_id: "t-1" })];
    const { listProjectMeetings } = await load();
    const [m] = await listProjectMeetings(labels, { id: PROJECT }, ana, NOW);
    expect(m).toMatchObject({ areaName: "RRHH", problem: { code: "RH-1", title: "Marcajes" }, ticketNumber: 7 });
  });

  it("still lists meetings before the meeting-topic migration is applied", async () => {
    state.missingColumns = ["department_id", "milestone_id"];
    const { listProjectMeetings } = await load();
    const list = await listProjectMeetings(labels, { id: PROJECT }, ana, NOW);
    expect(list.map((m) => m.id)).toEqual(["m-ana"]);
    expect(list[0].areaName).toBeNull();
  });

  it("still lists a person's meetings when the table has no client_id column, matching them by email", async () => {
    state.missingColumns = ["client_id"];
    const { listProjectMeetings } = await load();
    expect((await listProjectMeetings(labels, { id: PROJECT }, ana, NOW)).map((m) => m.id)).toEqual(["m-ana"]);
    expect((await listProjectMeetings(labels, { id: PROJECT }, luis, NOW)).map((m) => m.id)).toEqual(["m-luis"]);
    expect((await listProjectMeetings(labels, { id: PROJECT }, owner, NOW)).map((m) => m.id)).toEqual(["m-ana", "m-luis"]);
  });

  it("still lists when none of the optional columns exist yet", async () => {
    state.missingColumns = ["client_id", "department_id", "milestone_id"];
    const { listProjectMeetings } = await load();
    expect((await listProjectMeetings(labels, { id: PROJECT }, ana, NOW)).map((m) => m.id)).toEqual(["m-ana"]);
  });
});

describe("cancelling a meeting", () => {
  const cancel = async (viewer: typeof ana, meetingId = "m-ana", now = NOW) => {
    const { cancelProjectMeeting } = await load();
    return cancelProjectMeeting({ meetingId, projectId: PROJECT, projectName: "Domus", viewer, now });
  };
  beforeEach(() => {
    state.meetings = [meeting("m-ana")];
  });

  it("removes the calendar event, frees the meeting, and tells the owner when a client cancels", async () => {
    expect(await cancel(ana)).toBe("cancelled");
    expect(state.deletedEvents).toEqual(["ev-m-ana"]);
    expect(state.cancelled).toEqual([["m-ana"]]);
    expect(state.alerts).toHaveLength(1);
    expect(state.alerts[0].subject).toBe("Meeting cancelled: Ana");
  });

  it("lets the owner cancel anyone's, without emailing themselves", async () => {
    expect(await cancel(owner)).toBe("cancelled");
    expect(state.cancelled).toEqual([["m-ana"]]);
    expect(state.alerts).toEqual([]);
  });

  it("refuses a colleague, and touches nothing", async () => {
    expect(await cancel(luis)).toBe("error");
    expect(state.deletedEvents).toEqual([]);
    expect(state.cancelled).toEqual([]);
  });

  it("refuses a meeting of another project, an unknown one, and one that already started or was cancelled", async () => {
    state.meetings = [
      meeting("elsewhere", { project_id: "p-2" }),
      meeting("started", { start_time: new Date(NOW - hour).toISOString(), end_time: new Date(NOW + hour).toISOString() }),
      meeting("already", { status: "cancelled" }),
    ];
    for (const id of ["elsewhere", "missing", "started", "already"]) expect(await cancel(ana, id)).toBe("error");
    expect(state.cancelled).toEqual([]);
    expect(state.deletedEvents).toEqual([]);
  });

  it("goes ahead when the calendar event was already deleted", async () => {
    state.deleteError = new FakeGoogleError("Not Found", 404);
    expect(await cancel(ana)).toBe("cancelled");
    expect(state.cancelled).toEqual([["m-ana"]]);
  });

  it("stops, leaving the meeting as it is, when Google fails for any other reason", async () => {
    state.deleteError = new FakeGoogleError("Rate limit", 429);
    expect(await cancel(ana)).toBe("error");
    expect(state.cancelled).toEqual([]);
    expect(state.alerts).toEqual([]);
  });

  it("cancels without a client_id column too: the person is matched by email, and a colleague is still refused", async () => {
    state.missingColumns = ["client_id", "department_id", "milestone_id"];
    expect(await cancel(luis)).toBe("error");
    expect(state.cancelled).toEqual([]);
    expect(await cancel(ana)).toBe("cancelled");
    expect(state.cancelled).toEqual([["m-ana"]]);
  });

  it("works for a meeting that never had a calendar event", async () => {
    state.meetings = [meeting("m-ana", { google_event_id: null })];
    expect(await cancel(ana)).toBe("cancelled");
    expect(state.deletedEvents).toEqual([]);
  });
});
