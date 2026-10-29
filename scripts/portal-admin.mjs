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
 *   member <projectSlug> <email> [--dept "<name>" ...] [--all] [--role lead|member]
 *                                                       which FOLDERS they can open: repeat --dept for several,
 *                                                       or --all (also the default when no --dept is given)
 *   unmember <projectSlug> <email>                      take someone off a project
 *   exec <orgSlug> <email> [--access full|view]         company-wide access (CEO / CFO): every project and
 *                                                       folder of that company. full = can also open tickets
 *                                                       and comment; view = read only. Default full.
 *   unexec <orgSlug> <email>                            revoke company-wide access
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
 *   member acme-automation luis@acme.com --dept "Finance" --dept "Operations"   (two folders)
 *   user carla@acme.com "Carla Ruiz"
 *   exec acme carla@acme.com --access full                                     (the CFO sees everything)
 *   milestone acme-automation "Kickoff and access" --due 2026-11-15
 *
 * Everything here can also be changed later from the portal itself, in the
 * "Access" panel at the bottom of a project page while signed in as the owner.
 *
 * Everything this tool stores is ENCRYPTED with DATA_ENCRYPTION_KEY (the same key the app uses, so
 * it must be in .env.local): names, descriptions, addresses, plan titles, people's names and emails.
 * People are looked up by a keyed one-way fingerprint of their email, never by a readable column.
 *
 * Before the first client: Supabase dashboard -> Authentication -> turn OFF
 * "Allow new users to sign up" so accounts only exist when you create them.
 */
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { blindIndex, decryptLoose, encryptField, encryptOptional } from "./crypto.mjs";

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
const multi = {}; // repeated flags, e.g. --dept "A" --dept "B"
const BOOLEAN_FLAGS = new Set(["all"]);
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith("--")) {
    positional.push(rest[i]);
    continue;
  }
  const name = rest[i].slice(2);
  if (BOOLEAN_FLAGS.has(name)) {
    flags[name] = true;
    continue;
  }
  const value = rest[++i];
  flags[name] = value;
  (multi[name] ??= []).push(value);
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
  return { ...org, name: decryptLoose(org.name) };
}
async function projectBySlug(slug) {
  const project = must(await db.from("projects").select("id,name,organization_id").eq("slug", slug).maybeSingle(), "Looking up project");
  if (!project) fail(`No project with slug "${slug}".`);
  return { ...project, name: decryptLoose(project.name) };
}
async function departmentByName(organizationId, name) {
  // Names are encrypted, so compare after decrypting (a company has only a handful).
  const all = must(await db.from("departments").select("id,name").eq("organization_id", organizationId), "Looking up department");
  const wanted = name.trim().toLowerCase();
  const dept = all.map((d) => ({ id: d.id, name: decryptLoose(d.name) })).find((d) => d.name.trim().toLowerCase() === wanted);
  if (!dept) fail(`No department "${name}" in that company. Create it with: dept <orgSlug> "${name}"`);
  return dept;
}
async function profileByEmail(email) {
  const profile = must(await db.from("profiles").select("id,display_name").eq("email_hash", blindIndex(email)).maybeSingle(), "Looking up user");
  if (!profile) fail(`No portal user with email ${email}. Create one with: user ${email} "<Display name>"`);
  return { ...profile, display_name: decryptLoose(profile.display_name) };
}

