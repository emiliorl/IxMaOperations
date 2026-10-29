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
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

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
