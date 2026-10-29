/**
 * scripts/crypto.mjs — the owner CLI's copy of lib/field-crypto.ts.
 *
 * The CLI is plain Node (it can't import the TypeScript module), so this file
 * reimplements the SAME format: AES-256-GCM, `v1.<iv>.<tag>.<ciphertext>`
 * (base64url), and the same keyed email fingerprint. lib/field-crypto.test.ts
 * proves the two implementations read each other's output in both directions;
 * if you change one, that test fails until you change the other.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

function getKey() {
  const raw = process.env.DATA_ENCRYPTION_KEY;
  if (!raw) throw new Error("DATA_ENCRYPTION_KEY is not set — the CLI must use the same key as the app.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must be 32 random bytes, base64-encoded.");
  return key;
}

const SHAPE = /^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]*$/;

export function encryptField(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function encryptOptional(value) {
  return value ? encryptField(value) : null;
}

export function decryptField(token) {
  const [version, iv, tag, ciphertext] = token.split(".");
  if (version !== "v1" || !iv || !tag || ciphertext === undefined) throw new Error("Unrecognized encrypted field format.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

/** Ciphertext is decrypted (and throws if it doesn't authenticate); anything else is legacy plaintext. */
export function decryptLoose(value) {
  if (value === null || value === undefined) return null;
  return SHAPE.test(value) ? decryptField(value) : value;
}

export function blindIndex(value) {
  const subkey = createHmac("sha256", getKey()).update("blind-index-v1").digest();
  return createHmac("sha256", subkey).update(value.trim().toLowerCase()).digest("hex");
}
