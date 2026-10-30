import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/field-crypto", () => ({ decryptLoose: (value: string | null | undefined) => value ?? null }));
vi.mock("@/lib/meeting-sync", () => ({ syncMeetingsQuietly: async () => undefined }));
vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: () => ({}) }));

const state = {
  meetings: [] as Record<string, unknown>[],
  meetingsError: null as Error | null,
  tables: {} as Record<string, unknown[] | { error: string }>,
};
vi.mock("./project-meetings", () => ({
  readMeetings: async () => {
    if (state.meetingsError) throw state.meetingsError;
    return state.meetings;
  },
}));

/** The owner's client: each table answers with its rows (filters aren't applied: the loader's own shaping is what is under test). */
const owner = {
  from: (table: string) => {
    const q: Record<string, unknown> = {};
    for (const step of ["select", "in", "eq", "neq", "gte", "lte", "gt", "lt", "order", "limit"]) q[step] = () => q;
    q.then = (resolve: (v: unknown) => unknown) => {
      const answer = state.tables[table] ?? [];
      return Promise.resolve(Array.isArray(answer) ? { data: answer, error: null } : { data: null, error: { message: answer.error } }).then(resolve);
    };
    return q;
  },
} as never;

const NOW = Date.UTC(2026, 10, 5, 15, 0);
const day = (offset: number) => new Date(NOW - offset * 86_400_000).toISOString();

beforeEach(() => {
  state.meetings = [];
  state.meetingsError = null;
  state.tables = {
    projects: [
      { id: "p-domus", name: "Domus", slug: "domus" },
      { id: "p-acme", name: "Acme", slug: "acme" },
    ],
    departments: [{ id: "d-rrhh", name: "RRHH" }],
    tickets: [],
    project_milestones: [],
    onsite_visits: [],
  };
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

const load = async () => (await import("./week")).loadWeek(owner, NOW, "America/Guatemala");

describe("this week's meetings", () => {
  it("names who booked, where, and which project (or none, for a public booking)", async () => {
    state.meetings = [
      { id: "m-1", start_time: "2026-11-06T16:00:00Z", end_time: "2026-11-06T16:30:00Z", mode: "in_person", location: "Zona 14", meet_link: null, guest_name: "Ana", project_id: "p-domus", department_id: "d-rrhh", milestone_id: null, ticket_id: null },
      { id: "m-2", start_time: "2026-11-07T16:00:00Z", end_time: "2026-11-07T16:30:00Z", mode: "online", location: null, meet_link: "https://meet.google.com/x", guest_name: "Visitor", project_id: null, department_id: null, milestone_id: null, ticket_id: null },
    ];
    const week = await load();
    expect(week.meetings).toHaveLength(2);
    expect(week.meetings[0]).toMatchObject({ id: "m-1", guest: "Ana", projectName: "Domus", projectSlug: "domus", areaName: "RRHH", location: "Zona 14", mode: "in_person" });
    expect(week.meetings[1]).toMatchObject({ id: "m-2", guest: "Visitor", projectName: null, projectSlug: null, meetLink: "https://meet.google.com/x" });
  });

  it("names the problem and ticket a meeting is about", async () => {
    state.meetings = [{ id: "m-1", start_time: "2026-11-06T16:00:00Z", end_time: "2026-11-06T16:30:00Z", mode: "online", guest_name: "Ana", project_id: "p-domus", department_id: null, milestone_id: "ms-1", ticket_id: "t-9" }];
    state.tables.project_milestones = [{ id: "ms-1", code: "RH-1", title: "Marcajes" }];
    state.tables.tickets = [{ id: "t-9", ticket_number: 9 }];
    const [meeting] = (await load()).meetings;
    expect(meeting.problem).toEqual({ code: "RH-1", title: "Marcajes" });
    expect(meeting.ticketNumber).toBe(9);
  });

  it("comes back empty, not broken, when meetings can't be read", async () => {
    state.meetingsError = new Error("database down");
    const week = await load();
    expect(week.meetings).toEqual([]);
    expect(week.firstDate).toBe("2026-11-05");
    expect(week.lastDate).toBe("2026-11-11");
  });
});

describe("what needs the owner", () => {
  const ticket = (id: string, number: number, priority: string, ageDays: number, project = "p-domus") => ({
    id, ticket_number: number, title: `Ticket ${number}`, status: "open", priority, project_id: project, department_id: null, created_at: day(ageDays),
  });

  it("lists the most urgent first and, among equals, the oldest, with how long each has waited", async () => {
    state.tables.tickets = [ticket("a", 1, "low", 30), ticket("b", 2, "high", 2), ticket("c", 3, "critical", 1), ticket("d", 4, "high", 9)];
    const { tickets } = await load();
    expect(tickets.shown.map((t) => t.number)).toEqual([3, 4, 2, 1]);
    expect(tickets.shown[1]).toMatchObject({ number: 4, ageDays: 9, projectName: "Domus", projectSlug: "domus" });
    expect(tickets.total).toBe(4);
  });

  it("shows a dozen and counts the rest", async () => {
    state.tables.tickets = Array.from({ length: 20 }, (_, i) => ticket(`t${i}`, i + 1, "medium", i));
    const { tickets } = await load();
    expect(tickets.shown).toHaveLength(12);
    expect(tickets.total).toBe(20);
  });

  it("leaves out a ticket whose project can't be read, rather than showing a nameless row", async () => {
    state.tables.tickets = [ticket("a", 1, "high", 1), ticket("x", 2, "high", 1, "p-unknown")];
    expect((await load()).tickets.shown.map((t) => t.number)).toEqual([1]);
  });

  it("counts the fixes waiting on a client, project by project, most first", async () => {
    // The loader asks for tickets twice (open ones, then ones to check); both answer from the same table in this fake.
    state.tables.tickets = [
      { project_id: "p-acme" },
      { project_id: "p-domus" },
      { project_id: "p-domus" },
    ];
    const { waiting } = await load();
    expect(waiting).toEqual([
      { projectName: "Domus", projectSlug: "domus", count: 2 },
      { projectName: "Acme", projectSlug: "acme", count: 1 },
    ]);
  });
});

describe("due this week and on-site days", () => {
  it("lists problems due, and the days at an office, with their project", async () => {
    state.tables.project_milestones = [{ id: "ms-2", code: "CT-1", title: "Facturas", due_date: "2026-11-09", project_id: "p-domus" }];
    state.tables.onsite_visits = [{ project_id: "p-acme", visit_date: "2026-11-06", start_time: "10:00:00", end_time: "15:30:00" }];
    const week = await load();
    expect(week.due).toEqual([{ id: "ms-2", code: "CT-1", title: "Facturas", dueDate: "2026-11-09", projectName: "Domus", projectSlug: "domus" }]);
    expect(week.visits).toEqual([{ date: "2026-11-06", start: "10:00", end: "15:30", projectName: "Acme", projectSlug: "acme" }]);
  });

  it("one source failing (a table that isn't there yet) leaves the rest of the page intact", async () => {
    state.tables.onsite_visits = { error: 'relation "onsite_visits" does not exist' };
    state.tables.project_milestones = [{ id: "ms-2", code: null, title: "Plan", due_date: "2026-11-09", project_id: "p-domus" }];
    const week = await load();
    expect(week.visits).toEqual([]);
    expect(week.due).toHaveLength(1);
  });
});
