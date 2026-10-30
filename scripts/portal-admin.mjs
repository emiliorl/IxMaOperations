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
 *   reset-password <email>                              new one-time password; they must choose their own at next sign-in
 *   invite-link <email> [--locale en|es]                a one-time link that signs them in and lets them choose their own
 *                                                       password (the safest way to onboard someone — no password is shared)
 *   member <projectSlug> <email> [--dept "<name>" ...] [--all] [--role lead|member] [--costs]
 *                                                       which FOLDERS they can open: repeat --dept for several,
 *                                                       or --all (also the default when no --dept is given).
 *                                                       Everyone with --all always sees costs; --costs lets a team
 *                                                       lead (or anyone with only some folders) see them too.
 *   unmember <projectSlug> <email>                      take someone off a project
 *   exec <orgSlug> <email> [--access full|view] [--costs]
 *                                                       company-wide access (CEO / CFO): every project and
 *                                                       folder of that company. full = can also open tickets
 *                                                       and comment (and always sees costs); view = read only,
 *                                                       and sees costs only with --costs. Default full.
 *   unexec <orgSlug> <email>                            revoke company-wide access
 *   milestone <projectSlug> "<Title>" [--dept "<name>"] [--due YYYY-MM-DD]
 *                                     [--status pending|in_progress|completed|blocked] [--order N] [--code FIN-1]
 *                                                       every problem gets an ID (area prefix + number: FIN-1, OPE-2);
 *                                                       one is made for you unless you give --code.
 *   codes <projectSlug> [--dry-run]                     give an ID to every problem that has none (existing IDs never change)
 *   import-plan <projectSlug> <file.json> [--folder "<name>"] [--create-folders] [--dry-run]
 *                                                       load a client's problems (code, priority, action plan,
 *                                                       links, cost) from a JSON file; re-running updates the same
 *                                                       items (matched by code). Prices must be in "cost" only.
 *                                                       An optional "areas" list holds each team's general information
 *                                                       (shown apart from its problems, only to people who can open that folder).
 *                                                       See scripts/plan-import.mjs for the file format.
 *   doctor                                              is this database and machine ready for real clients? (read-only:
 *                                                       migrations applied, owner exists, demo data gone, sign-up off, settings present)
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
import fs from "node:fs";
import { blindIndex, decryptLoose, encryptField, encryptOptional } from "./crypto.mjs";
import { validatePlan } from "./plan-import.mjs";
import { assignMissingCodes, areaPrefix, nextProblemCode } from "./problem-codes.mjs";

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
const BOOLEAN_FLAGS = new Set(["all", "costs", "dry-run", "create-folders"]);
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
/**
 * The next ID for a new problem in an area (FIN-3…), or null if the database has no
 * code column yet (migration 20261029000400_problem_details.sql not run).
 */
