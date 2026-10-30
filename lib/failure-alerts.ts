import "server-only";
import { Redis } from "@upstash/redis";
import { sendOwnerAlert } from "./email";
import { alertsEnabled, describeFailure, failureSignature, isExpectedError, type FailureDetails } from "./failure-report";
import { checkRateLimit } from "./rate-limit";

/**
 * Tells the owner, by email, when something fails on the live site, so a failure like a booking that silently
 * returns an error is noticed by you and not first by a client.
 *
 * Careful by design:
 *  - it only reports real failures (not redirects or 404s), and only in production unless ALERT_ON_ERRORS says so;
 *  - one email per kind of problem per hour (the same error repeating is one email), and at most ten an hour in all,
 *    so an outage can't flood the inbox;
 *  - what it says is redacted (lib/failure-report.ts): never a request body, header, cookie, address or token;
 *  - it NEVER throws and never waits on anything that could hang: reporting a failure must not become one.
 * The failure is always written to the log as well, whatever else happens.
 */

const HOUR_MS = 3_600_000;
/** The same problem is reported once per hour. Shared across servers when Upstash is configured, else per server. */
const reportedHere = new Map<string, number>();

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

/** True the first time this problem is seen in the hour. */
async function firstThisHour(signature: string): Promise<boolean> {
  const now = Date.now();
  const last = reportedHere.get(signature);
  if (last !== undefined && now - last < HOUR_MS) return false;
  reportedHere.set(signature, now);
  if (reportedHere.size > 500) reportedHere.forEach((at, key) => now - at >= HOUR_MS && reportedHere.delete(key));
  if (!redis) return true;
  try {
    return (await redis.set(`failure-alert:${signature}`, "1", { nx: true, ex: 3600 })) === "OK";
  } catch {
    return true; // Redis unreachable: better one possibly repeated email than a silent failure
  }
}

export async function alertOwnerOfFailure(kind: string, error: unknown, context: Omit<FailureDetails, "kind" | "error"> = {}): Promise<void> {
  try {
    console.error(`[failure] ${kind}:`, error instanceof Error ? error.message : error);
    if (isExpectedError(error) || !alertsEnabled(process.env)) return;
    if (!(await firstThisHour(failureSignature(kind, error)))) return;
    if (!(await checkRateLimit("failure-alert", "all", 10, 3600)).allowed) return;
    const { subject, lines } = describeFailure({ kind, error, ...context });
    await sendOwnerAlert(subject, lines);
  } catch (reporting) {
    console.error("[failure] could not send the failure report:", reporting instanceof Error ? reporting.message : reporting);
  }
}
