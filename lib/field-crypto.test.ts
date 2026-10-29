import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { blindIndex, decryptField, decryptLoose, decryptOptional, encryptField, encryptOptional, isCiphertext } from "./field-crypto";

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

describe("portal text columns", () => {
  it("decryptLoose decrypts ciphertext and passes legacy plaintext through unchanged", () => {
    expect(decryptLoose(encryptField("Checkout is broken"))).toBe("Checkout is broken");
    expect(decryptLoose("old readable ticket title")).toBe("old readable ticket title");
    expect(decryptLoose("v1.looks.like.ciphertext but is not")).toBe("v1.looks.like.ciphertext but is not");
    expect(decryptLoose(null)).toBeNull();
    expect(decryptLoose(undefined)).toBeNull();
  });

  it("decryptLoose THROWS on ciphertext that fails to authenticate, never shows garbage", () => {
    const parts = encryptField("secret").split(".");
    const flipped = Buffer.from(parts[3], "base64url");
    flipped[0] ^= 0xff;
    parts[3] = flipped.toString("base64url");
    expect(() => decryptLoose(parts.join("."))).toThrow();

    const token = encryptField("secret");
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptLoose(token)).toThrow();
  });

  it("isCiphertext recognizes real ciphertext only", () => {
    expect(isCiphertext(encryptField(""))).toBe(true);
    expect(isCiphertext(encryptField("hola"))).toBe(true);
    expect(isCiphertext("hola")).toBe(false);
    expect(isCiphertext("")).toBe(false);
  });

  it("blindIndex is stable, ignores case and spaces, and differs per value and per key", () => {
    const a = blindIndex("Ana@Acme.com");
    expect(a).toBe(blindIndex("  ana@acme.com "));
    expect(a).not.toBe(blindIndex("ana@acme.org"));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("ana");
    process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(blindIndex("ana@acme.com")).not.toBe(a);
  });

  it("the owner CLI's crypto and the app's crypto read each other's output", async () => {
    const cli = await import("../scripts/crypto.mjs");
    expect(decryptField(cli.encryptField("written by the CLI"))).toBe("written by the CLI");
    expect(cli.decryptField(encryptField("written by the app"))).toBe("written by the app");
    expect(cli.decryptLoose("plain legacy text")).toBe("plain legacy text");
    expect(cli.blindIndex("Ana@Acme.com")).toBe(blindIndex("ana@acme.com"));
  });
});
