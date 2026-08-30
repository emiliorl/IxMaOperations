/**
 * lib/audit-engine.ts
 *
 * Pure validation/normalization helpers behind the Phase 4 "Data Auditing &
 * QA Linter" demo (CAPABILITY_DEMOS_PLAN.md Phase 4). Parses pasted or
 * uploaded delimited text, detects which columns are email/phone/date by
 * header name, validates and normalizes each, flags exact and near-duplicate
 * records, and rolls the result up into a 0–100 health score.
 *
 * Runs entirely client-side, synchronously — no server round-trip, same as
 * lib/content-engine.ts. Consumed by components/examples/AuditDemo.tsx.
 */

// --- delimited-text parsing (RFC 4180-ish; handles quoted fields with
// embedded delimiters/newlines/escaped quotes) --------------------------------

export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  const counts: Array<[string, number]> = [
    [",", (sample.match(/,/g) ?? []).length],
    ["\t", (sample.match(/\t/g) ?? []).length],
    [";", (sample.match(/;/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // skip — \n (handled below) ends the row
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export interface ParsedTable {
  headers: string[];
  rows: string[][];
}

export function parseTable(text: string): ParsedTable {
  const delimiter = detectDelimiter(text);
  const rows = parseDelimited(text.trim(), delimiter);
  if (rows.length === 0) return { headers: [], rows: [] };
  const [headers, ...body] = rows;
  return { headers: headers.map((h) => h.trim()), rows: body };
}

// --- column role detection (by header name) --------------------------------

export type ColumnRole = "email" | "phone" | "date" | "name" | "other";

const HEADER_ALIASES: Array<[Exclude<ColumnRole, "other">, RegExp]> = [
  ["email", /e[-\s]?mail/i],
  ["phone", /phone|mobile|tel(ephone)?|cell/i],
  ["date", /date|dob|birth|created|signup|joined/i],
  ["name", /^name$|full[-\s]?name|customer|contact/i],
];

export function detectColumnRoles(headers: string[]): ColumnRole[] {
  return headers.map((h) => {
    for (const [role, re] of HEADER_ALIASES) {
      if (re.test(h)) return role;
    }
    return "other";
  });
}

// --- shared string-distance helper (email-domain typo fixing + fuzzy name match) ---

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// --- email validation ---------------------------------------------------------

// A practical approximation of RFC 5322, not the full (famously absurd) grammar.
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const KNOWN_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "protonmail.com", "live.com", "msn.com",
];

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com", "throwawaymail.com",
  "yopmail.com", "trashmail.com", "fakeinbox.com", "getnada.com", "sharklasers.com", "dispostable.com",
]);

/** Nearest well-known provider domain within edit-distance 2 — catches
 *  "gmai.com", "gmial.com", "yahooo.com", "hotmial.com", "gmail.co", etc.
 *  without a fixed typo→correction map. Returns null if `domain` already
 *  *is* a known domain (nothing to fix) or nothing is close enough. */
function closestKnownDomain(domain: string): string | null {
  let best: { domain: string; dist: number } | null = null;
  for (const known of KNOWN_EMAIL_DOMAINS) {
    if (domain === known) return null; // already correct
    // A domain with no TLD at all ("gmail") that otherwise matches a known
    // provider exactly just needs its TLD restored — the missing ".com" is
    // a bigger edit-distance gap than the general typo check below allows,
    // but it's an unambiguous, common typo worth catching precisely.
    if (!domain.includes(".") && domain === known.slice(0, known.lastIndexOf("."))) return known;
    const dist = levenshtein(domain, known);
    if (dist <= 2 && (!best || dist < best.dist)) best = { domain: known, dist };
  }
  return best?.domain ?? null;
}

export interface EmailCheck {
  valid: boolean;
  /** Non-null when something changed (typo-fixed domain and/or casing normalized). */
  corrected: string | null;
  disposable: boolean;
  reason: "missing" | "invalid-syntax" | "typo-corrected" | "disposable" | "normalized" | null;
}

export function checkEmail(raw: string): EmailCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: false, corrected: null, disposable: false, reason: "missing" };

  const candidate = trimmed.toLowerCase();
  const atIndex = candidate.lastIndexOf("@");
  const domain = atIndex >= 0 ? candidate.slice(atIndex + 1) : "";

  if (!EMAIL_RE.test(candidate)) {
    // Still worth trying a domain-typo fix even on a malformed address —
    // "sarah@gmial" (missing TLD entirely) becomes valid once corrected.
    if (atIndex > 0 && domain) {
      const fix = closestKnownDomain(domain);
      if (fix) {
        const fixed = `${candidate.slice(0, atIndex + 1)}${fix}`;
        if (EMAIL_RE.test(fixed)) return { valid: true, corrected: fixed, disposable: DISPOSABLE_DOMAINS.has(fix), reason: "typo-corrected" };
      }
    }
    return { valid: false, corrected: null, disposable: false, reason: "invalid-syntax" };
  }

  const fix = domain ? closestKnownDomain(domain) : null;
  if (fix) {
    const fixed = `${candidate.slice(0, atIndex + 1)}${fix}`;
    return { valid: true, corrected: fixed, disposable: DISPOSABLE_DOMAINS.has(fix), reason: "typo-corrected" };
  }

  const disposable = DISPOSABLE_DOMAINS.has(domain);
  return { valid: true, corrected: candidate !== trimmed ? candidate : null, disposable, reason: disposable ? "disposable" : candidate !== trimmed ? "normalized" : null };
}