async function nextCodeFor(projectId, areaName) {
  const result = await db.from("project_milestones").select("code").eq("project_id", projectId);
  if (result.error) return null;
  return nextProblemCode(areaPrefix(areaName), result.data.map((row) => decryptLoose(row.code)));
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
      // The person must choose their own password before anything else works.
      app_metadata: { must_change_password: true },
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
    console.log(`  They will be asked to choose their own password at first sign-in. Safer still: skip sharing this and run\n    invite-link ${email}\n`);
  },

  async "reset-password"() {
    need(1, "reset-password <email>");
    const profile = await profileByEmail(positional[0]);
    const password = newPassword();
    const { error } = await db.auth.admin.updateUserById(profile.id, { password, app_metadata: { must_change_password: true } });
    if (error) fail(`Resetting password: ${error.message}`);
    console.log(`✓ New password for ${profile.display_name}\n\n    ${password}\n`);
  },

  async rename() {
    need(2, 'rename <email> "<New display name>"');
    const [email, displayName] = positional;
    const profile = await profileByEmail(email);
    must(await db.from("profiles").update({ display_name: encryptField(displayName) }).eq("id", profile.id), "Renaming");
    console.log(`✓ ${profile.display_name} is now called ${displayName}`);
  },

  async "invite-link"() {
    need(1, "invite-link <email> [--locale en|es]");
    const email = positional[0].trim();
    const profile = await profileByEmail(email);
    const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email });
    const token = data?.properties?.hashed_token;
    if (error || !token) fail(`Creating the link: ${error?.message ?? "no token returned"}`);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ixmaoperations.com";
    const link = new URL("/api/portal/auth/confirm", base);
    link.searchParams.set("token_hash", token);
    link.searchParams.set("type", "recovery");
    link.searchParams.set("locale", flags.locale === "es" ? "es" : "en");
    console.log(`✓ Invite link for ${profile.display_name} (works once, expires in about an hour):\n\n    ${link.toString()}\n`);
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
      await db
        .from("project_members")
        .upsert({ project_id: project.id, user_id: profile.id, role, all_departments: allFolders, can_view_costs: flags.costs === true }),
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
    const seesCosts = allFolders || flags.costs === true;
    console.log(
      `✓ ${profile.display_name} → ${project.name} · ${allFolders ? "all folders" : folders.map((f) => f.name).join(", ")} · ${role} · ${seesCosts ? "can see costs" : "no costs"}`
    );
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
    must(
      await db
        .from("organization_members")
        .upsert({ organization_id: org.id, user_id: profile.id, access_level: level, can_view_costs: flags.costs === true }),
      "Saving company-wide access"
    );
    const seesCosts = level === "full" || flags.costs === true;
    console.log(
      `✓ ${profile.display_name} now has ${level === "full" ? "FULL" : "VIEW-ONLY"} company-wide access to ${org.name} · ${seesCosts ? "can see costs" : "no costs"}`
    );
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
    const code = flags.code ?? (await nextCodeFor(project.id, dept?.name ?? null));
    must(
      await db.from("project_milestones").insert({
        project_id: project.id,
        department_id: dept?.id ?? null,
        title: encryptField(positional[1]),
        ...(code ? { code: encryptField(code) } : {}),
        status,
        due_date: flags.due ?? null,
        sort_order: Number(flags.order ?? 0),
        completed_at: status === "completed" ? new Date().toISOString() : null,
      }),
      "Saving milestone"
    );
    console.log(`✓ Milestone ${code ? code + " · " : ""}"${positional[1]}" in ${project.name}`);
  },

  async codes() {
    need(1, "codes <projectSlug> [--dry-run]");
    const dryRun = flags["dry-run"] === true;
    const project = await projectBySlug(positional[0]);
    const read = await db
      .from("project_milestones")
      .select("id,title,code,department_id,sort_order,created_at")
      .eq("project_id", project.id)
      .order("sort_order")
      .order("created_at");
    if (read.error) {
      fail(`Reading plan items: ${read.error.message}\n  (Has migration 20261029000400_problem_details.sql been run in the Supabase SQL editor?)`);
    }
    const names = new Map(
      must(await db.from("departments").select("id,name").eq("organization_id", project.organization_id), "Looking up areas").map((d) => [d.id, decryptLoose(d.name)])
    );
    const items = read.data.map((m) => ({
      id: m.id,
      title: decryptLoose(m.title) ?? "",
      code: decryptLoose(m.code),
      areaName: m.department_id ? (names.get(m.department_id) ?? null) : null,
    }));
    const assigned = assignMissingCodes(items);
    if (assigned.length === 0) return console.log("✓ Every problem already has an ID.");
    for (const { id, code } of assigned) {
      console.log(`  ${dryRun ? "would set" : "set"}  ${code}  ${items.find((item) => item.id === id).title}`);
      if (!dryRun) must(await db.from("project_milestones").update({ code: encryptField(code) }).eq("id", id), `Saving ${code}`);
    }
    console.log(`✓ ${dryRun ? "Would give" : "Gave"} an ID to ${assigned.length} problem${assigned.length === 1 ? "" : "s"}.`);
  },

  async "import-plan"() {
    need(2, 'import-plan <projectSlug> <file.json> [--folder "<name>"] [--create-folders] [--dry-run]');
    const dryRun = flags["dry-run"] === true;

    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(positional[1], "utf8"));
    } catch (error) {
      fail(`Couldn't read ${positional[1]} as JSON: ${error.message}`);
    }
    const checked = validatePlan(raw);
    if (!checked.ok) fail(`The plan file has problems:\n  - ${checked.errors.join("\n  - ")}`);
    const { plan } = checked;

    const project = await projectBySlug(positional[0]);

    // Folders: the file names them per problem; --folder is the default for problems that don't.
    const folderOf = (problem) => problem.folder ?? flags.folder ?? null;
    const wanted = [...new Set([...plan.problems.map(folderOf), ...plan.areas.map((area) => area.folder)].filter(Boolean))];
    const known = must(await db.from("departments").select("id,name").eq("organization_id", project.organization_id), "Looking up folders")
      .map((d) => ({ id: d.id, name: decryptLoose(d.name) }));
    const folderIds = new Map();
    for (const name of wanted) {
      const found = known.find((d) => d.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (found) folderIds.set(name, found.id);
      else if (flags["create-folders"] === true) {
        if (dryRun) folderIds.set(name, null);
        else {
          const created = must(
            await db.from("departments").insert({ organization_id: project.organization_id, name: encryptField(name) }).select("id").single(),
            `Creating folder "${name}"`
          );
          folderIds.set(name, created.id);
        }
      } else {
        fail(`No folder "${name}" in that company. Add --create-folders to create it, or create it with: dept <orgSlug> "${name}"`);
      }
    }

    // What already exists (so re-running updates instead of duplicating).
    const existingResult = await db.from("project_milestones").select("id,title,code").eq("project_id", project.id);
    if (existingResult.error) {
      fail(`Reading existing plan items: ${existingResult.error.message}\n  (Has migration 20261029000400_problem_details.sql been run in the Supabase SQL editor?)`);
    }
    const existing = existingResult.data.map((m) => ({ id: m.id, title: decryptLoose(m.title) ?? "", code: decryptLoose(m.code) }));
    // Codes in use (including ones made below), so a new problem never takes a taken number.
    const takenCodes = existing.map((m) => m.code).filter(Boolean);
    const findExisting = (problem) =>
      problem.code
        ? existing.find((m) => (m.code ?? "").toLowerCase() === problem.code.toLowerCase())
        : existing.find((m) => m.title.trim().toLowerCase() === problem.title.trim().toLowerCase());

    console.log(`${dryRun ? "DRY RUN — nothing will be written. " : ""}Project: ${project.name}`);
    let created = 0;
    let updated = 0;
    for (const problem of plan.problems) {
      const folder = folderOf(problem);
      const match = findExisting(problem);
      // A new problem with no code in the file gets the next ID for its area.
      let code = problem.code ?? match?.code ?? null;
      if (!code) {
        code = nextProblemCode(areaPrefix(folder), takenCodes);
        takenCodes.push(code);
      }
      const label = `${code} · ${problem.title}`;
      const costNote = problem.cost === undefined ? "cost untouched" : problem.cost === null ? "cost removed" : "with cost";
      console.log(`  ${match ? "update" : "create"}  ${label}  [${folder ?? "project-wide"} · ${problem.priority} · ${costNote}]`);
      if (dryRun) {
        match ? updated++ : created++;
        continue;
      }

      if (folder) {
        must(
          await db.from("project_departments").upsert({ project_id: project.id, department_id: folderIds.get(folder) }),
          `Attaching folder "${folder}" to the project`
        );
      }
      const content = {
        department_id: folder ? folderIds.get(folder) : null,
        title: encryptField(problem.title),
        code: encryptField(code),
        priority: problem.priority,
        delivery: encryptOptional(problem.delivery),
        summary: encryptOptional(problem.summary),
        solution: encryptOptional(problem.solution),
        resources: problem.links.length > 0 ? encryptField(JSON.stringify(problem.links)) : null,
        due_date: problem.due,
        sort_order: problem.order,
      };

      let id;
      if (match) {
        // Progress belongs to the portal once an item exists, so a re-import never resets its status.
        must(await db.from("project_milestones").update(content).eq("id", match.id), `Updating ${label}`);
        id = match.id;
        updated++;
      } else {
        const inserted = must(
          await db
            .from("project_milestones")
            .insert({
              ...content,
              project_id: project.id,
              status: problem.status,
              completed_at: problem.status === "completed" ? new Date().toISOString() : null,
            })
            .select("id")
            .single(),
          `Creating ${label}`
        );
        id = inserted.id;
        created++;
      }

      if (problem.cost === null) {
        must(await db.from("problem_costs").delete().eq("milestone_id", id), `Removing cost of ${label}`);
      } else if (problem.cost !== undefined) {
        must(await db.from("problem_costs").upsert({ milestone_id: id, cost_note: encryptField(problem.cost) }), `Saving cost of ${label}`);
      }
    }

    if (plan.overview !== null) {
      console.log("  overview  " + (dryRun ? "would be set" : "set"));
      if (!dryRun) must(await db.from("projects").update({ overview: encryptField(plan.overview) }).eq("id", project.id), "Saving the overview");
    }
    // Each team's general information lives on the area (not on a problem), so only people who can open that area read it.
    for (const area of plan.areas) {
      console.log(`  team info  ${area.folder}  ${dryRun ? "would be set" : "set"}`);
      if (dryRun) continue;
      const saved = await db.from("project_departments").upsert({
        project_id: project.id,
        department_id: folderIds.get(area.folder),
        overview: encryptField(area.overview),
      });
      if (saved.error) {
        console.error(`✗ Team information for "${area.folder}" was not saved: ${saved.error.message}\n  (Has migration 20261029001500_area_info.sql been run in the Supabase SQL editor? Run it, then re-run this command.)`);
        process.exitCode = 1;
        break;
      }
    }
    console.log(`✓ ${dryRun ? "Would create" : "Created"} ${created}, ${dryRun ? "would update" : "updated"} ${updated}.`);
  },

  /**
   * Is this database and this machine ready for real clients? Read-only: it asks, it never changes anything.
   * Run it after applying migrations and before the first invite.
   */
  async doctor() {
    const rows = [];
    const ok = (name) => rows.push(["✓", name]);
    const bad = (name, fix) => rows.push(["✗", `${name}\n      → ${fix}`]);
    const warn = (name, note) => rows.push(["!", `${name}\n      → ${note}`]);
    const column = async (table, col) => !(await db.from(table).select(col).limit(1)).error;
    const rpcExists = async (name, args) => {
      const { error } = await db.rpc(name, args);
      return !(error && /could not find the function|does not exist/i.test(error.message));
    };
    const nothing = "00000000-0000-0000-0000-000000000000";

    // --- the database: each migration leaves something behind that can be asked about
    const migrations = [
      ["20261029000400_problem_details.sql", () => column("project_milestones", "code")],
      ["20261029000500_project_log.sql", () => column("project_events", "kind")],
      ["20261029000600_reopen_ticket.sql", () => rpcExists("reopen_ticket", { p_ticket: nothing })],
      ["20261029000700_confirm_ticket_fixed.sql", () => rpcExists("confirm_ticket_fixed", { p_ticket: nothing })],
      ["20261029000800_leader_logs.sql", () => rpcExists("is_project_leader", { p_project: nothing })],
      ["20261029001000_email_notifications.sql", () => column("profiles", "notify_email")],
      ["20261029001100_preferences.sql", () => column("profiles", "notify_replies")],
      ["20261029001400_onsite_visits.sql", () => column("onsite_visits", "visit_date")],
      ["20261029001500_area_info.sql", () => column("project_departments", "overview")],
      ["20261029001600_meeting_topic.sql", () => column("meetings", "milestone_id")],
    ];
    for (const [file, check] of migrations) {
      (await check().catch(() => false)) ? ok(`migration ${file}`) : bad(`migration ${file} is not applied`, `run supabase/migrations/${file} in the Supabase SQL editor`);
    }
    // Policies can't be read from outside, so these two can only be reminded about. Both are safe to run twice.
    warn("migration 20261029000900_closed_tickets.sql (closed tickets take no comments)", "can't be checked from here; if unsure, run it: it is safe to run twice");
    (await column("profiles", "phone")) || (await column("profiles", "notify_whatsapp"))
      ? bad("the dropped WhatsApp columns are still there", "run supabase/migrations/20261029001300_remove_whatsapp.sql")
      : ok("no leftover WhatsApp columns");

    // --- storage, owner, sign-up
    const bucket = await db.storage.getBucket("ticket-attachments");
    !bucket.data ? bad('storage bucket "ticket-attachments" is missing', "create it (private) in Supabase -> Storage") : bucket.data.public ? bad("the attachments bucket is PUBLIC", "make it private in Supabase -> Storage") : ok("attachments bucket exists and is private");

    const users = (await db.auth.admin.listUsers({ perPage: 200 })).data?.users ?? [];
    const owners = users.filter((u) => u.app_metadata?.role === "admin");
    owners.length === 0 ? bad("nobody is the owner", "node --env-file=.env.local scripts/portal-admin.mjs make-admin you@yourdomain.com") : ok(`${owners.length} owner login${owners.length === 1 ? "" : "s"}`);
    const demo = users.filter((u) => /@demo-co\.test$/i.test(u.email ?? ""));
    demo.length > 0 ? warn(`${demo.length} demo login(s) still exist`, "node --env-file=.env.local scripts/seed-demo.mjs --wipe") : ok("no demo logins");
    const demoOrg = must(await db.from("organizations").select("id").eq("slug", "demo-co").maybeSingle(), "Looking for the demo company");
    demoOrg ? warn("the demo company still exists", "node --env-file=.env.local scripts/seed-demo.mjs --wipe") : ok("no demo company");

    try {
      const settings = await (await fetch(`${url}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" } })).json();
      settings.disable_signup === true ? ok("public sign-up is off") : bad("public sign-up is ON", "Supabase -> Authentication -> turn OFF \"Allow new users to sign up\"");
    } catch {
      warn("couldn't read the sign-up setting", "check Supabase -> Authentication by hand");
    }

    // --- this machine's settings. Vercel has its own copy of each: they must be set there too.
    const set = (name) => Boolean(process.env[name]);
    for (const [name, why] of [
      ["DATA_ENCRYPTION_KEY", "encrypts every personal field; lose it and that data is gone, so keep a backup"],
      ["RESEND_API_KEY", "sends email"],
      ["OWNER_EMAIL", "where your alerts go"],
      ["UPSTASH_REDIS_REST_URL", "login rate limiting: with none, sign-in is REFUSED in production"],
      ["UPSTASH_REDIS_REST_TOKEN", "login rate limiting: with none, sign-in is REFUSED in production"],
    ]) {
      set(name) ? ok(`${name} is set here`) : bad(`${name} is not set here`, why);
    }
    set("CRON_SECRET") ? ok("CRON_SECRET is set here") : warn("CRON_SECRET is not set here", "set it on Vercel or the morning digest never runs");
    set("PORTAL_EMAIL_FROM")
      ? ok("PORTAL_EMAIL_FROM is set here")
      : warn("PORTAL_EMAIL_FROM is not set here", "emails use Resend's sandbox sender: yours arrive, clients' do not. Verify a domain in Resend, then set it (on Vercel too)");
    /localhost|127\./.test(process.env.NEXT_PUBLIC_APP_URL ?? "")
      ? warn("NEXT_PUBLIC_APP_URL is localhost here", "fine for development: links in emails and invites already use the real site. On Vercel it should be your real address")
      : ok("NEXT_PUBLIC_APP_URL is not localhost here");

    console.log("");
    for (const [mark, text] of rows) console.log(`${mark} ${text}`);
    const failed = rows.filter(([mark]) => mark === "✗").length;
    const warned = rows.filter(([mark]) => mark === "!").length;
    console.log(`\n${failed === 0 ? "✓" : "✗"} ${failed} problem${failed === 1 ? "" : "s"}, ${warned} thing${warned === 1 ? "" : "s"} to check.`);
    console.log("Checks about settings are for THIS machine's .env.local. Vercel keeps its own copy of each: set them there too.");
    if (failed > 0) process.exit(1);
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
        await db.from("organization_members").select("*,profiles(display_name,email)").eq("organization_id", org.id),
        "Listing company-wide access"
      );
      for (const e of execs) {
        const who = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
        console.log(`  ★ ${decryptLoose(who?.display_name)} <${decryptLoose(who?.email)}> · company-wide · ${e.access_level === "full" ? "full access" : "view only"}${e.access_level === "full" || e.can_view_costs ? " · costs" : ""}`);
      }
      const projects = must(await db.from("projects").select("id,name,slug,office_address").eq("organization_id", org.id), "Listing projects");
      for (const project of projects) {
        console.log(`  ▸ ${decryptLoose(project.name)}  [${project.slug}]${project.office_address ? `  @ ${decryptLoose(project.office_address)}` : ""}`);
        const members = must(
          await db.from("project_members").select("*,profiles(display_name,email)").eq("project_id", project.id),
          "Listing members"
        );
        const folders = must(
          await db.from("project_member_departments").select("user_id,department_id").eq("project_id", project.id),
          "Listing folders"
        );
        const deptNames = new Map(
          must(await db.from("departments").select("id,name").eq("organization_id", org.id), "Listing department names").map((d) => [d.id, decryptLoose(d.name)])
        );
        for (const m of members) {
          const who = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
          const names = folders
            .filter((f) => f.user_id === m.user_id)
            .map((f) => deptNames.get(f.department_id))
            .filter(Boolean);
          const scope = m.all_departments ? "all folders" : names.length ? names.join(", ") : "project-wide items only";
          console.log(`      - ${decryptLoose(who?.display_name)} <${decryptLoose(who?.email)}> · ${scope} · ${m.role}${m.all_departments || m.can_view_costs ? " · costs" : ""}`);
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
