/**
 * scripts/portal-admin.mjs — owner-only setup tool for the client portal.
 *
 * There is no public sign-up: YOU create each company, project, department and
 * person with this script (it uses the secret key, so it bypasses row-level
 * security — run it only on your own machine, never deploy it).
 *
 *   node --env-file=.env.local scripts/portal-admin.mjs <command> ...
 *
 * Commands (quote anything with spaces):
 *   org <slug> "<Company name>"
 *   dept <orgSlug> "<Department name>"
 *   project <orgSlug> <slug> "<Project name>" [--office "<address>"] [--office-label "<label>"] [--description "<text>"]
 *   project-dept <projectSlug> "<Department name>"      attach a department to a project
 *   user <email> "<Display name>"                       create a login; prints a one-time password
 *   reset-password <email>                              new one-time password for an existing user
 *   member <projectSlug> <email> [--dept "<name>"] [--role lead|member]
 *                                                       no --dept = project-wide access
 *   milestone <projectSlug> "<Title>" [--dept "<name>"] [--due YYYY-MM-DD]
 *                                     [--status pending|in_progress|completed|blocked] [--order N]
 *   make-admin <email>                                  mark yourself as the owner (sign in again afterwards)
 *   list                                                show companies, projects and who can see them
 *
 * Example — a company with a Finance and an Operations team lead:
 *   org acme "Acme Corp"
 *   dept acme "Finance"
 *   dept acme "Operations"
 *   project acme acme-automation "Acme Automation" --office "Av. Reforma 100, CDMX"
 *   project-dept acme-automation "Finance"
 *   project-dept acme-automation "Operations"
 *   user ana@acme.com "Ana Pérez"
 *   member acme-automation ana@acme.com --dept "Finance" --role lead
 *   milestone acme-automation "Kickoff and access" --due 2026-11-15
 *
 * Before the first client: Supabase dashboard -> Authentication -> turn OFF
 * "Allow new users to sign up" so accounts only exist when you create them.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY missing. Run with: node --env-file=.env.local scripts/portal-admin.mjs <command>");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const [command, ...rest] = process.argv.slice(2);
const positional = [];
const flags = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) flags[rest[i].slice(2)] = rest[++i];
  else positional.push(rest[i]);
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}
function need(count, usage) {
  if (positional.length < count) fail(`Usage: ${usage}`);
}
function must({ data, error }, what) {
  if (error) fail(`${what}: ${error.message}`);
  return data;
}
const newPassword = () => crypto.randomBytes(15).toString("base64url");

async function orgBySlug(slug) {
  const org = must(await db.from("organizations").select("id,name").eq("slug", slug).maybeSingle(), "Looking up company");
  if (!org) fail(`No company with slug "${slug}". Create it with: org ${slug} "<Name>"`);
  return org;
}
async function projectBySlug(slug) {
  const project = must(await db.from("projects").select("id,name,organization_id").eq("slug", slug).maybeSingle(), "Looking up project");
  if (!project) fail(`No project with slug "${slug}".`);
  return project;
}
async function departmentByName(organizationId, name) {
  const dept = must(
    await db.from("departments").select("id,name").eq("organization_id", organizationId).ilike("name", name).maybeSingle(),
    "Looking up department"
  );
  if (!dept) fail(`No department "${name}" in that company. Create it with: dept <orgSlug> "${name}"`);
  return dept;
}
async function profileByEmail(email) {
  const profile = must(await db.from("profiles").select("id,display_name").ilike("email", email).maybeSingle(), "Looking up user");
  if (!profile) fail(`No portal user with email ${email}. Create one with: user ${email} "<Display name>"`);
  return profile;
}

const commands = {
  async org() {
    need(2, 'org <slug> "<Company name>"');
    const [slug, name] = positional;
    must(await db.from("organizations").upsert({ slug, name }, { onConflict: "slug" }), "Saving company");
    console.log(`✓ Company "${name}" (${slug})`);
  },

  async dept() {
    need(2, 'dept <orgSlug> "<Department name>"');
    const org = await orgBySlug(positional[0]);
    must(await db.from("departments").upsert({ organization_id: org.id, name: positional[1] }, { onConflict: "organization_id,name" }), "Saving department");
    console.log(`✓ Department "${positional[1]}" in ${org.name}`);
  },

  async project() {
    need(3, 'project <orgSlug> <slug> "<Project name>" [--office "<address>"]');
    const org = await orgBySlug(positional[0]);
    const row = {
      organization_id: org.id,
      slug: positional[1],
      name: positional[2],
      ...(flags.office && { office_address: flags.office }),
      ...(flags["office-label"] && { office_label: flags["office-label"] }),
      ...(flags.description && { description: flags.description }),
    };
    must(await db.from("projects").upsert(row, { onConflict: "slug" }), "Saving project");
    console.log(`✓ Project "${positional[2]}" (${positional[1]}) for ${org.name}`);
  },

  async "project-dept"() {
    need(2, 'project-dept <projectSlug> "<Department name>"');
    const project = await projectBySlug(positional[0]);
    const dept = await departmentByName(project.organization_id, positional[1]);
    must(await db.from("project_departments").upsert({ project_id: project.id, department_id: dept.id }), "Attaching department");
    console.log(`✓ ${dept.name} now takes part in ${project.name}`);
  },

  async user() {
    need(2, 'user <email> "<Display name>"');
    const [email, displayName] = positional;
    const password = newPassword();
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (error) fail(`Creating user: ${error.message}${/already/i.test(error.message) ? " (use reset-password to issue a new password)" : ""}`);
    must(await db.from("profiles").upsert({ id: data.user.id, display_name: displayName, email }), "Saving profile");
    console.log(`✓ User ${displayName} <${email}>`);
    console.log(`\n  One-time password (share it privately; it is not stored anywhere):\n\n    ${password}\n`);
  },

  async "reset-password"() {
    need(1, "reset-password <email>");
    const profile = await profileByEmail(positional[0]);
    const password = newPassword();
    const { error } = await db.auth.admin.updateUserById(profile.id, { password });
    if (error) fail(`Resetting password: ${error.message}`);
    console.log(`✓ New password for ${profile.display_name}\n\n    ${password}\n`);
  },

  async member() {
    need(2, 'member <projectSlug> <email> [--dept "<name>"] [--role lead|member]');
    const role = flags.role ?? "member";
    if (!["lead", "member"].includes(role)) fail('--role must be "lead" or "member".');
    const project = await projectBySlug(positional[0]);
    const profile = await profileByEmail(positional[1]);
    const dept = flags.dept ? await departmentByName(project.organization_id, flags.dept) : null;
    must(
      await db.from("project_members").upsert({ project_id: project.id, user_id: profile.id, department_id: dept?.id ?? null, role }),
      "Adding to project (is the department attached to the project? use project-dept)"
    );
    console.log(`✓ ${profile.display_name} → ${project.name} · ${dept ? dept.name : "project-wide"} · ${role}`);
  },

  async milestone() {
    need(2, 'milestone <projectSlug> "<Title>" [--dept "<name>"] [--due YYYY-MM-DD]');
    const project = await projectBySlug(positional[0]);
    const dept = flags.dept ? await departmentByName(project.organization_id, flags.dept) : null;
    if (flags.due && !/^\d{4}-\d{2}-\d{2}$/.test(flags.due)) fail("--due must look like 2026-11-15");
    const status = flags.status ?? "pending";
    must(
      await db.from("project_milestones").insert({
        project_id: project.id,
        department_id: dept?.id ?? null,
        title: positional[1],
        status,
        due_date: flags.due ?? null,
        sort_order: Number(flags.order ?? 0),
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }),
      "Saving milestone"
    );
    console.log(`✓ Milestone "${positional[1]}" in ${project.name}`);
  },

  async "make-admin"() {
    need(1, "make-admin <email>");
    const profile = await profileByEmail(positional[0]);
    const { error } = await db.auth.admin.updateUserById(profile.id, { app_metadata: { role: "admin" } });
    if (error) fail(`Making admin: ${error.message}`);
    console.log(`✓ ${profile.display_name} is now the owner. Sign out and in again so the new permission takes effect.`);
  },

  async list() {
    const orgs = must(await db.from("organizations").select("id,name,slug").order("name"), "Listing companies");
    if (orgs.length === 0) return console.log("(no companies yet)");
    for (const org of orgs) {
      console.log(`\n${org.name}  [${org.slug}]`);
      const projects = must(await db.from("projects").select("id,name,slug,office_address").eq("organization_id", org.id), "Listing projects");
      for (const project of projects) {
        console.log(`  ▸ ${project.name}  [${project.slug}]${project.office_address ? `  @ ${project.office_address}` : ""}`);
        const members = must(
          await db.from("project_members").select("role,departments(name),profiles(display_name,email)").eq("project_id", project.id),
          "Listing members"
        );
        for (const m of members) {
          const dept = Array.isArray(m.departments) ? m.departments[0] : m.departments;
          const who = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          console.log(`      - ${who?.display_name} <${who?.email}> · ${dept?.name ?? "project-wide"} · ${m.role}`);
        }
      }
    }
  },
};

if (!command || !commands[command]) {
  console.error(`Unknown or missing command.\n\nCommands: ${Object.keys(commands).join(", ")}\nSee the header of scripts/portal-admin.mjs for usage and an example.`);
  process.exit(1);
}
console.log(`(project: ${new URL(url).host})`);
await commands[command]();
