/**
 * Proves the portal's access rules against a real Postgres engine (PGlite),
 * with Supabase's `auth.uid()` / `auth.jwt()` and its `anon` / `authenticated`
 * roles recreated, and ALL migrations applied exactly as written. Every test
 * runs as a specific kind of user and tries to read or write something it
 * should (or should not) be able to. Run: npm test
 *
 * Model under test: a project belongs to a company; each department is a
 * FOLDER inside it; a person has one, several or all folders; company-wide
 * executives (CFO/CEO) are granted 'full' or 'view' access by the owner.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const sql = (file: string) => readFileSync(fileURLToPath(new URL(`../migrations/${file}`, import.meta.url)), "utf8");

// Fixed ids so the assertions read clearly.
const U = {
  leadAll: "00000000-0000-0000-0000-0000000000a1", // project P1, ALL folders
  leadFin: "00000000-0000-0000-0000-0000000000a2", // P1, Finance folder only
  memberOps: "00000000-0000-0000-0000-0000000000a3", // P1, Operations folder only
  multi: "00000000-0000-0000-0000-0000000000a4", // P1, Finance + Operations folders (not HR)
  outsider: "00000000-0000-0000-0000-0000000000b1", // member of a different company's project P2
  admin: "00000000-0000-0000-0000-0000000000ff", // the owner
  nobody: "00000000-0000-0000-0000-0000000000c1", // signed in, on no project
  cfo: "00000000-0000-0000-0000-0000000000d1", // company-wide FULL access to Acme
  ceo: "00000000-0000-0000-0000-0000000000d2", // company-wide VIEW-ONLY access to Acme
  betaExec: "00000000-0000-0000-0000-0000000000d3", // company-wide FULL access to Beta
};
const ORG_A = "10000000-0000-0000-0000-000000000001";
const ORG_B = "10000000-0000-0000-0000-000000000002";
const DEPT_FIN = "20000000-0000-0000-0000-000000000001";
const DEPT_OPS = "20000000-0000-0000-0000-000000000002";
const DEPT_B = "20000000-0000-0000-0000-000000000003";
const DEPT_HR = "20000000-0000-0000-0000-000000000004";
const P1 = "30000000-0000-0000-0000-000000000001";
const P2 = "30000000-0000-0000-0000-000000000002";
const P3 = "30000000-0000-0000-0000-000000000003"; // a second Acme project
const T_FIN = "40000000-0000-0000-0000-000000000001";
const T_OPS = "40000000-0000-0000-0000-000000000002";
const T_ALL = "40000000-0000-0000-0000-000000000003";
const T_B = "40000000-0000-0000-0000-000000000004";
const T_HR = "40000000-0000-0000-0000-000000000005";
const T_P3 = "40000000-0000-0000-0000-000000000006";
const A_FIN = "50000000-0000-0000-0000-000000000001";
const A_OPS = "50000000-0000-0000-0000-000000000002";
const A_INTERNAL = "50000000-0000-0000-0000-000000000003";

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

const sorted = (list: string[]) => [...list].sort();

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

const newTicket = (project: string, dept: string | null, by: string, title = "Test ticket") =>
  `insert into public.tickets (project_id, department_id, created_by, title, description)
   values ('${project}', ${dept ? `'${dept}'` : "null"}, '${by}', '${title}', 'x')`;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif((select auth.jwt()) ->> 'sub', '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean not null default false, file_size_limit bigint);
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
  await db.exec(sql("20261029000100_access_model.sql"));
  await db.exec(sql("20261029000200_encrypted_content.sql"));
  await db.exec(sql("20261029000300_ticket_attachments.sql"));
  await db.exec(sql("20261029000400_problem_details.sql"));
  await db.exec(sql("20261029000500_project_log.sql"));
  await db.exec(sql("20261029000600_reopen_ticket.sql"));
  await db.exec(sql("20261029000700_confirm_ticket_fixed.sql"));
  await db.exec(sql("20261029000800_leader_logs.sql"));
  await db.exec(sql("20261029000900_closed_tickets.sql"));
  await db.exec(sql("20261029001000_email_notifications.sql"));
  await db.exec(sql("20261029001100_preferences.sql"));
  // The WhatsApp migration was dropped from the project; this removes it for anyone who ran it, and does nothing for everyone else.
  await db.exec(sql("20261029001300_remove_whatsapp.sql"));
  await db.exec(sql("20261029001400_onsite_visits.sql"));
  await db.exec(sql("20261029001500_area_info.sql"));
  await db.exec(sql("20261029001600_meeting_topic.sql"));
  await db.exec(sql("20261029001700_meeting_client.sql"));
  await db.exec(sql("20261029001800_office_days.sql"));

  // Seed as the superuser (bypasses RLS), like the owner's admin script does.
  await db.exec(`
    insert into auth.users (id) values
      ('${U.leadAll}'), ('${U.leadFin}'), ('${U.memberOps}'), ('${U.multi}'), ('${U.outsider}'),
      ('${U.admin}'), ('${U.nobody}'), ('${U.cfo}'), ('${U.ceo}'), ('${U.betaExec}');
    insert into public.profiles (id, display_name, email) values
      ('${U.leadAll}', 'Ana (project lead)', 'ana@acme.test'),
      ('${U.leadFin}', 'Fede (finance lead)', 'fede@acme.test'),
      ('${U.memberOps}', 'Omar (ops)', 'omar@acme.test'),
      ('${U.multi}', 'Marta (finance + ops)', 'marta@acme.test'),
      ('${U.outsider}', 'Bea (other company)', 'bea@beta.test'),
      ('${U.admin}', 'Owner', 'owner@ixma.test'),
      ('${U.nobody}', 'No project', 'nobody@x.test'),
      ('${U.cfo}', 'Carla (CFO)', 'cfo@acme.test'),
      ('${U.ceo}', 'Cesar (CEO)', 'ceo@acme.test'),
      ('${U.betaExec}', 'Beto (Beta exec)', 'exec@beta.test');
    insert into public.organizations (id, name, slug) values
      ('${ORG_A}', 'Acme', 'acme'), ('${ORG_B}', 'Beta', 'beta');
    insert into public.departments (id, organization_id, name) values
      ('${DEPT_FIN}', '${ORG_A}', 'Finance'), ('${DEPT_OPS}', '${ORG_A}', 'Operations'),
      ('${DEPT_HR}', '${ORG_A}', 'HR'), ('${DEPT_B}', '${ORG_B}', 'Sales');
    insert into public.projects (id, organization_id, name, slug, office_address) values
      ('${P1}', '${ORG_A}', 'Acme Automation', 'acme-automation', 'Av. Reforma 100'),
      ('${P2}', '${ORG_B}', 'Beta Portal', 'beta-portal', 'Calle 5'),
      ('${P3}', '${ORG_A}', 'Acme Reporting', 'acme-reporting', null);
    insert into public.project_departments (project_id, department_id) values
      ('${P1}', '${DEPT_FIN}'), ('${P1}', '${DEPT_OPS}'), ('${P1}', '${DEPT_HR}'),
      ('${P2}', '${DEPT_B}'), ('${P3}', '${DEPT_FIN}');
    insert into public.project_members (project_id, user_id, role, all_departments) values
      ('${P1}', '${U.leadAll}', 'lead', true),
      ('${P1}', '${U.leadFin}', 'lead', false),
      ('${P1}', '${U.memberOps}', 'member', false),
      ('${P1}', '${U.multi}', 'member', false),
      ('${P2}', '${U.outsider}', 'lead', true);
    insert into public.project_member_departments (project_id, user_id, department_id) values
      ('${P1}', '${U.leadFin}', '${DEPT_FIN}'),
      ('${P1}', '${U.memberOps}', '${DEPT_OPS}'),
      ('${P1}', '${U.multi}', '${DEPT_FIN}'),
      ('${P1}', '${U.multi}', '${DEPT_OPS}');
    insert into public.organization_members (organization_id, user_id, access_level) values
      ('${ORG_A}', '${U.cfo}', 'full'),
      ('${ORG_A}', '${U.ceo}', 'view'),
      ('${ORG_B}', '${U.betaExec}', 'full');
    insert into public.project_milestones (project_id, department_id, title, status) values
      ('${P1}', null, 'Kickoff', 'completed'),
      ('${P1}', '${DEPT_FIN}', 'Invoice automation', 'in_progress'),
      ('${P1}', '${DEPT_HR}', 'HR onboarding', 'pending'),
      ('${P2}', null, 'Beta secret plan', 'pending');
    insert into public.tickets (id, project_id, department_id, created_by, title, description) values
      ('${T_FIN}', '${P1}', '${DEPT_FIN}', '${U.leadFin}', 'Finance ticket', 'finance only'),
      ('${T_OPS}', '${P1}', '${DEPT_OPS}', '${U.memberOps}', 'Ops ticket', 'ops only'),
      ('${T_ALL}', '${P1}', null, '${U.leadAll}', 'Project-wide ticket', 'everyone on P1'),
      ('${T_B}', '${P2}', '${DEPT_B}', '${U.outsider}', 'Beta ticket', 'other company'),
      ('${T_HR}', '${P1}', '${DEPT_HR}', '${U.leadAll}', 'HR ticket', 'hr only'),
      ('${T_P3}', '${P3}', '${DEPT_FIN}', null, 'Reporting ticket', 'second Acme project');
    insert into public.ticket_comments (ticket_id, author_id, message, is_internal) values
      ('${T_FIN}', '${U.leadFin}', 'public comment', false),
      ('${T_FIN}', '${U.admin}', 'PRIVATE owner note', true);
  `);

  const internal = await db.query<{ id: string }>(`select id from public.ticket_comments where is_internal`);
  await db.exec(`
    insert into public.ticket_attachments (id, ticket_id, comment_id, file_name, mime_type, size_bytes, created_by) values
      ('${A_FIN}', '${T_FIN}', null, 'enc-name', 'enc-type', 1000, '${U.leadFin}'),
      ('${A_OPS}', '${T_OPS}', null, 'enc-name', 'enc-type', 1000, '${U.memberOps}'),
      ('${A_INTERNAL}', '${T_FIN}', '${internal.rows[0].id}', 'enc-name', 'enc-type', 1000, '${U.admin}');
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
    for (const table of [
      "organizations", "profiles", "departments", "projects", "project_departments", "project_members",
      "project_member_departments", "organization_members", "project_milestones", "tickets", "ticket_comments", "ticket_attachments", "project_events", "meetings",
    ]) {
      expect(await rejection(`select * from public.${table}`), table).toMatch(/permission denied/i);
    }
  });

  it("cannot create a ticket or comment", async () => {
    await as(null);
    expect(await rejection(newTicket(P1, null, U.leadAll))).toMatch(/permission denied/i);
    expect(await rejection(`insert into public.ticket_comments (ticket_id, message) values ('${T_ALL}', 'spam')`)).toMatch(/permission denied/i);
  });
});

describe("a person with ALL folders", () => {
  beforeEach(async () => as({ id: U.leadAll }));

  it("sees their project, every folder, and nothing of another company", async () => {
    expect(await ids("projects")).toEqual([P1]);
    expect(await ids("organizations")).toEqual([ORG_A]);
    expect(sorted(await ids("departments"))).toEqual(sorted([DEPT_FIN, DEPT_OPS, DEPT_HR]));
    expect(sorted(await ids("project_departments", "department_id"))).toEqual(sorted([DEPT_FIN, DEPT_OPS, DEPT_HR]));
  });

  it("sees the whole plan and every ticket of the project", async () => {
    expect(await ids("project_milestones", "title")).toEqual(["HR onboarding", "Invoice automation", "Kickoff"]);
    expect(sorted(await ids("tickets"))).toEqual(sorted([T_FIN, T_OPS, T_HR, T_ALL]));
  });

  it("sees the team", async () => {
    expect(sorted(await ids("project_members", "user_id"))).toEqual(sorted([U.leadAll, U.leadFin, U.memberOps, U.multi]));
    expect(sorted(await ids("profiles"))).toEqual(sorted([U.leadAll, U.leadFin, U.memberOps, U.multi]));
  });
});

describe("a person with ONE folder (Finance)", () => {
  beforeEach(async () => as({ id: U.leadFin }));

  it("sees Finance and project-wide tickets — not Operations or HR", async () => {
    expect(sorted(await ids("tickets"))).toEqual(sorted([T_FIN, T_ALL]));
    expect(await rows(`select 1 from public.tickets where id in ('${T_OPS}', '${T_HR}')`)).toHaveLength(0);
  });

  it("sees project-wide and Finance plan items, NOT other folders' plan items", async () => {
    expect(await ids("project_milestones", "title")).toEqual(["Invoice automation", "Kickoff"]);
    expect(await rows(`select 1 from public.project_milestones where title = 'HR onboarding'`)).toHaveLength(0);
  });

  it("does not even see the names of folders they have no access to", async () => {
    expect(await ids("departments")).toEqual([DEPT_FIN]);
    expect(await ids("project_departments", "department_id")).toEqual([DEPT_FIN]);
  });

  it("does not see who else belongs to other folders", async () => {
    const visible = await rows<{ user_id: string; department_id: string }>(
      `select user_id, department_id from public.project_member_departments order by 1, 2`
    );
    expect(visible.every((r) => r.department_id === DEPT_FIN)).toBe(true);
    expect(visible.some((r) => r.user_id === U.memberOps)).toBe(false);
  });

  it("can open a ticket in their own folder or project-wide, numbered per project", async () => {
    const created = await rows<{ ticket_number: number; status: string }>(
      `${newTicket(P1, DEPT_FIN, U.leadFin, "New finance bug")} returning ticket_number, status`
    );
    expect(created[0].status).toBe("open");
    expect(created[0].ticket_number).toBe(5); // four tickets already exist in P1
    expect(await rejection(newTicket(P1, null, U.leadFin, "Wide"))).toBeNull();
  });

  it("CANNOT open a ticket in another folder, another company's project, or as someone else", async () => {
    expect(await rejection(newTicket(P1, DEPT_OPS, U.leadFin))).toMatch(/row-level security/i);
    expect(await rejection(newTicket(P1, DEPT_HR, U.leadFin))).toMatch(/row-level security/i);
    expect(await rejection(newTicket(P2, DEPT_B, U.leadFin))).toMatch(/row-level security/i);
    expect(await rejection(newTicket(P1, DEPT_FIN, U.leadAll))).toMatch(/row-level security/i);
  });

  it("CANNOT create an already-closed ticket or choose their own ticket number", async () => {
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description, status)
                       values ('${P1}', '${DEPT_FIN}', '${U.leadFin}', 'Pre-closed', 'x', 'closed')`)
    ).toMatch(/row-level security/i);
    const created = await rows<{ ticket_number: number }>(
      `insert into public.tickets (project_id, department_id, created_by, title, description, ticket_number)
       values ('${P1}', '${DEPT_FIN}', '${U.leadFin}', 'Number grab', 'x', 999) returning ticket_number`
    );
    expect(created[0].ticket_number).toBe(5);
  });

  it("CANNOT change ticket status, edit or delete tickets", async () => {
    expect(await affected(`update public.tickets set status = 'closed' where id = '${T_FIN}'`)).toBe(0);
    expect(await affected(`update public.tickets set title = 'hacked' where id = '${T_FIN}'`)).toBe(0);
    expect(await affected(`delete from public.tickets where id = '${T_FIN}'`)).toBe(0);
  });

  it("can read and write public comments on a visible ticket, never internal ones", async () => {
    expect(await ids("ticket_comments", "message")).toEqual(["public comment"]);
    expect(await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_FIN}', '${U.leadFin}', 'thanks')`)).toBeNull();
    expect(await rows(`select 1 from public.ticket_comments where message = 'PRIVATE owner note'`)).toHaveLength(0);
    expect(
      await rejection(`insert into public.ticket_comments (ticket_id, author_id, message, is_internal) values ('${T_FIN}', '${U.leadFin}', 'x', true)`)
    ).toMatch(/row-level security/i);
  });

  it("CANNOT comment on a ticket in a folder they cannot see, or impersonate an author", async () => {
    expect(await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_OPS}', '${U.leadFin}', 'peeking')`)).toMatch(/row-level security/i);
    expect(await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_FIN}', '${U.leadAll}', 'forged')`)).toMatch(/row-level security/i);
  });

  it("CANNOT edit the project, the plan, the team, or give themselves more folders", async () => {
    expect(await affected(`update public.projects set name = 'hacked' where id = '${P1}'`)).toBe(0);
    expect(await affected(`update public.project_milestones set status = 'completed'`)).toBe(0);
    expect(await affected(`delete from public.project_milestones`)).toBe(0);
    expect(await affected(`update public.project_members set all_departments = true, role = 'lead' where user_id = '${U.leadFin}'`)).toBe(0);
    expect(
      await rejection(`insert into public.project_member_departments (project_id, user_id, department_id) values ('${P1}', '${U.leadFin}', '${DEPT_HR}')`)
    ).toMatch(/row-level security/i);
    expect(await rejection(`insert into public.project_members (project_id, user_id, role) values ('${P2}', '${U.leadFin}', 'lead')`)).toMatch(/row-level security/i);
  });

  it("can rename themselves but not edit their email or anyone else", async () => {
    expect(await affected(`update public.profiles set display_name = 'Fede F.' where id = '${U.leadFin}'`)).toBe(1);
    expect(await rejection(`update public.profiles set email = 'evil@x.test' where id = '${U.leadFin}'`)).toMatch(/permission denied/i);
    expect(await affected(`update public.profiles set display_name = 'pwned' where id = '${U.leadAll}'`)).toBe(0);
  });

  it("can switch their own e-mails off and on, but not anyone else's", async () => {
    expect(await affected(`update public.profiles set notify_email = false where id = '${U.leadFin}'`)).toBe(1);
    expect(await affected(`update public.profiles set notify_email = true where id = '${U.leadFin}'`)).toBe(1);
    expect(await affected(`update public.profiles set notify_email = false where id = '${U.leadAll}'`)).toBe(0);
    await as({ id: U.admin, admin: true });
    expect((await rows<{ notify_email: boolean }>(`select notify_email from public.profiles where id = '${U.leadAll}'`))[0].notify_email).toBe(true);
  });

  it("can set their own language, time zone and which e-mails they want", async () => {
    expect(await affected(`update public.profiles set locale = 'es', timezone = 'Europe/Madrid', notify_fix_ready = false, notify_replies = false where id = '${U.leadFin}'`)).toBe(1);
    await as({ id: U.admin, admin: true });
    const [row] = await rows<{ locale: string; timezone: string; notify_fix_ready: boolean; notify_replies: boolean }>(
      `select locale, timezone, notify_fix_ready, notify_replies from public.profiles where id = '${U.leadFin}'`
    );
    expect(row).toEqual({ locale: "es", timezone: "Europe/Madrid", notify_fix_ready: false, notify_replies: false });
  });

  it("cannot change someone else's preferences", async () => {
    expect(await affected(`update public.profiles set locale = 'en', timezone = 'UTC', notify_replies = false where id = '${U.leadAll}'`)).toBe(0);
  });

  it("only English and Spanish are accepted as a language; the time zone cannot be empty or huge", async () => {
    expect(await rejection(`update public.profiles set locale = 'fr' where id = '${U.leadFin}'`)).toMatch(/check constraint/i);
    expect(await rejection(`update public.profiles set timezone = '' where id = '${U.leadFin}'`)).toMatch(/check constraint/i);
    expect(await rejection(`update public.profiles set timezone = '${"x".repeat(80)}' where id = '${U.leadFin}'`)).toMatch(/check constraint/i);
    expect(await affected(`update public.profiles set locale = null where id = '${U.leadFin}'`)).toBe(1);
  });

  it("e-mails are on until someone switches them off", async () => {
    await as({ id: U.admin, admin: true });
    const all = await rows<{ notify_email: boolean }>(`select notify_email from public.profiles`);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((row) => row.notify_email === true)).toBe(true);
  });
});

describe("a person with SEVERAL folders (Finance + Operations, not HR)", () => {
  beforeEach(async () => as({ id: U.multi }));

  it("sees both folders' tickets and project-wide ones — but not HR", async () => {
    expect(sorted(await ids("tickets"))).toEqual(sorted([T_FIN, T_OPS, T_ALL]));
    expect(await rows(`select 1 from public.tickets where id = '${T_HR}'`)).toHaveLength(0);
  });

  it("sees both folders' names and plan items, not HR's", async () => {
    expect(sorted(await ids("departments"))).toEqual(sorted([DEPT_FIN, DEPT_OPS]));
    expect(await ids("project_milestones", "title")).toEqual(["Invoice automation", "Kickoff"]);
  });

  it("can open tickets in either granted folder and project-wide, but not HR", async () => {
    expect(await rejection(newTicket(P1, DEPT_FIN, U.multi))).toBeNull();
    expect(await rejection(newTicket(P1, DEPT_OPS, U.multi))).toBeNull();
    expect(await rejection(newTicket(P1, null, U.multi))).toBeNull();
    expect(await rejection(newTicket(P1, DEPT_HR, U.multi))).toMatch(/row-level security/i);
  });

  it("can comment in both granted folders, not in HR", async () => {
    expect(await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_OPS}', '${U.multi}', 'ok')`)).toBeNull();
    expect(await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_HR}', '${U.multi}', 'no')`)).toMatch(/row-level security/i);
  });
});

describe("a person with one folder (Operations)", () => {
  beforeEach(async () => as({ id: U.memberOps }));

  it("sees Operations and project-wide tickets only, and only project-wide plan items", async () => {
    expect(sorted(await ids("tickets"))).toEqual(sorted([T_OPS, T_ALL]));
    expect(await ids("project_milestones", "title")).toEqual(["Kickoff"]);
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
    expect(await ids("departments")).toEqual([DEPT_B]);
  });

  it("cannot reach project P1 in any way", async () => {
    expect(await rows(`select 1 from public.projects where id = '${P1}'`)).toHaveLength(0);
    expect(await rows(`select 1 from public.tickets where project_id = '${P1}'`)).toHaveLength(0);
    expect(await rows(`select 1 from public.project_members where project_id = '${P1}'`)).toHaveLength(0);
    expect(await rejection(newTicket(P1, null, U.outsider))).toMatch(/row-level security/i);
  });
});

describe("signed in but on no project", () => {
  it("sees nothing and can create nothing", async () => {
    await as({ id: U.nobody });
    for (const table of ["projects", "tickets", "organizations", "departments", "project_milestones"]) {
      expect(await ids(table), table).toEqual([]);
    }
    expect(await ids("profiles")).toEqual([U.nobody]);
    expect(await rejection(newTicket(P1, null, U.nobody))).toMatch(/row-level security/i);
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
    expect(await rejection(`select public.org_access_to_project('${P1}', true)`)).toMatch(/permission denied/i);
  });
});

describe("company-wide access: CFO with FULL access", () => {
  beforeEach(async () => as({ id: U.cfo }));

  it("sees every project of their company — and nothing of another company", async () => {
    expect(sorted(await ids("projects"))).toEqual(sorted([P1, P3]));
    expect(await ids("organizations")).toEqual([ORG_A]);
    expect(sorted(await ids("departments"))).toEqual(sorted([DEPT_FIN, DEPT_OPS, DEPT_HR]));
    expect(await rows(`select 1 from public.projects where id = '${P2}'`)).toHaveLength(0);
  });

  it("sees every folder's tickets, the whole plan and the team", async () => {
    expect(sorted(await ids("tickets"))).toEqual(sorted([T_FIN, T_OPS, T_HR, T_ALL, T_P3]));
    expect(await rows(`select 1 from public.tickets where id = '${T_B}'`)).toHaveLength(0);
    expect(await ids("project_milestones", "title")).toEqual(["HR onboarding", "Invoice automation", "Kickoff"]);
    expect(sorted(await ids("project_members", "user_id"))).toEqual(sorted([U.leadAll, U.leadFin, U.memberOps, U.multi]));
  });

  it("can open a ticket in ANY folder, or project-wide, in any project of the company", async () => {
    for (const [project, dept] of [[P1, DEPT_OPS], [P1, DEPT_FIN], [P1, DEPT_HR], [P1, null], [P3, DEPT_FIN]] as const) {
      expect(await rejection(newTicket(project, dept, U.cfo, "From the CFO"))).toBeNull();
    }
  });

  it("CANNOT open a ticket in another company, or forge the author", async () => {
    expect(await rejection(newTicket(P2, DEPT_B, U.cfo))).toMatch(/row-level security/i);
    expect(await rejection(newTicket(P1, null, U.leadAll))).toMatch(/row-level security/i);
  });

  it("can comment in a folder they don't belong to — but never write an internal note", async () => {
    expect(await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_OPS}', '${U.cfo}', 'question for ops')`)).toBeNull();
    expect(await rejection(`insert into public.ticket_comments (ticket_id, author_id, message, is_internal) values ('${T_OPS}', '${U.cfo}', 'x', true)`)).toMatch(/row-level security/i);
    expect(await rows(`select 1 from public.ticket_comments where message = 'PRIVATE owner note'`)).toHaveLength(0);
  });

  it("CANNOT edit tickets, the plan, the teams, the folders or the project", async () => {
    expect(await affected(`update public.tickets set status = 'closed'`)).toBe(0);
    expect(await affected(`update public.project_milestones set status = 'completed'`)).toBe(0);
    expect(await affected(`update public.projects set name = 'hacked'`)).toBe(0);
    expect(await affected(`delete from public.project_members`)).toBe(0);
    expect(await rejection(`insert into public.project_members (project_id, user_id, role) values ('${P1}', '${U.cfo}', 'lead')`)).toMatch(/row-level security/i);
    expect(
      await rejection(`insert into public.project_member_departments (project_id, user_id, department_id) values ('${P1}', '${U.leadFin}', '${DEPT_HR}')`)
    ).toMatch(/row-level security/i);
  });

  it("CANNOT grant themselves more access, add others, or see who else holds it", async () => {
    expect(await affected(`update public.organization_members set access_level = 'full'`)).toBe(0);
    expect(await rejection(`insert into public.organization_members (organization_id, user_id) values ('${ORG_B}', '${U.cfo}')`)).toMatch(/row-level security/i);
    expect(await rejection(`insert into public.organization_members (organization_id, user_id) values ('${ORG_A}', '${U.leadFin}')`)).toMatch(/row-level security/i);
    expect(await ids("organization_members", "user_id")).toEqual([U.cfo]); // only their own row
  });
});

describe("company-wide access: CEO with VIEW-ONLY access", () => {
  beforeEach(async () => as({ id: U.ceo }));

  it("sees everything the full level sees", async () => {
    expect(sorted(await ids("projects"))).toEqual(sorted([P1, P3]));
    expect(sorted(await ids("tickets"))).toEqual(sorted([T_FIN, T_OPS, T_HR, T_ALL, T_P3]));
    expect(await ids("project_milestones", "title")).toEqual(["HR onboarding", "Invoice automation", "Kickoff"]);
  });

  it("CANNOT open a ticket anywhere", async () => {
    for (const dept of [DEPT_FIN, DEPT_OPS, DEPT_HR, null]) {
      expect(await rejection(newTicket(P1, dept, U.ceo)), String(dept)).toMatch(/row-level security/i);
    }
  });

  it("CANNOT comment on any ticket", async () => {
    expect(await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_FIN}', '${U.ceo}', 'hi')`)).toMatch(/row-level security/i);
  });
});

describe("company-wide access: a different company's executive", () => {
  it("sees only their own company", async () => {
    await as({ id: U.betaExec });
    expect(await ids("projects")).toEqual([P2]);
    expect(await ids("tickets")).toEqual([T_B]);
    expect(await ids("organizations")).toEqual([ORG_B]);
    expect(await ids("project_milestones", "title")).toEqual(["Beta secret plan"]);
    expect(await ids("departments")).toEqual([DEPT_B]);
  });
});

describe("who can see whose name", () => {
  it("team members cannot see who holds company-wide access", async () => {
    await as({ id: U.leadFin });
    expect(await ids("organization_members", "user_id")).toEqual([]);
  });

  it("a person sees an executive's name only once that executive authors something they can see", async () => {
    await as({ id: U.leadFin });
    expect(await rows(`select 1 from public.profiles where id = '${U.cfo}'`)).toHaveLength(0);

    await as({ id: U.cfo });
    await db.exec(newTicket(P1, DEPT_FIN, U.cfo, "Finance question"));

    await as({ id: U.leadFin });
    expect(await rows(`select display_name from public.profiles where id = '${U.cfo}'`)).toEqual([{ display_name: "Carla (CFO)" }]);

    // The Operations member can't see that Finance ticket, so still can't see the CFO.
    await as({ id: U.memberOps });
    expect(await rows(`select 1 from public.profiles where id = '${U.cfo}'`)).toHaveLength(0);
  });

  it("clients see the owner's name on replies, but never because of an internal note", async () => {
    await as({ id: U.leadFin });
    expect(await rows(`select 1 from public.profiles where id = '${U.admin}'`)).toHaveLength(0);

    await as({ id: U.admin, admin: true });
    await db.exec(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_FIN}', '${U.admin}', 'Fixed on staging')`);

    await as({ id: U.leadFin });
    expect(await rows(`select display_name from public.profiles where id = '${U.admin}'`)).toEqual([{ display_name: "Owner" }]);
  });
});

describe("the owner (admin)", () => {
  beforeEach(async () => as({ id: U.admin, admin: true }));

  it("sees everything across companies, including internal notes", async () => {
    expect(sorted(await ids("projects"))).toEqual(sorted([P1, P2, P3]));
    expect(await ids("tickets")).toHaveLength(6);
    expect(await rows(`select 1 from public.ticket_comments where is_internal`)).toHaveLength(1);
    expect(await ids("organizations")).toHaveLength(2);
    expect(await ids("departments")).toHaveLength(4);
  });

  it("can move a ticket through its lifecycle, write internal notes and update the plan", async () => {
    expect(await affected(`update public.tickets set status = 'in_progress' where id = '${T_FIN}'`)).toBe(1);
    expect(
      await rejection(`insert into public.ticket_comments (ticket_id, author_id, message, is_internal) values ('${T_FIN}', '${U.admin}', 'note to self', true)`)
    ).toBeNull();
    expect(await affected(`update public.project_milestones set status = 'completed' where title = 'Invoice automation'`)).toBe(1);
  });
});

describe("the owner manages who can see what", () => {
  it("raises, lowers and revokes company-wide access — and it takes effect immediately", async () => {
    await as({ id: U.admin, admin: true });
    expect(await affected(`update public.organization_members set access_level = 'view' where user_id = '${U.cfo}'`)).toBe(1);
    await as({ id: U.cfo });
    expect(await rejection(newTicket(P1, null, U.cfo, "Now read-only"))).toMatch(/row-level security/i);

    await as({ id: U.admin, admin: true });
    expect(await affected(`delete from public.organization_members where user_id = '${U.cfo}'`)).toBe(1);
    await as({ id: U.cfo });
    expect(await ids("projects")).toEqual([]);
  });

  it("grants and removes a folder for a person — and it takes effect immediately", async () => {
    await as({ id: U.memberOps });
    expect(await rows(`select 1 from public.tickets where id = '${T_FIN}'`)).toHaveLength(0);

    await as({ id: U.admin, admin: true });
    await db.exec(`insert into public.project_member_departments (project_id, user_id, department_id) values ('${P1}', '${U.memberOps}', '${DEPT_FIN}')`);
    await as({ id: U.memberOps });
    expect(await rows(`select 1 from public.tickets where id = '${T_FIN}'`)).toHaveLength(1);
    expect(await ids("project_milestones", "title")).toEqual(["Invoice automation", "Kickoff"]);

    await as({ id: U.admin, admin: true });
    await db.exec(`delete from public.project_member_departments where user_id = '${U.memberOps}' and department_id = '${DEPT_FIN}'`);
    await as({ id: U.memberOps });
    expect(await rows(`select 1 from public.tickets where id = '${T_FIN}'`)).toHaveLength(0);
  });

  it("can switch a person to all folders, which opens HR to them", async () => {
    await as({ id: U.admin, admin: true });
    expect(await affected(`update public.project_members set all_departments = true where user_id = '${U.leadFin}'`)).toBe(1);
    await as({ id: U.leadFin });
    expect(await rows(`select 1 from public.tickets where id = '${T_HR}'`)).toHaveLength(1);
  });
});

describe("data integrity", () => {
  it("ticket numbers are per project and independent between projects", async () => {
    await as({ id: U.outsider });
    const created = await rows<{ ticket_number: number }>(`${newTicket(P2, DEPT_B, U.outsider, "Beta second")} returning ticket_number`);
    expect(created[0].ticket_number).toBe(2); // T_B was #1 in P2
  });

  it("a ticket cannot target a folder that is not part of the project", async () => {
    await db.exec("reset role");
    expect(await rejection(newTicket(P1, DEPT_B, U.leadAll))).toMatch(/foreign key/i);
  });

  it("a person cannot be given a folder outside the project, or a folder without being on the project", async () => {
    await db.exec("reset role");
    expect(
      await rejection(`insert into public.project_member_departments (project_id, user_id, department_id) values ('${P1}', '${U.memberOps}', '${DEPT_B}')`)
    ).toMatch(/foreign key/i);
    expect(
      await rejection(`insert into public.project_member_departments (project_id, user_id, department_id) values ('${P1}', '${U.nobody}', '${DEPT_FIN}')`)
    ).toMatch(/foreign key/i);
  });

  it("removing someone from a project removes their folder grants too", async () => {
    await db.exec("reset role");
    await db.exec(`delete from public.project_members where project_id = '${P1}' and user_id = '${U.multi}'`);
    expect(await rows(`select 1 from public.project_member_departments where user_id = '${U.multi}'`)).toHaveLength(0);
  });

  it("encrypted text is accepted at its real stored length (the old 200-character title limit would have rejected it)", async () => {
    // A 200-character title becomes roughly 310 characters once encrypted.
    const stored = "v1." + "A".repeat(16) + "." + "B".repeat(22) + "." + "C".repeat(270);
    await as({ id: U.leadFin });
    expect(
      await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description)
                       values ('${P1}', '${DEPT_FIN}', '${U.leadFin}', '${stored}', '${stored}')`)
    ).toBeNull();
  });

  it("still refuses empty or absurdly large content", async () => {
    await as({ id: U.leadFin });
    expect(await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description) values ('${P1}', '${DEPT_FIN}', '${U.leadFin}', '', 'x')`)).toMatch(/check constraint/i);
    expect(await rejection(`insert into public.tickets (project_id, department_id, created_by, title, description) values ('${P1}', '${DEPT_FIN}', '${U.leadFin}', '${"x".repeat(2001)}', 'x')`)).toMatch(/check constraint/i);
    expect(await rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_FIN}', '${U.leadFin}', '')`)).toMatch(/check constraint/i);
  });

  it("each email fingerprint belongs to one person only", async () => {
    await db.exec("reset role");
    await db.exec(`update public.profiles set email_hash = 'abc123' where id = '${U.leadAll}'`);
    expect(await rejection(`update public.profiles set email_hash = 'abc123' where id = '${U.leadFin}'`)).toMatch(/unique|duplicate/i);
    // people without a fingerprint yet (before backfill) do not collide with each other
    expect(await rejection(`update public.profiles set email_hash = null where id in ('${U.leadAll}', '${U.leadFin}')`)).toBeNull();
  });

  it("the meetings table stays unreadable to every signed-in user", async () => {
    await as({ id: U.leadAll });
    expect(await rejection(`select * from public.meetings`)).toMatch(/permission denied/i);
  });
});

describe("files attached to tickets", () => {
  const attach = (ticket: string, by: string, size = 2000) =>
    `insert into public.ticket_attachments (ticket_id, file_name, mime_type, size_bytes, created_by)
     values ('${ticket}', 'enc-name', 'enc-type', ${size}, '${by}')`;

  it("a person sees files on tickets they can see — and not on other folders' tickets", async () => {
    await as({ id: U.leadFin });
    expect(await ids("ticket_attachments")).toEqual([A_FIN]);
    await as({ id: U.memberOps });
    expect(await ids("ticket_attachments")).toEqual([A_OPS]);
  });

  it("files on the owner's internal notes are invisible to everyone else", async () => {
    await as({ id: U.leadFin });
    expect(await rows(`select 1 from public.ticket_attachments where id = '${A_INTERNAL}'`)).toHaveLength(0);
    await as({ id: U.cfo });
    expect(await rows(`select 1 from public.ticket_attachments where id = '${A_INTERNAL}'`)).toHaveLength(0);
    await as({ id: U.admin, admin: true });
    expect(await ids("ticket_attachments")).toHaveLength(3);
  });

  it("another company sees none", async () => {
    await as({ id: U.outsider });
    expect(await ids("ticket_attachments")).toEqual([]);
  });

  it("you can attach to a ticket you may write on, recorded as yours", async () => {
    await as({ id: U.leadFin });
    expect(await rejection(attach(T_FIN, U.leadFin))).toBeNull();
  });

  it("you CANNOT attach to a ticket in a folder you lack, or as someone else", async () => {
    await as({ id: U.leadFin });
    expect(await rejection(attach(T_OPS, U.leadFin))).toMatch(/row-level security/i);
    expect(await rejection(attach(T_FIN, U.leadAll))).toMatch(/row-level security/i);
  });

  it("a view-only executive cannot attach; a full executive can attach anywhere in their company", async () => {
    await as({ id: U.ceo });
    expect(await rejection(attach(T_FIN, U.ceo))).toMatch(/row-level security/i);
    await as({ id: U.cfo });
    expect(await rejection(attach(T_OPS, U.cfo))).toBeNull();
    expect(await rejection(attach(T_B, U.cfo))).toMatch(/row-level security/i);
  });

  it("the public key can do nothing with files", async () => {
    await as(null);
    expect(await rejection(`select * from public.ticket_attachments`)).toMatch(/permission denied/i);
    expect(await rejection(attach(T_FIN, U.leadFin))).toMatch(/permission denied/i);
  });

  it("only the owner can change or delete a file record", async () => {
    await as({ id: U.leadFin });
    expect(await affected(`update public.ticket_attachments set size_bytes = 5 where id = '${A_FIN}'`)).toBe(0);
    expect(await affected(`delete from public.ticket_attachments where id = '${A_FIN}'`)).toBe(0);
    await as({ id: U.admin, admin: true });
    expect(await affected(`delete from public.ticket_attachments where id = '${A_FIN}'`)).toBe(1);
  });

  it("refuses empty and oversized files, and removes files with their ticket", async () => {
    await as({ id: U.leadFin });
    expect(await rejection(attach(T_FIN, U.leadFin, 0))).toMatch(/check constraint/i);
    expect(await rejection(attach(T_FIN, U.leadFin, 5242881))).toMatch(/check constraint/i);
    await db.exec("reset role");
    await db.exec(`delete from public.tickets where id = '${T_OPS}'`);
    expect(await rows(`select 1 from public.ticket_attachments where id = '${A_OPS}'`)).toHaveLength(0);
  });

  it("the storage bucket for the files is private", async () => {
    await db.exec("reset role");
    expect(await rows(`select public from storage.buckets where id = 'ticket-attachments'`)).toEqual([{ public: false }]);
  });
});

describe("problem details (action plan, links)", () => {
  it("the action plan of a folder you don't have is invisible with its plan item", async () => {
    await db.exec("reset role");
    await db.exec(`update public.project_milestones set solution = 'HR-ONLY ACTION PLAN' where title = 'HR onboarding'`);
    await as({ id: U.leadFin });
    expect(await rows(`select solution from public.project_milestones where solution is not null`)).toEqual([]);
    await as({ id: U.leadAll });
    expect(await rows(`select solution from public.project_milestones where title = 'HR onboarding'`)).toEqual([{ solution: "HR-ONLY ACTION PLAN" }]);
  });

  it("only the owner can write a problem's details", async () => {
    await as({ id: U.leadFin });
    expect(await affected(`update public.project_milestones set solution = 'defaced'`)).toBe(0);
    await as({ id: U.cfo });
    expect(await affected(`update public.project_milestones set priority = 'low'`)).toBe(0);
    await as({ id: U.admin, admin: true });
    expect(await affected(`update public.project_milestones set solution = 'Real plan', priority = 'high' where title = 'Invoice automation'`)).toBe(1);
  });

  it("priority only accepts high, medium or low", async () => {
    await as({ id: U.admin, admin: true });
    expect(await rejection(`update public.project_milestones set priority = 'urgent' where title = 'Kickoff'`)).toMatch(/check constraint/i);
    expect(await rejection(`update public.project_milestones set priority = 'high' where title = 'Kickoff'`)).toBeNull();
  });

  it("the project overview is readable by members and writable only by the owner", async () => {
    await as({ id: U.admin, admin: true });
    expect(await affected(`update public.projects set overview = 'blueprint overview' where id = '${P1}'`)).toBe(1);
    await as({ id: U.leadFin });
    expect(await rows(`select overview from public.projects where id = '${P1}'`)).toEqual([{ overview: "blueprint overview" }]);
    expect(await affected(`update public.projects set overview = 'x' where id = '${P1}'`)).toBe(0);
    await as({ id: U.outsider });
    expect(await rows(`select overview from public.projects where id = '${P1}'`)).toEqual([]);
  });
});

describe("costs: only full access, plus people the owner switches on", () => {
  const FIN_COST = "COST-FINANCE-ITEM";
  const HR_COST = "COST-HR-ITEM";

  beforeEach(async () => {
    await db.exec("reset role");
    await db.exec(`
      insert into public.problem_costs (milestone_id, cost_note)
        select id, '${FIN_COST}' from public.project_milestones where title = 'Invoice automation';
      insert into public.problem_costs (milestone_id, cost_note)
        select id, '${HR_COST}' from public.project_milestones where title = 'HR onboarding';
    `);
  });

  const costs = async () => (await rows<{ cost_note: string }>(`select cost_note from public.problem_costs order by 1`)).map((r) => r.cost_note);

  it("the owner sees every cost", async () => {
    await as({ id: U.admin, admin: true });
    expect(await costs()).toEqual([FIN_COST, HR_COST].sort());
  });

  it("a person with full project access (all folders) sees costs automatically", async () => {
    await as({ id: U.leadAll });
    expect(await costs()).toEqual([FIN_COST, HR_COST].sort());
  });

  it("a company-wide FULL executive sees costs automatically; a view-only one does not", async () => {
    await as({ id: U.cfo });
    expect(await costs()).toEqual([FIN_COST, HR_COST].sort());
    await as({ id: U.ceo });
    expect(await costs()).toEqual([]);
  });

  it("a team lead with only their folder does NOT see costs by default — even for their own folder's problem", async () => {
    await as({ id: U.leadFin });
    expect(await costs()).toEqual([]);
    await as({ id: U.memberOps });
    expect(await costs()).toEqual([]);
    await as({ id: U.multi });
    expect(await costs()).toEqual([]);
  });

  it("when the owner switches 'can see costs' on, a lead sees costs — but only for folders they have", async () => {
    await as({ id: U.admin, admin: true });
    expect(await affected(`update public.project_members set can_view_costs = true where user_id = '${U.leadFin}'`)).toBe(1);
    await as({ id: U.leadFin });
    expect(await costs()).toEqual([FIN_COST]); // Finance's problem yes, HR's never
  });

  it("the switch also works for a view-only executive, and switching it off takes effect at once", async () => {
    await as({ id: U.admin, admin: true });
    await db.exec(`update public.organization_members set can_view_costs = true where user_id = '${U.ceo}'`);
    await as({ id: U.ceo });
    expect(await costs()).toEqual([FIN_COST, HR_COST].sort());
    await as({ id: U.admin, admin: true });
    await db.exec(`update public.organization_members set can_view_costs = false where user_id = '${U.ceo}'`);
    await as({ id: U.ceo });
    expect(await costs()).toEqual([]);
  });

  it("costs of another company are invisible, even to someone with full access there", async () => {
    await as({ id: U.betaExec });
    expect(await costs()).toEqual([]);
    await as({ id: U.outsider });
    expect(await costs()).toEqual([]);
  });

  it("nobody but the owner can write, change or delete a cost — including people who can read it", async () => {
    await as({ id: U.leadAll });
    expect(await affected(`update public.problem_costs set cost_note = 'free'`)).toBe(0);
    expect(await affected(`delete from public.problem_costs`)).toBe(0);
    expect(
      await rejection(`insert into public.problem_costs (milestone_id, cost_note) select id, 'x' from public.project_milestones where title = 'Kickoff'`)
    ).toMatch(/row-level security/i);
    await as({ id: U.cfo });
    expect(await affected(`update public.problem_costs set cost_note = 'free'`)).toBe(0);
  });

  it("a person cannot give themselves the switch", async () => {
    await as({ id: U.leadFin });
    expect(await affected(`update public.project_members set can_view_costs = true where user_id = '${U.leadFin}'`)).toBe(0);
    await as({ id: U.ceo });
    expect(await affected(`update public.organization_members set can_view_costs = true where user_id = '${U.ceo}'`)).toBe(0);
  });

  it("the public key sees nothing", async () => {
    await as(null);
    expect(await rejection(`select * from public.problem_costs`)).toMatch(/permission denied/i);
    expect(await rejection(`select public.can_view_costs('${P1}')`)).toMatch(/permission denied/i);
  });

  it("the cost rule itself answers correctly per person and per company (checked directly, not only through other layers)", async () => {
    const may = async (who: Who, project: string) => {
      await as(who);
      return (await rows<{ ok: boolean }>(`select public.can_view_costs('${project}') as ok`))[0].ok;
    };
    expect(await may({ id: U.admin, admin: true }, P1)).toBe(true);
    expect(await may({ id: U.leadAll }, P1)).toBe(true); // full project access
    expect(await may({ id: U.cfo }, P1)).toBe(true); // company-wide full
    expect(await may({ id: U.cfo }, P3)).toBe(true); // ...for every project of that company
    expect(await may({ id: U.ceo }, P1)).toBe(false); // view-only
    expect(await may({ id: U.leadFin }, P1)).toBe(false); // one folder, no switch
    expect(await may({ id: U.betaExec }, P1)).toBe(false); // full access — to a DIFFERENT company
    expect(await may({ id: U.outsider }, P1)).toBe(false);
    expect(await may({ id: U.nobody }, P1)).toBe(false);
    expect(await may({ id: U.betaExec }, P2)).toBe(true); // ...but yes for their own
  });

  it("a cost goes with its problem", async () => {
    await db.exec("reset role");
    await db.exec(`delete from public.project_milestones where title = 'HR onboarding'`);
    expect(await rows(`select 1 from public.problem_costs where cost_note = '${HR_COST}'`)).toHaveLength(0);
  });
});

describe("the automatic project log", () => {
  const events = async (kind?: string) =>
    rows<{ kind: string; from_status: string | null; to_status: string | null }>(
      `select kind, from_status, to_status from public.project_events ${kind ? `where kind = '${kind}'` : ""} order by created_at, kind`
    );

  const count = async (where: string) => (await rows(`select 1 from public.project_events where ${where}`)).length;

  it("records a ticket being opened, by whoever opened it (the seed's own tickets were logged too)", async () => {
    await as({ id: U.admin, admin: true });
    const before = await count(`kind = 'ticket_opened' and actor_id = '${U.leadFin}'`);
    expect(before).toBeGreaterThan(0); // T_FIN, created in the seed
    await as({ id: U.leadFin });
    await db.exec(newTicket(P1, DEPT_FIN, U.leadFin, "Logged ticket"));
    await as({ id: U.admin, admin: true });
    expect(await count(`kind = 'ticket_opened' and actor_id = '${U.leadFin}'`)).toBe(before + 1);
    expect((await events("ticket_opened")).every((e) => e.to_status === "open")).toBe(true);
  });

  it("records ticket and plan status changes with the old and new status", async () => {
    await as({ id: U.admin, admin: true });
    await db.exec(`update public.tickets set status = 'in_progress' where id = '${T_FIN}'`);
    await db.exec(`update public.tickets set status = 'resolved' where id = '${T_FIN}'`);
    await db.exec(`update public.project_milestones set status = 'completed' where title = 'Invoice automation'`);
    expect(await events("ticket_status")).toEqual([
      { kind: "ticket_status", from_status: "open", to_status: "in_progress" },
      { kind: "ticket_status", from_status: "in_progress", to_status: "resolved" },
    ]);
    expect(await events("plan_status")).toEqual([{ kind: "plan_status", from_status: "in_progress", to_status: "completed" }]);
  });

  it("does not log a change that changed nothing", async () => {
    await as({ id: U.admin, admin: true });
    await db.exec(`update public.tickets set title = 'edited' where id = '${T_FIN}'`);
    await db.exec(`update public.tickets set status = 'open' where id = '${T_FIN}'`);
    expect(await events("ticket_status")).toEqual([]);
  });

  it("records public comments but leaves no trace of the owner's internal notes", async () => {
    await as({ id: U.admin, admin: true });
    const before = (await events("comment_added")).length; // the seed's public comment is already logged
    await as({ id: U.leadFin });
    await db.exec(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${T_FIN}', '${U.leadFin}', 'public')`);
    await as({ id: U.admin, admin: true });
    expect((await events("comment_added")).length).toBe(before + 1);
    await db.exec(`insert into public.ticket_comments (ticket_id, author_id, message, is_internal) values ('${T_FIN}', '${U.admin}', 'secret', true)`);
    expect((await events("comment_added")).length).toBe(before + 1); // the internal note added nothing
  });

  it("you only see events from folders you have, plus project-wide ones", async () => {
    await as({ id: U.admin, admin: true });
    await db.exec(`update public.tickets set status = 'in_progress' where id in ('${T_FIN}', '${T_OPS}', '${T_ALL}')`);
    await as({ id: U.leadFin });
    const mine = await rows<{ ticket_id: string }>(`select ticket_id from public.project_events where kind = 'ticket_status'`);
    expect(sorted(mine.map((r) => r.ticket_id))).toEqual(sorted([T_FIN, T_ALL]));
    await as({ id: U.outsider }); // another company: only its own project's events, never P1's
    expect(await count(`project_id = '${P1}'`)).toBe(0);
    expect(await count(`project_id = '${P2}'`)).toBeGreaterThan(0);
    await as({ id: U.cfo });
    expect(await count(`kind = 'ticket_status'`)).toBe(3);
  });

  it("nobody — not even the owner — can write, edit or delete the log directly", async () => {
    await as({ id: U.admin, admin: true });
    expect(
      await rejection(`insert into public.project_events (project_id, kind) values ('${P1}', 'ticket_opened')`)
    ).toMatch(/permission denied|row-level security/i);
    expect(await rejection(`delete from public.project_events`)).toMatch(/permission denied/i);
    await as({ id: U.leadFin });
    expect(await rejection(`insert into public.project_events (project_id, kind) values ('${P1}', 'ticket_opened')`)).toMatch(/permission denied/i);
  });

  it("the public key sees nothing", async () => {
    await as(null);
    expect(await rejection(`select * from public.project_events`)).toMatch(/permission denied/i);
  });
});

describe("sending a fixed ticket back ('still broken')", () => {
  const reopen = async (ticket: string) => (await rows<{ ok: boolean }>(`select public.reopen_ticket('${ticket}') as ok`))[0].ok;
  const statusOf = async (ticket: string) => (await rows<{ status: string }>(`select status from public.tickets where id = '${ticket}'`))[0]?.status;
  /** The owner marks a ticket as fixed, waiting for the person to check. */
  const markFixed = async (ticket: string) => {
    await as({ id: U.admin, admin: true });
    await db.exec(`update public.tickets set status = 'needs_review' where id = '${ticket}'`);
  };

  it("someone with the ticket's folder can reopen it, and it becomes plain 'open' again", async () => {
    for (const who of [U.leadFin, U.leadAll, U.multi]) {
      await markFixed(T_FIN);
      await as({ id: who });
      expect(await reopen(T_FIN)).toBe(true);
      expect(await statusOf(T_FIN)).toBe("open");
    }
  });

  it("a company-wide FULL executive can reopen, and the owner can too", async () => {
    await markFixed(T_FIN);
    await as({ id: U.cfo });
    expect(await reopen(T_FIN)).toBe(true);
    await markFixed(T_FIN);
    await as({ id: U.admin, admin: true });
    expect(await reopen(T_FIN)).toBe(true);
  });

  it("a project-wide ticket can be reopened by any member of the project", async () => {
    await markFixed(T_ALL);
    await as({ id: U.memberOps });
    expect(await reopen(T_ALL)).toBe(true);
  });

  it("people without that folder cannot reopen it", async () => {
    await markFixed(T_FIN);
    await as({ id: U.memberOps }); // Operations only
    expect(await reopen(T_FIN)).toBe(false);
    await as({ id: U.admin, admin: true });
    expect(await statusOf(T_FIN)).toBe("needs_review");
  });

  it("a view-only executive, another company's people and a signed-in stranger cannot", async () => {
    await markFixed(T_FIN);
    for (const who of [U.ceo, U.outsider, U.betaExec, U.nobody]) {
      await as({ id: who });
      expect(await reopen(T_FIN)).toBe(false);
    }
    await as({ id: U.admin, admin: true });
    expect(await statusOf(T_FIN)).toBe("needs_review");
  });

  it("the public key cannot call it at all", async () => {
    await markFixed(T_FIN);
    await as(null);
    expect(await rejection(`select public.reopen_ticket('${T_FIN}')`)).toMatch(/permission denied/i);
  });

  it("a ticket that is already being worked on cannot be 'reopened' — it is not closed", async () => {
    for (const status of ["open", "in_progress"]) {
      await as({ id: U.admin, admin: true });
      await db.exec(`update public.tickets set status = '${status}' where id = '${T_FIN}'`);
      await as({ id: U.leadFin });
      expect(await reopen(T_FIN)).toBe(false);
      expect(await statusOf(T_FIN)).toBe(status);
    }
  });

  it("a resolved or closed ticket can be reopened, but only by someone who may write in it", async () => {
    for (const status of ["resolved", "closed"]) {
      await as({ id: U.admin, admin: true });
      await db.exec(`update public.tickets set status = '${status}' where id = '${T_FIN}'`);
      await as({ id: U.memberOps }); // not their area
      expect(await reopen(T_FIN)).toBe(false);
      await as({ id: U.ceo }); // view-only
      expect(await reopen(T_FIN)).toBe(false);
      expect(await statusOf(T_FIN)).toBe(status);
      await as({ id: U.leadFin });
      expect(await reopen(T_FIN)).toBe(true);
      expect(await statusOf(T_FIN)).toBe("open");
    }
  });

  it("the project log shows a closed ticket being reopened", async () => {
    await as({ id: U.admin, admin: true });
    await db.exec(`update public.tickets set status = 'closed' where id = '${T_FIN}'`);
    await as({ id: U.leadFin });
    await reopen(T_FIN);
    const [event] = await rows<{ from_status: string; to_status: string; actor_id: string }>(
      `select from_status, to_status, actor_id from public.project_events
       where kind = 'ticket_status' and ticket_id = '${T_FIN}' and to_status = 'open' order by created_at desc limit 1`
    );
    expect(event).toEqual({ from_status: "closed", to_status: "open", actor_id: U.leadFin });
  });

  it("does not open the door to editing tickets directly", async () => {
    await markFixed(T_FIN);
    await as({ id: U.leadFin });
    expect(await affected(`update public.tickets set status = 'resolved' where id = '${T_FIN}'`)).toBe(0);
    expect(await statusOf(T_FIN)).toBe("needs_review");
  });

  it("the project log records who sent it back, from 'needs review' to 'open'", async () => {
    await markFixed(T_FIN);
    await as({ id: U.leadFin });
    await reopen(T_FIN);
    const [event] = await rows<{ from_status: string; to_status: string; actor_id: string }>(
      `select from_status, to_status, actor_id from public.project_events
       where kind = 'ticket_status' and ticket_id = '${T_FIN}' and to_status = 'open'`
    );
    expect(event).toEqual({ from_status: "needs_review", to_status: "open", actor_id: U.leadFin });
  });
});