// --- phone normalization (best-effort E.164) --------------------------------

export interface PhoneCheck {
  valid: boolean;
  /** Non-null when the E.164-normalized form differs from the raw input. */
  corrected: string | null;
  reason: "missing" | "invalid-length" | null;
}

/** `defaultCountryCode` assumes a 10-digit, no-country-code number belongs to
 *  that country — reasonable for a demo audience, not a substitute for
 *  knowing the record's actual locale. */
export function checkPhone(raw: string, defaultCountryCode = "1"): PhoneCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: false, corrected: null, reason: "missing" };

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return { valid: false, corrected: null, reason: "invalid-length" };

  let e164: string;
  if (hasPlus) {
    if (digits.length < 8 || digits.length > 15) return { valid: false, corrected: null, reason: "invalid-length" };
    e164 = `+${digits}`;
  } else if (digits.length === 10) {
    e164 = `+${defaultCountryCode}${digits}`;
  } else if (digits.length === 11 && digits.startsWith(defaultCountryCode)) {
    e164 = `+${digits}`;
  } else if (digits.length >= 8 && digits.length <= 15) {
    e164 = `+${digits}`; // some other country's number, given without a leading + — best effort
  } else {
    return { valid: false, corrected: null, reason: "invalid-length" };
  }

  return { valid: true, corrected: e164 !== trimmed ? e164 : null, reason: null };
}

// --- date normalization (to ISO-8601) --------------------------------------

const MONTH_NUMBERS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12",
};

function monthFromName(name: string): string | null {
  const key = name.toLowerCase().startsWith("sept") ? "sept" : name.toLowerCase().slice(0, 3);
  return MONTH_NUMBERS[key] ?? null;
}

function pad2(n: string | number): string {
  return String(n).padStart(2, "0");
}

/** Rejects calendar-invalid dates (Feb 30, month 13, …) rather than just
 *  range-checking each part independently — `new Date` silently rolls those
 *  over into a *different*, wrong date instead of erroring. */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export interface DateCheck {
  valid: boolean;
  /** Non-null when normalized to ISO-8601 from a different source format. */
  corrected: string | null;
  reason: "missing" | "invalid-date" | "unrecognized-format" | null;
}

