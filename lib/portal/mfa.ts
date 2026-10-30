/**
 * Two-step verification (a 6-digit code from an authenticator app). Pure, so every rule is tested.
 *
 * The rules, in one place:
 *  - Anyone who has set it up must enter a code to use the portal: a password alone is not enough.
 *  - The owner MUST have it set up (the owner's account can see every client's data). Until they do, the portal
 *    only offers the setup page. `PORTAL_REQUIRE_OWNER_2FA=false` switches that requirement off (an emergency
 *    door for someone with access to the hosting settings, who could do anything anyway).
 *  - When anything is unclear (an unreadable token, a missing claim), the answer is the careful one: not verified.
 */

export type Aal = "aal1" | "aal2";

export interface FactorLike {
  status?: string | null;
  factor_type?: string | null;
}

/** How many authenticator apps this account has set up and confirmed. A half-finished setup does not count. */
export function verifiedTotpCount(factors: readonly FactorLike[] | null | undefined): number {
  return (factors ?? []).filter((factor) => factor.status === "verified" && (factor.factor_type ?? "totp") === "totp").length;
}

/**
 * How strongly the session was verified: "aal2" once the code was entered, else "aal1". Read from the access token's
 * `aal` claim. (The token itself was already verified by the auth server when the session was checked; this only
 * reads a claim from it.) Anything unreadable is "aal1".
 */
export function aalFromAccessToken(token: string | null | undefined): Aal {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return "aal1";
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { aal?: unknown };
    return claims.aal === "aal2" ? "aal2" : "aal1";
  } catch {
    return "aal1";
  }
}

/** Is the owner required to have two-step verification? Yes, unless the setting says "false" (or off / no / 0). */
export function ownerTwoStepRequired(value: string | undefined): boolean {
  return !["false", "off", "no", "0"].includes((value ?? "").trim().toLowerCase());
}

export type TwoStepGate = "ok" | "verify" | "enroll";

/**
 * What a signed-in person must do before using the portal.
 *  - has it set up, code not entered in this session → "verify"
 *  - owner without it, and it is required → "enroll"
 *  - otherwise → "ok"
 */
export function twoStepGate(input: { isAdmin: boolean; ownerRequired: boolean; verifiedFactors: number; aal: Aal }): TwoStepGate {
  if (input.verifiedFactors > 0) return input.aal === "aal2" ? "ok" : "verify";
  return input.isAdmin && input.ownerRequired ? "enroll" : "ok";
}

/** May this person remove one of their authenticator apps? Not the last one, when the owner is required to have it. */
export function canRemoveFactor(input: { isAdmin: boolean; ownerRequired: boolean; verifiedFactors: number }): boolean {
  return !(input.isAdmin && input.ownerRequired && input.verifiedFactors <= 1);
}

/** The code as typed: authenticator apps show "123 456", so spaces and dashes are dropped. */
export function normalizeCode(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}

export const TWO_STEP_CODE = /^\d{6}$/;