describe("a closed ticket takes no more messages", () => {
  const comment = (who: string, ticket: string) =>
    rejection(`insert into public.ticket_comments (ticket_id, author_id, message) values ('${ticket}', '${who}', 'one more thing')`);
  const setStatus = async (ticket: string, status: string) => {
    await as({ id: U.admin, admin: true });
    await db.exec(`update public.tickets set status = '${status}' where id = '${ticket}'`);
  };

  it("people cannot comment on a resolved or closed ticket", async () => {
    for (const status of ["resolved", "closed"]) {
      await setStatus(T_FIN, status);
      for (const who of [U.leadFin, U.leadAll, U.cfo]) {
        await as({ id: who });
        expect(await comment(who, T_FIN)).toMatch(/row-level security/i);
      }
    }
  });

  it("they can comment on every ticket that is still open, in progress or waiting for review", async () => {
    for (const status of ["open", "in_progress", "needs_review"]) {
      await setStatus(T_FIN, status);
      await as({ id: U.leadFin });
      expect(await comment(U.leadFin, T_FIN)).toBeNull();
    }
  });

  it("reopening first, then writing, works", async () => {
    await setStatus(T_FIN, "closed");
    await as({ id: U.leadFin });
    expect(await comment(U.leadFin, T_FIN)).toMatch(/row-level security/i);
    expect((await rows<{ ok: boolean }>(`select public.reopen_ticket('${T_FIN}') as ok`))[0].ok).toBe(true);
    expect(await comment(U.leadFin, T_FIN)).toBeNull();
  });

  it("the owner can still leave a note on a closed ticket", async () => {
    await setStatus(T_FIN, "closed");
    await as({ id: U.admin, admin: true });
    expect(await comment(U.admin, T_FIN)).toBeNull();
  });
});