export function checkDate(raw: string): DateCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: false, corrected: null, reason: "missing" };

  let m: RegExpMatchArray | null;

  if ((m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
    const [, y, mo, d] = m;
    return isValidCalendarDate(+y, +mo, +d)
      ? { valid: true, corrected: null, reason: null }
      : { valid: false, corrected: null, reason: "invalid-date" };
  }

  if ((m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    const [, a, b, y] = m;
    // MM/DD/YYYY tried first (most common in this audience); DD/MM as fallback when MM/DD is impossible.
    if (isValidCalendarDate(+y, +a, +b)) return { valid: true, corrected: `${y}-${pad2(a)}-${pad2(b)}`, reason: null };
    if (isValidCalendarDate(+y, +b, +a)) return { valid: true, corrected: `${y}-${pad2(b)}-${pad2(a)}`, reason: null };
    return { valid: false, corrected: null, reason: "invalid-date" };
  }

  if ((m = trimmed.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/))) {
    const [, d, monthName, y] = m;
    const mo = monthFromName(monthName);
    return mo && isValidCalendarDate(+y, +mo, +d)
      ? { valid: true, corrected: `${y}-${mo}-${pad2(d)}`, reason: null }
      : { valid: false, corrected: null, reason: "invalid-date" };
  }

  if ((m = trimmed.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/))) {
    const [, monthName, d, y] = m;
    const mo = monthFromName(monthName);
    return mo && isValidCalendarDate(+y, +mo, +d)
      ? { valid: true, corrected: `${y}-${mo}-${pad2(d)}`, reason: null }
      : { valid: false, corrected: null, reason: "invalid-date" };
  }

  return { valid: false, corrected: null, reason: "unrecognized-format" };
}

// --- fuzzy name matching (supplementary dedup signal) --------------------------

function normalizeNameForCompare(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ");
}

function namesAreSimilar(a: string, b: string): boolean {
  const na = normalizeNameForCompare(a);
  const nb = normalizeNameForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const dist = levenshtein(na, nb);
  return dist <= 1 || dist / Math.max(na.length, nb.length) <= 0.15;
}

// --- top-level audit assembly -----------------------------------------------

export type Severity = "error" | "warning" | "fixed";

/** A key, not a literal string — components/examples/AuditDemo.tsx
 *  translates it, so the diagnostic text in the diff table's Note column
 *  respects the visitor's locale instead of always being English (unlike
 *  the other Phase 3/4 demos' English-only content, these are our own
 *  fixed strings, not the visitor's own pasted text or an inherently
 *  English external system's raw output). */
export type IssueMessageKey =
  | "invalidEmailFormat"
  | "missingEmail"
  | "correctedDomainTypo"
  | "normalizedCasing"
  | "disposableEmailDomain"
  | "invalidPhoneNumber"
  | "missingPhoneNumber"
  | "normalizedE164"
  | "unrecognizedDateFormat"
  | "missingDate"
  | "normalizedIso8601"
  | "duplicateEmail"
  | "duplicatePhone"
  | "duplicateName";

export interface FieldIssue {
  field: string;
  severity: Severity;
  messageKey: IssueMessageKey;
  /** 1-based row number the duplicate* message keys reference. */
  matchesRow?: number;
}

export interface AuditedRow {
  index: number;
  original: Record<string, string>;
  corrected: Record<string, string>;
  issues: FieldIssue[];
  duplicateOfRow: number | null;
}

export interface AuditReport {
  headers: string[];
  rows: AuditedRow[];
  totalRows: number;
  errorCount: number;
  warningCount: number;
  fixedCount: number;
  duplicateCount: number;
  /** 0–100. errors cost a full point, warnings half, fixed-but-was-wrong a quarter — against the number of email/phone/date fields actually checked. */
  healthScore: number;
}

