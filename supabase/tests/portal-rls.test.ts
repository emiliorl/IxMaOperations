/**
 * Proves the portal's access rules against a real Postgres engine (PGlite),
 * with Supabase's `auth.uid()` / `auth.jwt()` and its `anon` / `authenticated`
 * roles recreated, and BOTH migrations applied exactly as written. Every test
 * runs as a specific kind of user and tries to read or write something it
 * should (or should not) be able to. Run: npm test
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const sql = (file: string) => readFileSync(fileURLToPath(new URL(`../migrations/${file}`, import.meta.url)), "utf8");

// Fixed ids so the assertions read clearly.
const U = {
  leadAll: "00000000-0000-0000-0000-0000000000a1", // project-wide lead, project P1
  leadFin: "00000000-0000-0000-0000-0000000000a2", // Finance lead, P1
  memberOps: "00000000-0000-0000-0000-0000000000a3", // Operations member, P1
  outsider: "00000000-0000-0000-0000-0000000000b1", // member of a different company's project P2
  admin: "00000000-0000-0000-0000-0000000000ff", // the owner
  nobody: "00000000-0000-0000-0000-0000000000c1", // authenticated, belongs to no project
};
const ORG_A = "10000000-0000-0000-0000-000000000001";
const ORG_B = "10000000-0000-0000-0000-000000000002";
const DEPT_FIN = "20000000-0000-0000-0000-000000000001";
const DEPT_OPS = "20000000-0000-0000-0000-000000000002";
const DEPT_B = "20000000-0000-0000-0000-000000000003";
const P1 = "30000000-0000-0000-0000-000000000001";
const P2 = "30000000-0000-0000-0000-000000000002";
const T_FIN = "40000000-0000-0000-0000-000000000001";
const T_OPS = "40000000-0000-0000-0000-000000000002";
const T_ALL = "40000000-0000-0000-0000-000000000003";
const T_B = "40000000-0000-0000-0000-000000000004";

let db: PGlite;

type Who = { id: string; admin?: boolean; userMetadataAdmin?: boolean } | null;

/** Switch the session to a Supabase-style role + JWT. */
async function as(who: Who) {
  await db.exec("reset role");
  if (!who) {
    await db.query("select set_config('request.jwt.claims', '', false)");
    await db.exec("set role anon");
    return;
  }
  const claims = {
    sub: who.id,
    role: "authenticated",
    app_metadata: who.admin ? { role: "admin" } : {},
    user_metadata: who.userMetadataAdmin ? { role: "admin" } : {},
  };
  await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(claims)]);
  await db.exec("set role authenticated");
}

const rows = async <T = Record<string, unknown>>(query: string, params: unknown[] = []) =>
  (await db.query<T>(query, params)).rows;

const ids = async (table: string, column = "id") =>
  (await rows<Record<string, string>>(`select ${column} as v from public.${table} order by 1`)).map((r) => r.v);

/** Runs a statement that must be rejected; returns the error message (or null if it succeeded). */
async function rejection(query: string, params: unknown[] = []): Promise<string | null> {
  await db.exec("savepoint probe");
  try {
    await db.query(query, params);
    await db.exec("release savepoint probe");
    return null;
  } catch (error) {
    await db.exec("rollback to savepoint probe");
    return (error as Error).message;
  }
}