describe("closing a fixed ticket ('it works')", () => {
  const confirm = async (ticket: string) => (await rows<{ ok: boolean }>(`select public.confirm_ticket_fixed('${ticket}') as ok`))[0].ok;
  const statusOf = async (ticket: string) => (await rows<{ status: string }>(`select status from public.tickets where id = '${ticket}'`))[0]?.status;
  const markFixed = async (ticket: string) => {
    await as({ id: U.admin, admin: true });
    await db.exec(`update public.tickets set status = 'needs_review' where id = '${ticket}'`);
  };

  it("someone with the ticket's folder can close it, and it becomes 'closed'", async () => {
    for (const who of [U.leadFin, U.leadAll, U.multi, U.cfo]) {
      await markFixed(T_FIN);
      await as({ id: who });
      expect(await confirm(T_FIN)).toBe(true);
      expect(await statusOf(T_FIN)).toBe("closed");
    }
  });

  it("a project-wide ticket can be closed by any member of the project", async () => {
    await markFixed(T_ALL);
    await as({ id: U.memberOps });
    expect(await confirm(T_ALL)).toBe(true);
  });

  it("people without that folder, a view-only executive, another company and strangers cannot", async () => {
    await markFixed(T_FIN);
    for (const who of [U.memberOps, U.ceo, U.outsider, U.betaExec, U.nobody]) {
      await as({ id: who });
      expect(await confirm(T_FIN)).toBe(false);
    }
    await as({ id: U.admin, admin: true });
    expect(await statusOf(T_FIN)).toBe("needs_review");
  });

  it("the public key cannot call it at all", async () => {
    await markFixed(T_FIN);
    await as(null);
    expect(await rejection(`select public.confirm_ticket_fixed('${T_FIN}')`)).toMatch(/permission denied/i);
  });

  it("only a ticket waiting for review can be closed this way", async () => {
    for (const status of ["open", "in_progress", "resolved", "closed"]) {
      await as({ id: U.admin, admin: true });
      await db.exec(`update public.tickets set status = '${status}' where id = '${T_FIN}'`);
      await as({ id: U.leadFin });
      expect(await confirm(T_FIN)).toBe(false);
      expect(await statusOf(T_FIN)).toBe(status);
    }
  });

  it("the project log records who closed it, from 'needs review' to 'closed'", async () => {
    await markFixed(T_FIN);
    await as({ id: U.leadFin });
    await confirm(T_FIN);
    const [event] = await rows<{ from_status: string; to_status: string; actor_id: string }>(
      `select from_status, to_status, actor_id from public.project_events
       where kind = 'ticket_status' and ticket_id = '${T_FIN}' and to_status = 'closed'`
    );
    expect(event).toEqual({ from_status: "needs_review", to_status: "closed", actor_id: U.leadFin });
  });
});

