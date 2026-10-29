/**
 * scripts/problem-codes.mjs — the short ID each problem carries (FIN-1, OPE-2…).
 *
 * The ID is the area's three-letter prefix and a running number. It is stored
 * on the problem (never recalculated), so FIN-3 keeps meaning the same problem
 * in tickets, e-mails and conversations even after others are added or removed.
 * Pure on purpose so it can be tested; see lib/portal/problem-codes.test.ts.
 * A code written by hand in a plan file always wins over a generated one.
 */

/** Prefix for problems that belong to the whole project, not to one area. */
export const PROJECT_WIDE_PREFIX = "PRJ";

const fold = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * "Finance" → FIN, "Operations" → OPE, "HR" → HR, "Human Resources" → HR,
 * "Recursos Humanos" → RH, no area → PRJ. Letters and digits only (so the
 * prefix is safe to match with a pattern), at most three characters.
 */
export function areaPrefix(areaName) {
  const words = fold(areaName ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (words.length === 0) return PROJECT_WIDE_PREFIX;
  if (words.length === 1) return words[0].slice(0, 3);
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, 3);
}

/** The next free number for a prefix: one more than the highest already used, so deleted numbers are not reused. */
export function nextProblemCode(prefix, takenCodes) {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
  let highest = 0;
  for (const code of takenCodes) {
    const match = pattern.exec((code ?? "").trim());
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${prefix}-${highest + 1}`;
}

/**
 * Codes for the problems that have none, in the order given (plan order). Returns
 * only the new ones, as [{ id, code }]. Nothing that already has a code changes.
 *
 * @param {{ id: string, code: string | null, areaName: string | null }[]} items
 */
export function assignMissingCodes(items) {
  const taken = items.map((item) => item.code).filter(Boolean);
  const assigned = [];
  for (const item of items) {
    if (item.code) continue;
    const code = nextProblemCode(areaPrefix(item.areaName), taken);
    taken.push(code);
    assigned.push({ id: item.id, code });
  }
  return assigned;
}
