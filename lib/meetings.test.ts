import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./field-crypto", () => ({
  encryptField: (value: string) => `enc:${value}`,
  encryptOptional: (value?: string) => (value ? `enc:${value}` : null),
  decryptOptional: (value: string | null) => value,
}));

/** Which columns this fake database has: a write that names any other fails like PostgREST does. */
const database = { columns: new Set<string>(), inserts: [] as Record<string, unknown>[], failWith: null as { code?: string; message: string } | null };

vi.mock("./supabase-admin", () => ({
  supabaseAdmin: () => ({
    from: () => ({
      delete: () => ({ eq: () => ({ lt: () => Promise.resolve({ error: null }) }) }),
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: () => {
            if (database.failWith) return Promise.resolve({ data: null, error: database.failWith });
            const unknown = Object.keys(row).find((column) => !database.columns.has(column));
            if (unknown) return Promise.resolve({ data: null, error: { code: "PGRST204", message: `Could not find the '${unknown}' column of 'meetings' in the schema cache` } });
            database.inserts.push(row);
            return Promise.resolve({ data: { id: "m-new" }, error: null });
          },
        }),
      }),
    }),
  }),
}));

const REQUIRED = ["mode", "title", "start_time", "end_time", "timezone", "guest_name", "guest_email", "notes", "location", "project_id", "ticket_id", "status"];
const meeting = {
  mode: "online" as const,
  title: "call",
  start: Date.UTC(2026, 10, 5, 16),
  end: Date.UTC(2026, 10, 5, 16, 30),
  visitorTimezone: "UTC",
  guestName: "Ana",
  guestEmail: "ana@example.com",
  projectId: "p-1",
  clientId: "u-ana",
  departmentId: "d-1",
  milestoneId: "m-1",
};

beforeEach(() => {
  database.columns = new Set(REQUIRED);
  database.inserts = [];
  database.failWith = null;
});

const book = async (extra = {}) => {
  const { insertPendingMeeting } = await import("./meetings");
  return insertPendingMeeting({ ...meeting, ...extra });
};

describe("reserving a slot", () => {
  it("saves who booked it and what it is about when the database has those columns", async () => {
    database.columns = new Set([...REQUIRED, "client_id", "department_id", "milestone_id"]);
    expect(await book()).toEqual({ ok: true, id: "m-new" });
    expect(database.inserts[0]).toMatchObject({ client_id: "u-ana", department_id: "d-1", milestone_id: "m-1", project_id: "p-1" });
  });

  it("still books when the table has no client_id column (the case that broke every booking)", async () => {
    database.columns = new Set([...REQUIRED, "department_id", "milestone_id"]);
    expect(await book()).toEqual({ ok: true, id: "m-new" });
    expect(database.inserts[0]).not.toHaveProperty("client_id");
    expect(database.inserts[0]).toMatchObject({ department_id: "d-1", milestone_id: "m-1" });
  });

  it("still books when none of the optional columns exist, keeping everything else", async () => {
    expect(await book()).toEqual({ ok: true, id: "m-new" });
    expect(Object.keys(database.inserts[0]).sort()).toEqual([...REQUIRED].sort());
    expect(database.inserts[0]).toMatchObject({ project_id: "p-1", guest_email: "enc:ana@example.com", status: "pending" });
  });

  it("an ordinary public booking sends none of them", async () => {
    database.columns = new Set([...REQUIRED, "client_id", "department_id", "milestone_id"]);
    await book({ projectId: undefined, clientId: undefined, departmentId: undefined, milestoneId: undefined });
    expect(database.inserts[0]).not.toHaveProperty("client_id");
    expect(database.inserts[0]).not.toHaveProperty("department_id");
  });

  it("does not hide a real failure: a missing REQUIRED column, or a database error, still throws", async () => {
    database.columns = new Set(REQUIRED.filter((column) => column !== "guest_email"));
    await expect(book()).rejects.toThrow(/guest_email/);
    database.columns = new Set(REQUIRED);
    database.failWith = { message: "connection terminated" };
    await expect(book()).rejects.toThrow(/Failed to reserve slot/);
  });

  it("says the slot was taken when the overlap rule refuses it", async () => {
    database.failWith = { code: "23P01", message: "conflicting key value violates exclusion constraint" };
    expect(await book()).toEqual({ ok: false, reason: "conflict" });
  });
});