describe("the project log is for leaders", () => {
  const visible = async (kind: string) => (await rows(`select 1 from public.project_events where kind = '${kind}'`)).length;
  const asOwner = () => as({ id: U.admin, admin: true });

  /** Finance ticket and Finance plan item both change status, as the owner. */
  async function seedActivity() {
    await asOwner();
    await db.exec(`update public.tickets set status = 'in_progress' where id = '${T_FIN}'`);
    await db.exec(`update public.project_milestones set status = 'completed' where title = 'Invoice automation'`);
  }

  it("leads (project-wide or one folder) and the owner read the plan-progress events of their folders", async () => {
    await seedActivity();
    await asOwner();
    expect(await visible("plan_status")).toBeGreaterThan(0);
    await as({ id: U.leadAll });
    expect(await visible("plan_status")).toBeGreaterThan(0);
    await as({ id: U.leadFin }); // lead of Finance only: Finance's item is visible to them
    expect(await visible("plan_status")).toBeGreaterThan(0);
  });

  it("executives, view-only ones included, read the log", async () => {
    await seedActivity();
    for (const who of [U.cfo, U.ceo]) {
      await as({ id: who });
      expect(await visible("plan_status")).toBeGreaterThan(0);
      expect(await visible("ticket_status")).toBeGreaterThan(0);
    }
  });

  it("a regular member does not get plan-progress events, even from their own folder", async () => {
    await seedActivity();
    await as({ id: U.multi }); // member of Finance + Operations
    expect(await visible("plan_status")).toBe(0);
    await as({ id: U.memberOps });
    expect(await visible("plan_status")).toBe(0);
  });

  it("but a member still sees the history of tickets they can see (so a ticket can show its own story)", async () => {
    await seedActivity();
    await as({ id: U.multi });
    const own = await rows<{ ticket_id: string }>(`select ticket_id from public.project_events where ticket_id = '${T_FIN}'`);
    expect(own.length).toBeGreaterThan(0); // opened, status change, comment
    await as({ id: U.memberOps }); // Operations only: Finance's ticket history stays invisible
    expect(await rows(`select 1 from public.project_events where ticket_id = '${T_FIN}'`)).toHaveLength(0);
  });

  it("people from another company and strangers see nothing of this project's log", async () => {
    await seedActivity();
    for (const who of [U.outsider, U.betaExec, U.nobody]) {
      await as({ id: who });
      expect(await rows(`select 1 from public.project_events where project_id = '${P1}'`)).toHaveLength(0);
    }
  });

  it("records that the owner made a change, without needing anyone to see the owner's profile", async () => {
    await seedActivity();
    await as({ id: U.leadFin });
    const [change] = await rows<{ by_owner: boolean }>(
      `select by_owner from public.project_events where kind = 'ticket_status' and ticket_id = '${T_FIN}'`
    );
    expect(change.by_owner).toBe(true);
    // ...while the owner's own profile stays hidden from this person:
    expect(await rows(`select 1 from public.profiles where id = '${U.admin}'`)).toHaveLength(0);
  });

  it("does not mark a person's own action as the owner's", async () => {
    await asOwner();
    await db.exec(`update public.tickets set status = 'needs_review' where id = '${T_FIN}'`);
    await as({ id: U.leadFin });
    await db.query(`select public.reopen_ticket('${T_FIN}')`);
    const [reopened] = await rows<{ by_owner: boolean; actor_id: string }>(
      `select by_owner, actor_id from public.project_events where kind = 'ticket_status' and ticket_id = '${T_FIN}' and to_status = 'open'`
    );
    expect(reopened).toEqual({ by_owner: false, actor_id: U.leadFin });
  });
});