/** Rows a write statement actually changed (RLS silently filters the rest). */
const affected = async (query: string, params: unknown[] = []) => (await db.query(query, params)).affectedRows ?? 0;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif((select auth.jwt()) ->> 'sub', '')::uuid $$;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema public, auth to anon, authenticated, service_role;
    -- Supabase grants new tables/functions to its API roles by default; the
    -- migrations must lock them down themselves, so reproduce that default.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  await db.exec(sql("20261028000000_meetings.sql"));
  await db.exec(sql("20261029000000_portal.sql"));

  // Seed as the superuser (bypasses RLS), like the owner's admin script does.
  await db.exec(`
    insert into auth.users (id) values
      ('${U.leadAll}'), ('${U.leadFin}'), ('${U.memberOps}'), ('${U.outsider}'), ('${U.admin}'), ('${U.nobody}');
    insert into public.profiles (id, display_name, email) values
      ('${U.leadAll}', 'Ana (project lead)', 'ana@acme.test'),
      ('${U.leadFin}', 'Fede (finance lead)', 'fede@acme.test'),
      ('${U.memberOps}', 'Omar (ops)', 'omar@acme.test'),
      ('${U.outsider}', 'Bea (other company)', 'bea@beta.test'),
      ('${U.admin}', 'Owner', 'owner@ixma.test'),
      ('${U.nobody}', 'No project', 'nobody@x.test');
    insert into public.organizations (id, name, slug) values
      ('${ORG_A}', 'Acme', 'acme'), ('${ORG_B}', 'Beta', 'beta');
    insert into public.departments (id, organization_id, name) values
      ('${DEPT_FIN}', '${ORG_A}', 'Finance'), ('${DEPT_OPS}', '${ORG_A}', 'Operations'), ('${DEPT_B}', '${ORG_B}', 'Sales');
    insert into public.projects (id, organization_id, name, slug, office_address) values
      ('${P1}', '${ORG_A}', 'Acme Automation', 'acme-automation', 'Av. Reforma 100'),
      ('${P2}', '${ORG_B}', 'Beta Portal', 'beta-portal', 'Calle 5');
    insert into public.project_departments (project_id, department_id) values
      ('${P1}', '${DEPT_FIN}'), ('${P1}', '${DEPT_OPS}'), ('${P2}', '${DEPT_B}');
    insert into public.project_members (project_id, user_id, department_id, role) values
      ('${P1}', '${U.leadAll}', null, 'lead'),
      ('${P1}', '${U.leadFin}', '${DEPT_FIN}', 'lead'),
      ('${P1}', '${U.memberOps}', '${DEPT_OPS}', 'member'),
      ('${P2}', '${U.outsider}', '${DEPT_B}', 'lead');
    insert into public.project_milestones (project_id, department_id, title, status) values
      ('${P1}', null, 'Kickoff', 'completed'),
      ('${P1}', '${DEPT_FIN}', 'Invoice automation', 'in_progress'),
      ('${P2}', null, 'Beta secret plan', 'pending');
    insert into public.tickets (id, project_id, department_id, created_by, title, description) values
      ('${T_FIN}', '${P1}', '${DEPT_FIN}', '${U.leadFin}', 'Finance ticket', 'finance only'),
      ('${T_OPS}', '${P1}', '${DEPT_OPS}', '${U.memberOps}', 'Ops ticket', 'ops only'),
      ('${T_ALL}', '${P1}', null, '${U.leadAll}', 'Project-wide ticket', 'everyone on P1'),
      ('${T_B}', '${P2}', '${DEPT_B}', '${U.outsider}', 'Beta ticket', 'other company');
    insert into public.ticket_comments (ticket_id, author_id, message, is_internal) values
      ('${T_FIN}', '${U.leadFin}', 'public comment', false),
      ('${T_FIN}', '${U.admin}', 'PRIVATE owner note', true);
  `);
});

afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await db.exec("reset role");
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("reset role");
  await db.exec("rollback");
});

describe("not signed in (public API key)", () => {
  it("can read nothing at all", async () => {
    await as(null);
    for (const table of ["organizations", "profiles", "departments", "projects", "project_departments", "project_members", "project_milestones", "tickets", "ticket_comments", "meetings"]) {
      expect(await rejection(`select * from public.${table}`), table).toMatch(/permission denied/i);
    }
  });

  it("cannot create a ticket or comment", async () => {
    await as(null);
    expect(await rejection(`insert into public.tickets (project_id, title, description) values ('${P1}', 'spam', 'x')`)).toMatch(/permission denied/i);
    expect(await rejection(`insert into public.ticket_comments (ticket_id, message) values ('${T_ALL}', 'spam')`)).toMatch(/permission denied/i);
  });
});

describe("project-wide lead (sees the whole project)", () => {
  beforeEach(async () => as({ id: U.leadAll }));

  it("sees their project, plan and team, but not another company's", async () => {
    expect(await ids("projects")).toEqual([P1]);
    expect(await ids("project_milestones", "title")).toEqual(["Invoice automation", "Kickoff"]);
    expect((await ids("project_members", "user_id")).sort()).toEqual([U.leadAll, U.leadFin, U.memberOps].sort());
    expect(await ids("organizations")).toEqual([ORG_A]);
  });

  it("sees every ticket of the project (all departments + project-wide)", async () => {
    expect((await ids("tickets")).sort()).toEqual([T_FIN, T_OPS, T_ALL].sort());
  });

  it("sees teammates' names but not people from other companies", async () => {
    expect((await ids("profiles")).sort()).toEqual([U.leadAll, U.leadFin, U.memberOps].sort());
  });
});

