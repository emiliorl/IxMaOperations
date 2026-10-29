export const MIN_PASSWORD = 12;
export const MAX_PASSWORD = 128;

export type PasswordProblem = "too_short" | "too_long" | "mismatch" | "contains_email" | "common";

/** A few of the most-guessed passwords that are long enough to pass the length rule. */
const COMMON = new Set([
  "password1234",
  "password12345",
  "123456789012",
  "1234567890123",
  "qwertyuiop12",
  "qwertyuiopas",
  "letmein12345",
  "welcome12345",
  "administrator",
  "iloveyou1234",
  "abcdefghijkl",
]);

/**
 * Rules for a password someone chooses for themselves. Length matters far more
 * than composition, so: at least 12 characters, no shortcut of using their own
 * email, nothing from the most-guessed list, and the two entries must match.
 */
export function validateNewPassword(password: string, confirm: string, email: string): PasswordProblem | null {
  if (password.length < MIN_PASSWORD) return "too_short";
  if (password.length > MAX_PASSWORD) return "too_long";
  if (password !== confirm) return "mismatch";

  const lower = password.toLowerCase();
  const address = email.trim().toLowerCase();
  const local = address.split("@")[0] ?? "";
  if (address && (lower === address || (local.length >= 4 && lower.includes(local)))) return "contains_email";

  if (COMMON.has(lower) || new Set(lower).size === 1) return "common";
  return null;
}