describe("a team's general information (apart from its problems)", () => {
  const owner = () => as({ id: U.admin, admin: true });
  const seedInfo = async () => {
    await owner();
    await db.exec(`
      update public.project_departments set overview = 'about finance' where project_id = '${P1}' and department_id = '${DEPT_FIN}';
      update public.project_departments set overview = 'about operations' where project_id = '${P1}' and department_id = '${DEPT_OPS}';
      update public.project_departments set overview = 'about hr' where project_id = '${P1}' and department_id = '${DEPT_HR}'`);
  };
  const infoSeenBy = async (who: string) => {
    await as({ id: who });
    return (await rows<{ overview: string }>(`select overview from public.project_departments where project_id = '${P1}' and overview is not null order by 1`)).map(
      (r) => r.overview
    );
  };

  it("each person reads only the teams they can open", async () => {
    await seedInfo();
    expect(await infoSeenBy(U.leadFin)).toEqual(["about finance"]);
    expect(await infoSeenBy(U.memberOps)).toEqual(["about operations"]);
    expect(await infoSeenBy(U.multi)).toEqual(["about finance", "about operations"]);
  });

  it("people with every folder and company executives read every team's", async () => {
    await seedInfo();
    for (const who of [U.leadAll, U.cfo, U.ceo]) expect(await infoSeenBy(who)).toEqual(["about finance", "about hr", "about operations"]);
  });

  it("another company's people and strangers read none, and neither does the public key", async () => {
    await seedInfo();
    for (const who of [U.outsider, U.betaExec, U.nobody]) expect(await infoSeenBy(who)).toEqual([]);
    await as(null);
    expect(await rejection(`select overview from public.project_departments`)).toMatch(/permission denied/i);
  });

  it("only the owner writes it", async () => {
    await seedInfo();
    for (const who of [U.leadAll, U.leadFin, U.memberOps, U.cfo, U.outsider]) {
      await as({ id: who });
      expect(await affected(`update public.project_departments set overview = 'changed' where project_id = '${P1}'`)).toBe(0);
    }
    await owner();
    expect(await rows(`select 1 from public.project_departments where overview = 'changed'`)).toHaveLength(0);
  });
});