describe("department lead (Finance)", () => {
  beforeEach(async () => as({ id: U.leadFin }));

  it("sees Finance and project-wide tickets, NOT Operations tickets", async () => {
    expect((await ids("tickets")).sort()).toEqual([T_FIN, T_ALL].sort());
    expect(await rows(`select 1 from public.tickets where id = '${T_OPS}'`)).toHaveLength(0);
  });

  it("still sees the whole project plan and team", async () => {
    expect(await ids("projects")).toEqual([P1]);
    expect(await ids("project_milestones", "title")).toEqual(["Invoice automation", "Kickoff"]);
  });

  it("can open a ticket for their own department, numbered per project", async () => {
    const created = await rows<{ ticket_number: number; status: string }>(
      `insert into public.tickets (project_id, department_id, created_by, title, description, category, priority)
       values ('${P1}', '${DEPT_FIN}', '${U.leadFin}', 'New finance bug', 'it broke', 'bug', 'high')
       returning ticket_number, status`
    );
    expect(created[0].status).toBe("open");
    expect(created[0].ticket_number).toBe(4); // T_FIN, T_OPS, T_ALL already took 1-3 in P1
  });

  it("can open a project-wide ticket", async () => {
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description)
                       values ('${P1}', null, '${U.leadFin}', 'Wide', 'ok')`)
    ).toBeNull();
  });

  it("CANNOT open a ticket for another department", async () => {
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description)
                       values ('${P1}', '${DEPT_OPS}', '${U.leadFin}', 'Sneaky', 'ops ticket')`)
    ).toMatch(/row-level security/i);
  });

  it("CANNOT open a ticket in another company's project", async () => {
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description)
                       values ('${P2}', '${DEPT_B}', '${U.leadFin}', 'Cross-tenant', 'nope')`)
    ).toMatch(/row-level security/i);
  });

  it("CANNOT spoof who created a ticket", async () => {
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description)
                       values ('${P1}', '${DEPT_FIN}', '${U.leadAll}', 'Forged', 'as someone else')`)
    ).toMatch(/row-level security/i);
  });

  it("CANNOT create an already-closed ticket", async () => {
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description, status)
                       values ('${P1}', '${DEPT_FIN}', '${U.leadFin}', 'Pre-closed', 'x', 'closed')`)
    ).toMatch(/row-level security/i);
  });

  it("cannot pick their own ticket number", async () => {
    const created = await rows<{ ticket_number: number }>(
      `insert into public.tickets (project_id, department_id, created_by, title, description, ticket_number)
       values ('${P1}', '${DEPT_FIN}', '${U.leadFin}', 'Number grab', 'x', 999) returning ticket_number`
    );
    expect(created[0].ticket_number).toBe(4);
  });

  it("CANNOT change ticket status, edit or delete tickets", async () => {
    expect(await affected(`update public.tickets set status = 'closed' where id = '${T_FIN}'`)).toBe(0);
    expect(await affected(`update public.tickets set title = 'hacked' where id = '${T_FIN}'`)).toBe(0);
    expect(await affected(`delete from public.tickets where id = '${T_FIN}'`)).toBe(0);
  });

  it("can read and write public comments on a visible ticket", async () => {
    expect(await ids("ticket_comments", "message")).toEqual(["public comment"]);
    expect(
      await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_FIN}', '${U.leadFin}', 'thanks')`)
    ).toBeNull();
  });

  it("NEVER sees the owner's internal notes, and cannot write one", async () => {
    expect(await rows(`select 1 from public.ticket_comments where message = 'PRIVATE owner note'`)).toHaveLength(0);
    expect(
      await rejection(`insert into public.ticket_comments (ticket_id, author_id, message, is_internal)
                       values ('${T_FIN}', '${U.leadFin}', 'sneaky internal', true)`)
    ).toMatch(/row-level security/i);
  });

  it("CANNOT comment on a ticket they cannot see", async () => {
    expect(
      await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_OPS}', '${U.leadFin}', 'peeking')`)
    ).toMatch(/row-level security/i);
  });

  it("CANNOT impersonate another author in a comment", async () => {
    expect(
      await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_FIN}', '${U.leadAll}', 'forged')`)
    ).toMatch(/row-level security/i);
  });

  it("CANNOT edit the project, its plan, the team, or grant themselves access", async () => {
    expect(await affected(`update public.projects set name = 'hacked' where id = '${P1}'`)).toBe(0);
    expect(await affected(`update public.project_milestones set status = 'completed'`)).toBe(0);
    expect(await affected(`delete from public.project_milestones`)).toBe(0);
    expect(await affected(`update public.project_members set department_id = null, role = 'lead' where user_id = '${U.leadFin}'`)).toBe(0);
    expect(
      await rejection(`insert into public.project_members (project_id, user_id, role) values ('${P2}', '${U.leadFin}', 'lead')`)
    ).toMatch(/row-level security/i);
  });

  it("can rename themselves but not edit their email or anyone else", async () => {
    expect(await affected(`update public.profiles set display_name = 'Fede F.' where id = '${U.leadFin}'`)).toBe(1);
    expect(await rejection(`update public.profiles set email = 'evil@x.test' where id = '${U.leadFin}'`)).toMatch(/permission denied/i);
    expect(await affected(`update public.profiles set display_name = 'pwned' where id = '${U.leadAll}'`)).toBe(0);
  });
});