export function auditTable(text: string): AuditReport {
  const { headers, rows } = parseTable(text);
  const roles = detectColumnRoles(headers);
  const emailCol = headers[roles.indexOf("email")];
  const phoneCol = headers[roles.indexOf("phone")];
  const nameCol = headers[roles.indexOf("name")];

  const seenEmails = new Map<string, number>();
  const seenPhones = new Map<string, number>();
  const seenNames: Array<{ index: number; name: string }> = [];

  let errorCount = 0;
  let warningCount = 0;
  let fixedCount = 0;
  let duplicateCount = 0;
  let checkedFields = 0;

  const auditedRows: AuditedRow[] = rows.map((cells, rowIndex) => {
    const original: Record<string, string> = {};
    const corrected: Record<string, string> = {};
    const issues: FieldIssue[] = [];

    headers.forEach((header, colIndex) => {
      const raw = (cells[colIndex] ?? "").trim();
      original[header] = raw;
      corrected[header] = raw;
      const role = roles[colIndex];

      if (role === "email") {
        checkedFields++;
        const check = checkEmail(raw);
        if (!check.valid) {
          errorCount++;
          issues.push({ field: header, severity: "error", messageKey: raw ? "invalidEmailFormat" : "missingEmail" });
        } else {
          if (check.corrected) {
            corrected[header] = check.corrected;
            fixedCount++;
            issues.push({
              field: header,
              severity: "fixed",
              messageKey: check.reason === "typo-corrected" ? "correctedDomainTypo" : "normalizedCasing",
            });
          }
          if (check.disposable) {
            warningCount++;
            issues.push({ field: header, severity: "warning", messageKey: "disposableEmailDomain" });
          }
        }
      } else if (role === "phone") {
        checkedFields++;
        const check = checkPhone(raw);
        if (!check.valid) {
          errorCount++;
          issues.push({ field: header, severity: "error", messageKey: raw ? "invalidPhoneNumber" : "missingPhoneNumber" });
        } else if (check.corrected) {
          corrected[header] = check.corrected;
          fixedCount++;
          issues.push({ field: header, severity: "fixed", messageKey: "normalizedE164" });
        }
      } else if (role === "date") {
        checkedFields++;
        const check = checkDate(raw);
        if (!check.valid) {
          errorCount++;
          issues.push({ field: header, severity: "error", messageKey: raw ? "unrecognizedDateFormat" : "missingDate" });
        } else if (check.corrected) {
          corrected[header] = check.corrected;
          fixedCount++;
          issues.push({ field: header, severity: "fixed", messageKey: "normalizedIso8601" });
        }
      }
    });

    let duplicateOfRow: number | null = null;
    if (emailCol && corrected[emailCol]) {
      const key = corrected[emailCol].toLowerCase();
      const seenAt = seenEmails.get(key);
      if (seenAt !== undefined) {
        duplicateOfRow = seenAt;
        issues.push({ field: emailCol, severity: "warning", messageKey: "duplicateEmail", matchesRow: seenAt + 1 });
      } else {
        seenEmails.set(key, rowIndex);
      }
    }
    if (duplicateOfRow === null && phoneCol && corrected[phoneCol]) {
      const key = corrected[phoneCol];
      const seenAt = seenPhones.get(key);
      if (seenAt !== undefined) {
        duplicateOfRow = seenAt;
        issues.push({ field: phoneCol, severity: "warning", messageKey: "duplicatePhone", matchesRow: seenAt + 1 });
      } else {
        seenPhones.set(key, rowIndex);
      }
    }
    if (duplicateOfRow === null && nameCol && corrected[nameCol]) {
      const match = seenNames.find((s) => namesAreSimilar(s.name, corrected[nameCol]));
      if (match) {
        duplicateOfRow = match.index;
        issues.push({ field: nameCol, severity: "warning", messageKey: "duplicateName", matchesRow: match.index + 1 });
      }
      seenNames.push({ index: rowIndex, name: corrected[nameCol] });
    }
    if (duplicateOfRow !== null) {
      duplicateCount++;
      warningCount++;
    }

    return { index: rowIndex, original, corrected, issues, duplicateOfRow };
  });

  const weightedPenalty = errorCount * 1 + warningCount * 0.5 + fixedCount * 0.25;
  const healthScore = checkedFields > 0 ? Math.max(0, Math.round(100 * (1 - weightedPenalty / checkedFields))) : 100;

  return { headers, rows: auditedRows, totalRows: rows.length, errorCount, warningCount, fixedCount, duplicateCount, healthScore };
}