describe("a client's office days", () => {
  const owner = () => as({ id: U.admin, admin: true });
  const daysOf = async (project: string) => (await rows<{ d: number[] }>(`select office_weekdays as d from public.projects where id = '${project}'`))[0]?.d;

  it("is Monday to Friday for every project until the owner changes it", async () => {
    await owner();
    expect(await daysOf(P1)).toEqual([1, 2, 3, 4, 5]);
    expect(await daysOf(P2)).toEqual([1, 2, 3, 4, 5]);
  });

  it("the owner can set it, including to nothing (online only)", async () => {
    await owner();
    await db.exec(`update public.projects set office_weekdays = '{1,2,3,4}' where id = '${P1}'`);
    expect(await daysOf(P1)).toEqual([1, 2, 3, 4]);
    await db.exec(`update public.projects set office_weekdays = '{}' where id = '${P1}'`);
    expect(await daysOf(P1)).toEqual([]);
  });

  it("refuses a day that is not a weekday", async () => {
    await owner();
    expect(await rejection(`update public.projects set office_weekdays = '{1,2,7}' where id = '${P1}'`)).toMatch(/check constraint/i);
    expect(await rejection(`update public.projects set office_weekdays = '{-1}' where id = '${P1}'`)).toMatch(/check constraint/i);
  });

  it("nobody but the owner changes it: not a team lead, not a full-access executive, not another company", async () => {
    for (const who of [U.leadAll, U.leadFin, U.memberOps, U.cfo, U.outsider]) {
      await as({ id: who });
      expect(await affected(`update public.projects set office_weekdays = '{1}' where id = '${P1}'`), who).toBe(0);
    }
    await owner();
    expect(await daysOf(P1)).toEqual([1, 2, 3, 4, 5]);
  });

  it("people on the project can read it, and a stranger cannot", async () => {
    await as({ id: U.leadFin });
    expect(await daysOf(P1)).toEqual([1, 2, 3, 4, 5]);
    await as({ id: U.nobody });
    expect(await daysOf(P1)).toBeUndefined();
  });
});

