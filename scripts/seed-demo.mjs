/**
 * scripts/seed-demo.mjs — a throwaway demo company so you can click through the
 * portal as every kind of person before real clients exist.
 *
 *   node --env-file=.env.local scripts/seed-demo.mjs          create the demo
 *   node --env-file=.env.local scripts/seed-demo.mjs --wipe   remove the demo (and nothing else)
 *
 * Creates company "Demo Co" with one project and three folders (Finance,
 * Operations, HR), a plan with items in each folder, and six people:
 *
 *   ana    all folders (project lead)        fede   Finance only
 *   marta  Finance + Operations              omar   Operations only
 *   carla  CFO — company-wide FULL access    cesar  CEO — company-wide VIEW-ONLY
 *
 * Everything is stored encrypted, exactly like real data (it goes through
 * scripts/portal-admin.mjs). Each login gets a one-time password printed ONCE.
 *
 * IMPORTANT: your local app and your live site use the SAME Supabase project,
 * so demo accounts exist for the live site too once it is deployed. Run
 * `--wipe` before you take the portal live.
 *
 * Your own owner login is separate and permanent (it is not part of the demo):
 *   node --env-file=.env.local scripts/portal-admin.mjs user you@yourdomain.com "Your Name"
 *   node --env-file=.env.local scripts/portal-admin.mjs make-admin you@yourdomain.com
 */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// Real-looking names: the role is NOT part of the name (it would show up in the portal header and on every ticket).
// It is listed in the summary printed at the end instead.
const DEMO_PEOPLE = [
  ["ana@demo-co.test", "Ana Morales", "team lead, all areas (sees the project log)"],
  ["fede@demo-co.test", "Fede Castellanos", "team lead, Finance only (sees the project log)"],
  ["marta@demo-co.test", "Marta Vega", "member, Finance + Operations (no project log)"],
  ["omar@demo-co.test", "Omar Ríos", "member, Operations only (no project log)"],
  ["carla@demo-co.test", "Carla Méndez", "CFO, company-wide full access"],
  ["cesar@demo-co.test", "César Soto", "CEO, company-wide view only"],
];

const cli = (...args) =>
  execFileSync(process.execPath, ["--env-file=.env.local", "scripts/portal-admin.mjs", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

function run(...args) {
  try {
    const out = cli(...args);
    const line = out.split("\n").find((l) => l.includes("✓"));
    console.log(line ?? out.trim());
    return out;
  } catch (error) {
    const message = `${error.stdout ?? ""}${error.stderr ?? ""}`.split("\n").find((l) => l.includes("✗")) ?? String(error.message);
    console.error(message);
    console.error("\nStopped. If it mentions a missing column or table, run the SQL files in supabase/migrations/ in order.");
    process.exit(1);
  }
}

if (process.argv.includes("--wipe")) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const org = await db.from("organizations").select("id").eq("slug", "demo-co").maybeSingle();
  if (org.data) {
    const del = await db.from("organizations").delete().eq("id", org.data.id);
    console.log(del.error ? `✗ ${del.error.message}` : "✓ Company demo-co removed (projects, folders, plan, tickets, access)");
  } else console.log("✓ No demo company found");
  const emails = new Set(DEMO_PEOPLE.map(([email]) => email));
  const { data } = await db.auth.admin.listUsers({ perPage: 200 });
  let removed = 0;
  for (const user of data?.users ?? []) if (emails.has(user.email)) removed += (await db.auth.admin.deleteUser(user.id)).error ? 0 : 1;
  console.log(`✓ ${removed} demo login(s) removed. Your own login and any real data were not touched.`);
  process.exit(0);
}

console.log("Creating the demo company…\n");
run("org", "demo-co", "Demo Co");
for (const dept of ["Finance", "Operations", "HR"]) run("dept", "demo-co", dept);
run("project", "demo-co", "demo-automation", "Demo Automation", "--office", "Av. Reforma 100, Ciudad de México", "--office-label", "Demo Co HQ", "--description", "Automating invoicing, warehouse sync and payroll across three teams.");
for (const dept of ["Finance", "Operations", "HR"]) run("project-dept", "demo-automation", dept);
run("milestone", "demo-automation", "Kickoff and access", "--due", "2026-11-02", "--status", "completed", "--order", "1");
run("milestone", "demo-automation", "Invoice automation", "--dept", "Finance", "--due", "2026-11-20", "--status", "in_progress", "--order", "2");
run("milestone", "demo-automation", "Warehouse stock sync", "--dept", "Operations", "--due", "2026-12-04", "--order", "3");
run("milestone", "demo-automation", "Payroll integration", "--dept", "HR", "--due", "2026-12-18", "--order", "4");
run("milestone", "demo-automation", "Executive dashboard", "--due", "2026-12-30", "--order", "5");

console.log("\nCreating the people…\n");
const passwords = [];
for (const [email, name] of DEMO_PEOPLE) {
  const out = run("user", email, name);
  passwords.push([email, out.split("\n").map((l) => l.trim()).filter(Boolean).at(-1)]);
}
run("member", "demo-automation", "ana@demo-co.test", "--all", "--role", "lead");
run("member", "demo-automation", "fede@demo-co.test", "--dept", "Finance", "--role", "lead");
run("member", "demo-automation", "marta@demo-co.test", "--dept", "Finance", "--dept", "Operations");
run("member", "demo-automation", "omar@demo-co.test", "--dept", "Operations");
run("exec", "demo-co", "carla@demo-co.test", "--access", "full");
run("exec", "demo-co", "cesar@demo-co.test", "--access", "view");

console.log("\n  One-time passwords (shown once; sign in at /portal/login):\n");
const roleOf = new Map(DEMO_PEOPLE.map(([email, name, role]) => [email, `${name} — ${role}`]));
for (const [email, password] of passwords) console.log(`    ${email.padEnd(22)} ${password}   ${roleOf.get(email)}`);
console.log("\n  Remove all of this later with:  node --env-file=.env.local scripts/seed-demo.mjs --wipe\n");
