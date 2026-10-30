/**
 * What an error report to the owner may say, and when it is worth sending. Pure, so the rules are tested.
 *
 * A report goes out by email, so it is written as if it will be read by a stranger: no request bodies, headers,
 * cookies or query strings ever reach it, and anything in an error message that looks like a secret, a token or an
 * email address is blanked. The same error repeating must collapse into one report: the signature ignores the
 * parts that change every time (numbers, ids).
 */
import { createHash } from "node:crypto";

/** Errors that are normal control flow in Next.js (a redirect, a 404) or a cancelled request: never worth a report. */
export function isExpectedError(error: unknown): boolean {
  const digest = typeof (error as { digest?: unknown } | null)?.digest === "string" ? (error as { digest: string }).digest : "";
  if (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")) return true;
  const name = (error as { name?: unknown } | null)?.name;
  return name === "AbortError";
}

/** Blanks what must not leave in an email: addresses, tokens and long secret-looking strings, and query strings. */
export function redact(text: string): string {
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, "[token]")
    .replace(/\b(Bearer|Basic)\s+\S+/gi, "$1 [token]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[secret]")
    .replace(/\?[^\s"')]+/g, "?[query]");
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : typeof error === "string" ? error : "unknown error");
const nameOf = (error: unknown): string => (error instanceof Error ? error.name : "Error");

/**
 * The same problem always has the same signature: digits and ids are replaced, so "Failed to reserve slot (id 123)" and
 * "(id 456)" are one problem. Used to send at most one report per hour for it.
 */
export function failureSignature(kind: string, error: unknown): string {
  const normalized = redact(messageOf(error))
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<id>")
    .replace(/\d+/g, "#")
    .slice(0, 160);
  return createHash("sha1").update(`${kind}|${nameOf(error)}|${normalized}`).digest("hex").slice(0, 16);
}

/** Alerts are on in production, and can be forced either way with ALERT_ON_ERRORS=true|false. */
export function alertsEnabled(env: { ALERT_ON_ERRORS?: string; NODE_ENV?: string }): boolean {
  const forced = (env.ALERT_ON_ERRORS ?? "").trim().toLowerCase();
  if (forced === "true") return true;
  if (forced === "false") return false;
  return env.NODE_ENV === "production";
}

export interface FailureDetails {
  kind: string;
  error: unknown;
  /** The path that failed, without its query string. */
  path?: string;
  method?: string;
  /** Next.js's short id for the error, to find it in the logs. */
  digest?: string;
  at?: Date;
}

/** The email: a subject that says what and where, and a body with just enough to find it in the logs. */
export function describeFailure(details: FailureDetails): { subject: string; lines: string[] } {
  const message = redact(messageOf(details.error)).replace(/\s+/g, " ").trim();
  const firstLine = message.slice(0, 90) || "unknown error";
  const frames = (details.error instanceof Error ? (details.error.stack ?? "").split("\n").slice(1, 6) : [])
    .map((line) => redact(line.trim()))
    .filter(Boolean);
  const path = details.path ? redact(details.path.split("?")[0]) : undefined;
  return {
    subject: `[IxMa] ${details.kind}: ${firstLine}`,
    lines: [
      `Something failed on the live site: ${details.kind}.`,
      "",
      `When:    ${(details.at ?? new Date()).toISOString()}`,
      path ? `Where:   ${details.method ? `${details.method} ` : ""}${path}` : "",
      `Error:   ${nameOf(details.error)}: ${message.slice(0, 400)}`,
      details.digest ? `Digest:  ${details.digest}  (search for it in the Vercel logs)` : "",
      ...(frames.length ? ["", "Where in the code:", ...frames.map((frame) => `  ${frame}`)] : []),
      "",
      "You get one email per kind of problem per hour, and at most ten an hour in all. Nothing from the person's request is included.",
    ].filter((line, index, all) => line !== "" || all[index - 1] !== ""),
  };
}