describe("a booking can say which team and problem it is about", () => {
  const book = (department: string | null, milestone: string | null) =>
    `insert into public.meetings (project_id, department_id, milestone_id, guest_name, guest_email, title, timezone, start_time, end_time)
     values ('${P1}', ${department ? `'${department}'` : "null"}, ${milestone ? `(select id from public.project_milestones where title = '${milestone}')` : "null"},
             'x', 'x', 'call', 'UTC', '2026-11-05T16:00Z', '2026-11-05T16:30Z')`;
  const topicOf = async () =>
    (await rows<{ d: string | null; m: string | null }>(`select department_id as d, milestone_id as m from public.meetings`))[0];

  it("saves both, and clears the problem if it is later removed (the meeting stays)", async () => {
    await db.exec("reset role");
    await db.exec(book(DEPT_FIN, "Invoice automation"));
    const saved = await topicOf();
    expect(saved.d).toBe(DEPT_FIN);
    expect(saved.m).not.toBeNull();
    await db.exec(`delete from public.project_milestones where title = 'Invoice automation'`);
    expect(await topicOf()).toEqual({ d: DEPT_FIN, m: null });
    expect(await rows(`select 1 from public.meetings`)).toHaveLength(1);
  });

  it("refuses a team or problem that does not exist", async () => {
    await db.exec("reset role");
    expect(await rejection(`insert into public.meetings (department_id, guest_name, guest_email, title, timezone, start_time, end_time)
      values ('99999999-0000-0000-0000-000000000000', 'x', 'x', 'call', 'UTC', '2026-11-05T16:00Z', '2026-11-05T16:30Z')`)).toMatch(/foreign key/i);
  });

  it("stays unreachable for the browser: nobody but the server reads or writes meetings", async () => {
    await db.exec("reset role");
    await db.exec(book(DEPT_FIN, null));
    for (const who of [U.leadAll, U.leadFin, U.cfo, U.outsider, U.admin]) {
      await as({ id: who, admin: who === U.admin });
      expect(await rejection(`select department_id, milestone_id from public.meetings`)).toMatch(/permission denied/i);
    }
    await as(null);
    expect(await rejection(`select milestone_id from public.meetings`)).toMatch(/permission denied/i);
  });
});

