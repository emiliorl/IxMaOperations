import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/** A stand-in for one Supabase query: every builder step returns itself, and awaiting it gives `result`. */
const query = (result: unknown) => {
  const q: Record<string, unknown> = {};
  for (const step of ["select", "eq", "order", "limit"]) q[step] = () => q;
  q.maybeSingle = () => Promise.resolve(result);
  q.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return q;
};

let tables: Record<string, unknown> = {};
let signedIn: { id: string; email: string } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  supabaseConfigured: () => true,
  createSupabaseServer: async () => ({
    auth: { getUser: async () => ({ data: { user: signedIn } }) },
    from: (table: string) => query(tables[table] ?? { data: null }),
  }),
}));

const PROJECT = "11111111-1111-1111-1111-111111111111";
const TICKET = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  signedIn = { id: "user-1", email: "ana@example.com" };
  tables = {
    projects: { data: { id: PROJECT, name: "Domus", slug: "domus", office_label: null, office_address: "Zona 14" } },
    profiles: { data: { display_name: "Ana", timezone: "America/Guatemala" } },
    // The nested team comes back as an object from one query shape and as a list from another: both must work.
    project_departments: { data: [{ departments: { id: "d-rrhh", name: "RRHH" } }, { departments: [{ id: "d-bim", name: "BIM" }] }] },
    project_milestones: {
      data: [
        { id: "m-1", title: "Marcajes incompletos", code: "RH-1", priority: "high", department_id: "d-rrhh" },
        { id: "m-2", title: "Kickoff", code: null, priority: null, department_id: null },
      ],
      error: null,
    },
    tickets: { data: { id: TICKET, ticket_number: 7, project_id: PROJECT, department_id: "d-rrhh", milestone_id: "m-1" } },
  };
});

const load = async (input: { projectSlug?: string; ticketId?: string }) => {
  const { resolveBookingContext } = await import("./booking-context");
  return resolveBookingContext(input);
};

describe("the booking context", () => {
  it("always carries the teams and problems the person can open, as lists", async () => {
    const context = await load({ projectSlug: "domus" });
    expect(context).not.toBeNull();
    expect(Array.isArray(context!.areas)).toBe(true);
    expect(Array.isArray(context!.problems)).toBe(true);
    expect(context!.areas).toEqual([
      { id: "d-bim", name: "BIM" },
      { id: "d-rrhh", name: "RRHH" },
    ]);
    expect(context!.problems).toEqual([
      { id: "m-1", code: "RH-1", title: "Marcajes incompletos", priority: "high", areaId: "d-rrhh" },
      { id: "m-2", code: null, title: "Kickoff", priority: "medium", areaId: null },
    ]);
    expect(context).toMatchObject({ projectSlug: "domus", projectName: "Domus", officeAddress: "Zona 14", name: "Ana", email: "ana@example.com", ticketTopic: null });
  });

  it("starts from the ticket's own team and problem when the booking is about a ticket", async () => {
    const context = await load({ projectSlug: "domus", ticketId: TICKET });
    expect(context).toMatchObject({ ticketId: TICKET, ticketNumber: 7, ticketTopic: { areaId: "d-rrhh", problemId: "m-1" } });
  });

  it("ignores a ticket that belongs to another project", async () => {
    tables.tickets = { data: { id: TICKET, ticket_number: 7, project_id: "99999999-9999-9999-9999-999999999999", department_id: null, milestone_id: null } };
    const context = await load({ projectSlug: "domus", ticketId: TICKET });
    expect(context).toMatchObject({ ticketId: null, ticketNumber: null, ticketTopic: null });
  });

  it("still returns (empty) lists when the problems can't be read, so the page never breaks", async () => {
    tables.project_milestones = { data: null, error: { message: "column does not exist" } };
    tables.project_departments = { data: null };
    const context = await load({ projectSlug: "domus" });
    expect(context!.problems).toEqual([]);
    expect(context!.areas).toEqual([]);
  });

  it("is nothing for someone not signed in, a project they cannot open, or a malformed slug", async () => {
    signedIn = null;
    expect(await load({ projectSlug: "domus" })).toBeNull();
    signedIn = { id: "user-1", email: "ana@example.com" };
    tables.projects = { data: null };
    expect(await load({ projectSlug: "domus" })).toBeNull();
    expect(await load({ projectSlug: "../etc/passwd" })).toBeNull();
  });
});