const commands = {
  async org() {
    need(2, 'org <slug> "<Company name>"');
    const [slug, name] = positional;
    must(await db.from("organizations").upsert({ slug, name: encryptField(name) }, { onConflict: "slug" }), "Saving company");
    console.log(`✓ Company "${name}" (${slug})`);
  },

  async dept() {
    need(2, 'dept <orgSlug> "<Department name>"');
    const org = await orgBySlug(positional[0]);
    const existing = must(await db.from("departments").select("name").eq("organization_id", org.id), "Checking departments");
    if (existing.some((d) => decryptLoose(d.name).trim().toLowerCase() === positional[1].trim().toLowerCase())) {
      return console.log(`✓ Department "${positional[1]}" already exists in ${org.name}`);
    }
    must(await db.from("departments").insert({ organization_id: org.id, name: encryptField(positional[1]) }), "Saving department");
    console.log(`✓ Department "${positional[1]}" in ${org.name}`);
  },

  async project() {
    need(3, 'project <orgSlug> <slug> "<Project name>" [--office "<address>"]');
    const org = await orgBySlug(positional[0]);
    const row = {
      organization_id: org.id,
      slug: positional[1],
      name: encryptField(positional[2]),
      ...(flags.office && { office_address: encryptField(flags.office) }),
      ...(flags["office-label"] && { office_label: encryptField(flags["office-label"]) }),
      ...(flags.description && { description: encryptField(flags.description) }),
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
      // No display name here: Supabase keeps user_metadata readable, so the name lives only in the encrypted profile.
    });
    if (error) fail(`Creating user: ${error.message}${/already/i.test(error.message) ? " (use reset-password to issue a new password)" : ""}`);
    must(
      await db.from("profiles").upsert({
        id: data.user.id,
        display_name: encryptField(displayName),
        email: encryptField(email),
        email_hash: blindIndex(email),
      }),
      "Saving profile"
    );
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
    need(2, 'member <projectSlug> <email> [--dept "<name>" ...] [--all] [--role lead|member]');
    const role = flags.role ?? "member";
    if (!["lead", "member"].includes(role)) fail('--role must be "lead" or "member".');
    const project = await projectBySlug(positional[0]);
    const profile = await profileByEmail(positional[1]);

    const names = multi.dept ?? [];
    const allFolders = flags.all === true || names.length === 0; // no folders named = every folder
    const folders = allFolders ? [] : await Promise.all(names.map((n) => departmentByName(project.organization_id, n)));

    must(
      await db.from("project_members").upsert({ project_id: project.id, user_id: profile.id, role, all_departments: allFolders }),
      "Adding to project"
    );
    // Replace the folder list wholesale (a failure here leaves fewer folders, never more).
    must(await db.from("project_member_departments").delete().eq("project_id", project.id).eq("user_id", profile.id), "Clearing old folders");
    if (folders.length > 0) {
      must(
        await db.from("project_member_departments").insert(folders.map((f) => ({ project_id: project.id, user_id: profile.id, department_id: f.id }))),
        "Granting folders (is each department attached to the project? use project-dept)"
      );
    }
    console.log(`✓ ${profile.display_name} → ${project.name} · ${allFolders ? "all folders" : folders.map((f) => f.name).join(", ")} · ${role}`);
  },

  async unmember() {
    need(2, "unmember <projectSlug> <email>");
    const project = await projectBySlug(positional[0]);
    const profile = await profileByEmail(positional[1]);
    must(await db.from("project_members").delete().eq("project_id", project.id).eq("user_id", profile.id), "Removing from project");
    console.log(`✓ ${profile.display_name} removed from ${project.name} (their folder access went with them)`);
  },

  async exec() {
    need(2, "exec <orgSlug> <email> [--access full|view]");
    const level = flags.access ?? "full";
    if (!["full", "view"].includes(level)) fail('--access must be "full" or "view".');
    const org = await orgBySlug(positional[0]);
    const profile = await profileByEmail(positional[1]);
    must(await db.from("organization_members").upsert({ organization_id: org.id, user_id: profile.id, access_level: level }), "Saving company-wide access");
    console.log(`✓ ${profile.display_name} now has ${level === "full" ? "FULL" : "VIEW-ONLY"} company-wide access to ${org.name}`);
  },

  async unexec() {
    need(2, "unexec <orgSlug> <email>");
    const org = await orgBySlug(positional[0]);
    const profile = await profileByEmail(positional[1]);
    must(await db.from("organization_members").delete().eq("organization_id", org.id).eq("user_id", profile.id), "Revoking company-wide access");
    console.log(`✓ ${profile.display_name} no longer has company-wide access to ${org.name}`);
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
        title: encryptField(positional[1]),
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
      console.log(`\n${decryptLoose(org.name)}  [${org.slug}]`);
      const execs = must(
        await db.from("organization_members").select("access_level,profiles(display_name,email)").eq("organization_id", org.id),
        "Listing company-wide access"
      );
      for (const e of execs) {
        const who = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
        console.log(`  ★ ${decryptLoose(who?.display_name)} <${decryptLoose(who?.email)}> · company-wide · ${e.access_level === "full" ? "full access" : "view only"}`);
      }
      const projects = must(await db.from("projects").select("id,name,slug,office_address").eq("organization_id", org.id), "Listing projects");
      for (const project of projects) {
        console.log(`  ▸ ${decryptLoose(project.name)}  [${project.slug}]${project.office_address ? `  @ ${decryptLoose(project.office_address)}` : ""}`);
        const members = must(
          await db.from("project_members").select("user_id,role,all_departments,profiles(display_name,email)").eq("project_id", project.id),
          "Listing members"
        );
        const folders = must(
          await db.from("project_member_departments").select("user_id,departments(name)").eq("project_id", project.id),
          "Listing folders"
        );
        for (const m of members) {
          const who = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          const names = folders
            .filter((f) => f.user_id === m.user_id)
            .map((f) => decryptLoose((Array.isArray(f.departments) ? f.departments[0] : f.departments)?.name))
            .filter(Boolean);
          const scope = m.all_departments ? "all folders" : names.length ? names.join(", ") : "project-wide items only";
          console.log(`      - ${decryptLoose(who?.display_name)} <${decryptLoose(who?.email)}> · ${scope} · ${m.role}`);
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