describe("the owner's on-site days", () => {
  const owner = () => as({ id: U.admin, admin: true });
  /** One announced day at each company's project. */
  const seedDays = async () => {
    await owner();
    await db.exec(`
      insert into public.onsite_visits (project_id, visit_date, start_time, end_time) values
        ('${P1}', '2026-11-05', '10:00', '15:30'),
        ('${P2}', '2026-11-05', '09:00', '13:00')`);
  };
  const daysOf = async (who: string) => {
    await as({ id: who });
    return (await rows<{ project_id: string }>(`select project_id from public.onsite_visits order by 1`)).map((r) => r.project_id);
  };

  it("people on a project see that project's days, and only those", async () => {
    await seedDays();
    for (const who of [U.leadAll, U.leadFin, U.memberOps, U.multi]) expect(await daysOf(who)).toEqual([P1]);
  });

  it("a company-wide executive sees the days of their company's projects, view-only ones included", async () => {
    await seedDays();
    expect(await daysOf(U.cfo)).toEqual([P1]);
    expect(await daysOf(U.ceo)).toEqual([P1]);
  });

  it("another company's people see only their own project's day, never this one's", async () => {
    await seedDays();
    expect(await daysOf(U.outsider)).toEqual([P2]);
    expect(await daysOf(U.betaExec)).toEqual([P2]);
  });

  it("a signed-in stranger and the public key see nothing", async () => {
    await seedDays();
    expect(await daysOf(U.nobody)).toEqual([]);
    await as(null);
    expect(await rejection(`select * from public.onsite_visits`)).toMatch(/permission denied/i);
  });

  it("the owner sees every project's days", async () => {
    await seedDays();
    await owner();
    expect(sorted((await rows<{ project_id: string }>(`select project_id from public.onsite_visits`)).map((r) => r.project_id))).toEqual(sorted([P1, P2]));
  });

  it("switching the schedule off hides it from the project's people, but not from the owner", async () => {
    await seedDays();
    await owner();
    await db.exec(`update public.projects set show_onsite_presence = false where id = '${P1}'`);
    expect(await daysOf(U.leadAll)).toEqual([]);
    expect(await daysOf(U.cfo)).toEqual([]);
    await owner();
    expect(await rows(`select 1 from public.onsite_visits where project_id = '${P1}'`)).toHaveLength(1);
    // The other company's project is not affected.
    expect(await daysOf(U.outsider)).toEqual([P2]);
  });

  it("only the owner can announce, change or remove a day: nobody else, a team lead and a full-access executive included", async () => {
    await seedDays();
    for (const who of [U.leadAll, U.leadFin, U.memberOps, U.cfo, U.ceo, U.outsider]) {
      await as({ id: who });
      expect(await rejection(`insert into public.onsite_visits (project_id, visit_date) values ('${P1}', '2026-11-06')`)).toMatch(/row-level security/i);
      expect(await affected(`update public.onsite_visits set end_time = '23:00' where project_id = '${P1}'`)).toBe(0);
      expect(await affected(`delete from public.onsite_visits where project_id = '${P1}'`)).toBe(0);
    }
    await owner();
    expect(await rows(`select 1 from public.onsite_visits`)).toHaveLength(2);
    expect(await affected(`update public.onsite_visits set end_time = '14:00' where project_id = '${P1}'`)).toBe(1);
    expect(await affected(`delete from public.onsite_visits where project_id = '${P1}'`)).toBe(1);
  });

  it("a person cannot give themselves the owner's power through their own account data", async () => {
    await as({ id: U.leadAll, userMetadataAdmin: true });
    expect(await rejection(`insert into public.onsite_visits (project_id, visit_date) values ('${P1}', '2026-11-06')`)).toMatch(/row-level security/i);
  });

  it("a day must end after it starts, and a project has one entry per date", async () => {
    await owner();
    expect(await rejection(`insert into public.onsite_visits (project_id, visit_date, start_time, end_time) values ('${P1}', '2026-11-09', '15:00', '10:00')`)).toMatch(/check constraint/i);
    expect(await rejection(`insert into public.onsite_visits (project_id, visit_date, start_time, end_time) values ('${P1}', '2026-11-09', '10:00', '10:00')`)).toMatch(/check constraint/i);
    await db.exec(`insert into public.onsite_visits (project_id, visit_date) values ('${P1}', '2026-11-09')`);
    expect(await rejection(`insert into public.onsite_visits (project_id, visit_date) values ('${P1}', '2026-11-09')`)).toMatch(/unique|duplicate/i);
    // The same date at another company's project is fine.
    expect(await rejection(`insert into public.onsite_visits (project_id, visit_date) values ('${P2}', '2026-11-09')`)).toBeNull();
  });

  it("new days get the usual hours, and disappear with their project", async () => {
    await owner();
    await db.exec(`insert into public.onsite_visits (project_id, visit_date) values ('${P1}', '2026-11-10')`);
    const [day] = await rows<{ start_time: string; end_time: string }>(`select start_time::text, end_time::text from public.onsite_visits`);
    expect(day).toEqual({ start_time: "10:00:00", end_time: "15:30:00" });
    await db.exec(`delete from public.projects where id = '${P1}'`);
    expect(await rows(`select 1 from public.onsite_visits`)).toHaveLength(0);
  });
});
