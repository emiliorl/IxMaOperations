/**
 * lib/field-crypto.ts
 *
 * Application-level encryption for personal data stored in Supabase (guest
 * name, email, notes, meeting address). Supabase already encrypts the
 * database and backups at rest and all traffic in transit; this adds a layer
 * that is under OUR key, so a leaked database dump, backup or SQL-editor
 * screenshot shows ciphertext, not people's details. Only the server holding
 * DATA_ENCRYPTION_KEY can read these fields.
 *
 * Scheme: AES-256-GCM, a fresh random 96-bit IV per value, authenticated
 * (a modified ciphertext fails to decrypt instead of returning garbage).
 * Stored form: `v1.<iv>.<tag>.<ciphertext>` (base64url). The `v1` prefix lets
 * a future key rotation add `v2` and decrypt both.
 *
 * Deliberately NOT encrypted: start/end times and status — the database
 * needs them for the overlap constraint and queries, and they aren't
 * identifying on their own. Encrypted values can't be searched or indexed,
 * so never put a column here that something needs to filter or sort by.
 *
 * KEY CUSTODY: if DATA_ENCRYPTION_KEY is lost, the encrypted fields are
 * unrecoverable. Keep a copy in a password manager, and set the same value
 * in Vercel's environment variables. Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const VERSION = "v1";

function getKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY is not set — see .env.example.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 random bytes, base64-encoded.");
  return key;
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptField(token: string): string {
  const [version, iv, tag, ciphertext] = token.split(".");
  if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
    throw new Error("Unrecognized encrypted field format.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

/** null/undefined/"" pass through unchanged so optional columns stay NULL. */
export function encryptOptional(value: string | null | undefined): string | null {
  return value ? encryptField(value) : null;
}

export function decryptOptional(token: string | null | undefined): string | null {
  return token ? decryptField(token) : null;
}

// --------------------------------------------------------------- portal data

/** Shape of a stored ciphertext: `v1.<iv>.<tag>.<ciphertext>` (all base64url). */
const CIPHERTEXT_SHAPE = /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]*$/;

export function isCiphertext(value: string): boolean {
  return CIPHERTEXT_SHAPE.test(value);
}

/**
 * Reads a portal text column. Ciphertext is decrypted — and if it fails to
 * authenticate (wrong key, tampering) this THROWS rather than showing garbage.
 * Anything not shaped like ciphertext is treated as legacy plaintext written
 * before encryption was switched on, and returned unchanged, so existing rows
 * keep working. Human text can't match the ciphertext shape (no spaces, a
 * fixed-length base64url header), so the two never get confused.
 */
export function decryptLoose(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return isCiphertext(value) ? decryptField(value) : value;
}

/**
 * A keyed fingerprint for exact-match lookups of encrypted values (we look
 * people up by email without storing the email in readable form). HMAC-SHA256
 * with a subkey derived from the data key; case- and whitespace-insensitive.
 * One-way: it can confirm a guess, it cannot be turned back into the email.
 */
export function blindIndex(value: string): string {
  const subkey = createHmac("sha256", getKey()).update("blind-index-v1").digest();
  return createHmac("sha256", subkey).update(value.trim().toLowerCase()).digest("hex");
}

// ------------------------------------------------------------- file contents

/**
 * Encrypts raw file bytes (screenshots, logs, PDFs): AES-256-GCM, stored as
 * iv(12) | auth tag(16) | ciphertext. Same key as the text fields. The file
 * only ever exists in readable form inside the app server, in memory.
 */
export function encryptBuffer(plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptBuffer(stored: Buffer): Buffer {
  if (stored.length < 28) throw new Error("Encrypted file is too short to be valid.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), stored.subarray(0, 12));
  decipher.setAuthTag(stored.subarray(12, 28));
  return Buffer.concat([decipher.update(stored.subarray(28)), decipher.final()]);
}
