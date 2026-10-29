/**
 * scripts/plan-import.mjs — checks and normalises a client's plan file before
 * `portal-admin.mjs import-plan` writes it. Pure (no database, no secrets) so
 * it can be tested; see lib/portal/plan-import.test.ts.
 *
 * File format (JSON):
 * {
 *   "overview": "Markdown shown to everyone on the project (context, tools, calendar). NO prices.",
 *   "problems": [
 *     {
 *       "code": "DW-1",                  // optional, unique; also how a re-import finds the item
 *       "title": "Paid media ...",       // required
 *       "folder": "Digital",             // optional folder (department) name; the CLI can supply a default
 *       "priority": "high",              // high | medium | low   (default medium)
 *       "delivery": "Recommendation",    // optional: how it is delivered
 *       "summary": "One line: the proposed solution",
 *       "solution": "## Markdown action plan ...",
 *       "links": [{ "label": "Brief", "url": "https://..." }],
 *       "cost": "Markdown cost note",    // optional; only people allowed to see costs ever receive it
 *       "status": "pending",             // pending | in_progress | completed | blocked
 *       "order": 10,                     // display order (default: position in the file × 10)
 *       "due": "2026-11-15"
 *     }
 *   ]
 * }
 *
 * Prices belong ONLY in `cost`. Everything else is visible to anyone who can
 * open the problem (or the project), so a price found anywhere else is
 * rejected rather than silently published.
 */

export const PRIORITIES = ["high", "medium", "low"];
export const STATUSES = ["pending", "in_progress", "completed", "blocked"];

export const LIMITS = {
  overview: 100_000,
  code: 40,
  title: 200,
  folder: 120,
  delivery: 120,
  summary: 2_000,
  solution: 100_000,
  cost: 10_000,
  linkLabel: 200,
  links: 20,
  problems: 200,
};

// "$12", "US$ 181", "€5", "12 USD", "300 pesos" ...
const MONEY = /(?:\bUS\s?\$|[$€£])\s?\d|\b\d[\d.,]*\s?(?:USD|MXN|EUR|dollars?|d[oó]lares|pesos)\b/i;

export function looksLikeMoney(text) {
  return typeof text === "string" && MONEY.test(text);
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const isText = (v) => typeof v === "string";
const clean = (v) => (isText(v) ? v.replace(/\r\n/g, "\n").trim() : v);

/**
 * @typedef {{
 *   code: string | null, title: string | null, folder: string | null, priority: string, status: string,
 *   delivery: string | null, summary: string | null, solution: string | null,
 *   links: { label: string, url: string }[],
 *   cost: string | null | undefined,  // undefined = leave an existing cost alone; null = remove it
 *   due: string | null, order: number
 * }} PlanProblem
 */

/**
 * @returns {{ ok: true, plan: { overview: string | null, problems: PlanProblem[] } } | { ok: false, errors: string[] }}
 */
export function validatePlan(input) {
  const errors = [];
  const bad = (path, message) => errors.push(`${path}: ${message}`);

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: ["The file must be a JSON object with a \"problems\" list."] };
  }

  const checkText = (path, value, max, { required = false, money = true } = {}) => {
    if (value === undefined || value === null || value === "") {
      if (required) bad(path, "is required");
      return null;
    }
    if (!isText(value)) {
      bad(path, "must be text");
      return null;
    }
    const text = clean(value);
    if (text.length > max) bad(path, `is too long (${text.length} > ${max} characters)`);
    if (money && looksLikeMoney(text)) bad(path, "looks like it contains a price. Move it to \"cost\" — only people allowed to see costs receive that field.");
    return text || null;
  };

  const overview = checkText("overview", input.overview, LIMITS.overview);

  if (!Array.isArray(input.problems) || input.problems.length === 0) {
    bad("problems", "must be a non-empty list");
    return { ok: false, errors };
  }
  if (input.problems.length > LIMITS.problems) bad("problems", `at most ${LIMITS.problems}`);

  const seenCodes = new Set();
  const problems = input.problems.map((raw, index) => {
    const at = `problems[${index}]`;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      bad(at, "must be an object");
      return null;
    }

    const code = checkText(`${at}.code`, raw.code, LIMITS.code);
    if (code) {
      const key = code.toLowerCase();
      if (seenCodes.has(key)) bad(`${at}.code`, `"${code}" is used twice`);
      seenCodes.add(key);
    }
    const title = checkText(`${at}.title`, raw.title, LIMITS.title, { required: true });
    const folder = checkText(`${at}.folder`, raw.folder, LIMITS.folder, { money: false });
    const delivery = checkText(`${at}.delivery`, raw.delivery, LIMITS.delivery);
    const summary = checkText(`${at}.summary`, raw.summary, LIMITS.summary);
    const solution = checkText(`${at}.solution`, raw.solution, LIMITS.solution);
    // `cost` is the one place prices are allowed.
    const hasCost = Object.prototype.hasOwnProperty.call(raw, "cost");
    const cost = hasCost ? checkText(`${at}.cost`, raw.cost, LIMITS.cost, { money: false }) : undefined;

    const priority = raw.priority ?? "medium";
    if (!PRIORITIES.includes(priority)) bad(`${at}.priority`, `must be one of ${PRIORITIES.join(", ")}`);
    const status = raw.status ?? "pending";
    if (!STATUSES.includes(status)) bad(`${at}.status`, `must be one of ${STATUSES.join(", ")}`);

    let due = null;
    if (raw.due !== undefined && raw.due !== null && raw.due !== "") {
      if (!isText(raw.due) || !/^\d{4}-\d{2}-\d{2}$/.test(raw.due) || Number.isNaN(Date.parse(`${raw.due}T00:00:00Z`))) {
        bad(`${at}.due`, "must look like 2026-11-15");
      } else due = raw.due;
    }

    let order = (index + 1) * 10;
    if (raw.order !== undefined) {
      if (!Number.isInteger(raw.order) || raw.order < 0 || raw.order > 100_000) bad(`${at}.order`, "must be a whole number from 0 to 100000");
      else order = raw.order;
    }

    const links = [];
    if (raw.links !== undefined) {
      if (!Array.isArray(raw.links)) bad(`${at}.links`, "must be a list");
      else {
        if (raw.links.length > LIMITS.links) bad(`${at}.links`, `at most ${LIMITS.links}`);
        raw.links.forEach((link, i) => {
          const linkAt = `${at}.links[${i}]`;
          const url = isText(link?.url) ? safeUrl(link.url.trim()) : null;
          if (!url) return bad(`${linkAt}.url`, "must be a full http(s) address");
          const label = checkText(`${linkAt}.label`, link.label, LIMITS.linkLabel);
          links.push({ label: label ?? url, url });
        });
      }
    }

    return { code, title, folder, priority, status, delivery, summary, solution, links, cost, due, order };
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, plan: { overview, problems } };
}