// --- CSV export ---------------------------------------------------------------

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function reportToCsv(report: AuditReport): string {
  const lines = [report.headers.map(csvCell).join(",")];
  for (const row of report.rows) {
    lines.push(report.headers.map((h) => csvCell(row.corrected[h] ?? "")).join(","));
  }
  return lines.join("\n");
}

// --- sample dirty dataset -----------------------------------------------------

const SAMPLE_FIRST_NAMES = [
  "Sarah", "Michael", "Jessica", "David", "Emily", "James", "Ashley", "Robert", "Amanda", "Chris",
  "Laura", "Kevin", "Megan", "Brian", "Nicole", "Jason", "Rachel", "Daniel", "Stephanie", "Andrew",
];
// 21 entries (not 20, matching SAMPLE_FIRST_NAMES) is deliberate — with both
// lists the same length, the (first, last) pair cycles with period 20, so
// row 20 gets *exactly* row 0's name again, row 21 exactly row 1's, and so
// on, flooding the second half of the dataset with unintended duplicates.
// Coprime lengths (gcd(20, 21) = 1) push the combined cycle out to 420 rows.
const SAMPLE_LAST_NAMES = [
  "Johnson", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas",
  "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Lewis", "Walker",
];

/** Deterministically builds a dirty sample dataset — every rule the engine
 *  checks gets exercised at least once, plus an exact duplicate and a
 *  fuzzy-name near-duplicate, so "Load Sample Dirty Dataset" reliably shows
 *  every part of the report working. */
export function buildSampleDirtyCsv(rowCount = 50): string {
  const lines = ["Name,Email,Phone,SignupDate"];

  for (let i = 0; i < rowCount; i++) {
    const first = SAMPLE_FIRST_NAMES[i % SAMPLE_FIRST_NAMES.length];
    const last = SAMPLE_LAST_NAMES[i % SAMPLE_LAST_NAMES.length];
    let name = `${first} ${last}`;
    let email = `${first.toLowerCase()}.${last.toLowerCase()}@gmail.com`;
    let phone = `(212) 555-${String(1000 + i).slice(-4)}`;
    let date = "2026-01-15";

    if (i % 6 === 1) email = email.replace("gmail.com", "gmai.com"); // domain typo -> auto-fixed
    else if (i % 6 === 2) email = email.replace("gmail.com", "mailinator.com"); // disposable -> warning
    else if (i % 6 === 3) email = ""; // missing -> error
    else if (i % 6 === 4) email = `${first}.${last}@gmail`; // no TLD -> error
    else if (i % 6 === 5) email = email.toUpperCase(); // inconsistent casing -> auto-fixed

    if (i % 5 === 2) phone = `555-${String(i).padStart(2, "0")}`; // too short -> error
    else if (i % 5 === 3) phone = `212.555.${String(1000 + i).slice(-4)}`; // punctuation -> normalized
    else if (i % 5 === 4) phone = ""; // missing -> error

    if (i % 4 === 1) date = "01/15/2026"; // US slash format -> normalized
    else if (i % 4 === 2) date = "15-Jan-2026"; // day-month-name -> normalized
    else if (i % 4 === 3) date = "13/45/2026"; // invalid -> error

    if (i === 22) {
      // exact duplicate of row 0
      name = `${SAMPLE_FIRST_NAMES[0]} ${SAMPLE_LAST_NAMES[0]}`;
      email = `${SAMPLE_FIRST_NAMES[0].toLowerCase()}.${SAMPLE_LAST_NAMES[0].toLowerCase()}@gmail.com`;
    }
    if (i === 37) {
      // near-duplicate name of row 0, different contact info entirely
      name = `Sara ${SAMPLE_LAST_NAMES[0]}`;
    }

    const cells = [name, email, phone, date].map(csvCell);
    lines.push(cells.join(","));
  }

  return lines.join("\n");
}
