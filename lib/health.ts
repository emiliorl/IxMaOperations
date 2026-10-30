/**
 * The site's health check, for an uptime monitor to ping. Pure helpers, so the rules are tested.
 *
 * It answers only "ok" or "fail" per check and never says why (no messages, versions, addresses or names), so
 * a stranger learns nothing from it beyond "the site is up". The deeper checks (the calendar, the email key) are
 * for the owner's own monitor, behind the same secret the scheduled jobs use.
 */

export type CheckResult = "ok" | "fail";

/** Runs a check with a time limit: a hung dependency is a failed check, not a hung monitor. Never throws. */
export async function runCheck(check: () => Promise<unknown>, timeoutMs: number): Promise<CheckResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      check(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
    return "ok";
  } catch {
    return "fail";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Are all these settings present? Only yes or no: never which one is missing, and never a value. */
export function configPresent(env: Record<string, string | undefined>, names: readonly string[]): CheckResult {
  return names.every((name) => Boolean(env[name])) ? "ok" : "fail";
}

/** The whole answer: healthy only when every check is ok. */
export function summarize(checks: Record<string, CheckResult>): { ok: boolean; checks: Record<string, CheckResult> } {
  return { ok: Object.values(checks).every((result) => result === "ok"), checks };
}
