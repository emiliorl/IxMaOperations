import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptField, decryptOptional, encryptField, encryptOptional } from "./field-crypto";

const ORIGINAL_KEY = process.env.DATA_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});
afterEach(() => {
  process.env.DATA_ENCRYPTION_KEY = ORIGINAL_KEY;
});

describe("field encryption", () => {
  it("round-trips text, including unicode", () => {
    const text = "María Pérez <maria@example.com> — oficina 4B, Piso 2";
    expect(decryptField(encryptField(text))).toBe(text);
  });

  it("never stores plaintext and uses a fresh IV each time", () => {
    const a = encryptField("maria@example.com");
    const b = encryptField("maria@example.com");
    expect(a).not.toContain("maria");
    expect(a).not.toBe(b);
    expect(a.startsWith("v1.")).toBe(true);
  });

  it("detects tampering (GCM authentication)", () => {
    const parts = encryptField("secret note").split(".");
    const flipped = Buffer.from(parts[3], "base64url");
    flipped[0] ^= 0xff;
    parts[3] = flipped.toString("base64url");
    expect(() => decryptField(parts.join("."))).toThrow();
  });

  it("fails to decrypt under a different key", () => {
    const token = encryptField("secret note");
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptField(token)).toThrow();
  });

  it("rejects a missing or wrong-length key", () => {
    delete process.env.DATA_ENCRYPTION_KEY;
    expect(() => encryptField("x")).toThrow(/not set/);
    process.env.DATA_ENCRYPTION_KEY = Buffer.from("too short").toString("base64");
    expect(() => encryptField("x")).toThrow(/32 random bytes/);
  });

  it("rejects an unknown format", () => {
    expect(() => decryptField("plain text, not a token")).toThrow(/format/);
  });

  it("optional helpers keep empty values NULL", () => {
    expect(encryptOptional("")).toBeNull();
    expect(encryptOptional(undefined)).toBeNull();
    expect(decryptOptional(null)).toBeNull();
    expect(decryptOptional(encryptOptional("hola"))).toBe("hola");
  });
});