describe("department member (Operations)", () => {
  beforeEach(async () => as({ id: U.memberOps }));

  it("sees Operations and project-wide tickets only", async () => {
    expect((await ids("tickets")).sort()).toEqual([T_OPS, T_ALL].sort());
  });

  it("cannot see Finance's conversation", async () => {
    expect(await rows(`select 1 from public.ticket_comments`)).toHaveLength(0);
  });
});

describe("a different company", () => {
  beforeEach(async () => as({ id: U.outsider }));

  it("sees only its own project, plan and tickets", async () => {
    expect(await ids("projects")).toEqual([P2]);
    expect(await ids("tickets")).toEqual([T_B]);
    expect(await ids("project_milestones", "title")).toEqual(["Beta secret plan"]);
    expect(await ids("organizations")).toEqual([ORG_B]);
    expect(await ids("profiles")).toEqual([U.outsider]);
  });

  it("cannot reach project P1 in any way", async () => {
    expect(await rows(`select 1 from public.projects where id = '${P1}'`)).toHaveLength(0);
    expect(await rows(`select 1 from public.tickets where project_id = '${P1}'`)).toHaveLength(0);
    expect(await rows(`select 1 from public.project_members where project_id = '${P1}'`)).toHaveLength(0);
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description)
                       values ('${P1}', null, '${U.outsider}', 'Cross-tenant', 'nope')`)
    ).toMatch(/row-level security/i);
  });
});

describe("signed in but on no project", () => {
  it("sees nothing and can create nothing", async () => {
    await as({ id: U.nobody });
    expect(await ids("projects")).toEqual([]);
    expect(await ids("tickets")).toEqual([]);
    expect(await ids("organizations")).toEqual([]);
    expect(await ids("profiles")).toEqual([U.nobody]);
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description)
                       values ('${P1}', null, '${U.nobody}', 'Uninvited', 'x')`)
    ).toMatch(/row-level security/i);
  });
});

describe("privilege escalation attempts", () => {
  it("editing user_metadata to say 'admin' grants nothing (only app_metadata counts)", async () => {
    await as({ id: U.nobody, userMetadataAdmin: true });
    expect(await ids("projects")).toEqual([]);
    expect(await ids("tickets")).toEqual([]);
    expect(await rejection(`insert into public.organizations (name, slug) values ('Mine', 'mine')`)).toMatch(/row-level security/i);
  });

  it("helper functions are not callable by the public key", async () => {
    await as(null);
    expect(await rejection(`select public.is_admin()`)).toMatch(/permission denied/i);
  });
});

describe("the owner (admin)", () => {
  beforeEach(async () => as({ id: U.admin, admin: true }));

  it("sees everything across companies, including internal notes", async () => {
    expect((await ids("projects")).sort()).toEqual([P1, P2].sort());
    expect(await ids("tickets")).toHaveLength(4);
    expect(await rows(`select 1 from public.ticket_comments where is_internal`)).toHaveLength(1);
    expect(await ids("organizations")).toHaveLength(2);
  });

  it("can move a ticket through its lifecycle and write internal notes", async () => {
    expect(await affected(`update public.tickets set status = 'in_progress' where id = '${T_FIN}'`)).toBe(1);
    expect(
      await rejection(`insert into public.ticket_comments (ticket_id, author_id, message, is_internal)
                       values ('${T_FIN}', '${U.admin}', 'note to self', true)`)
    ).toBeNull();
  });

  it("can update the plan", async () => {
    expect(await affected(`update public.project_milestones set status = 'completed' where title = 'Invoice automation'`)).toBe(1);
  });
});

describe("data integrity", () => {
  it("ticket numbers are per project and independent between projects", async () => {
    await as({ id: U.outsider });
    const created = await rows<{ ticket_number: number }>(
      `insert into public.tickets (project_id, department_id, created_by, title, description)
       values ('${P2}', '${DEPT_B}', '${U.outsider}', 'Beta second', 'x') returning ticket_number`
    );
    expect(created[0].ticket_number).toBe(2); // T_B was #1 in P2, independent of P1's counter
  });

  it("a ticket cannot target a department that is not part of the project", async () => {
    await db.exec("reset role");
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, title, description)
                       values ('${P1}', '${DEPT_B}', 'wrong dept', 'x')`)
    ).toMatch(/foreign key/i);
  });

  it("a member cannot be attached to a department outside the project", async () => {
    await db.exec("reset role");
    expect(
      await rejection(`insert into public.project_members (project_id, user_id, department_id) values ('${P1}', '${U.nobody}', '${DEPT_B}')`)
    ).toMatch(/foreign key/i);
  });

  it("the meetings table stays unreadable to every signed-in user", async () => {
    await as({ id: U.leadAll });
    expect(await rejection(`select * from public.meetings`)).toMatch(/permission denied/i);
  });
});
