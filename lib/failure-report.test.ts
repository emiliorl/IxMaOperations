import { describe, expect, it } from "vitest";
import { alertsEnabled, describeFailure, failureSignature, isExpectedError, redact } from "./failure-report";

describe("errors that are not failures", () => {
  it("a redirect, a not-found and a cancelled request are normal control flow", () => {
    expect(isExpectedError(Object.assign(new Error("x"), { digest: "NEXT_REDIRECT;replace;/portal;307;" }))).toBe(true);
    expect(isExpectedError(Object.assign(new Error("x"), { digest: "NEXT_NOT_FOUND" }))).toBe(true);
    expect(isExpectedError(Object.assign(new Error("x"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" }))).toBe(true);
    expect(isExpectedError(Object.assign(new Error("x"), { name: "AbortError" }))).toBe(true);
  });

  it("anything else is a failure", () => {
    expect(isExpectedError(new Error("Failed to reserve slot"))).toBe(false);
    expect(isExpectedError(Object.assign(new Error("boom"), { digest: "12345" }))).toBe(false);
    expect(isExpectedError("a string")).toBe(false);
    expect(isExpectedError(null)).toBe(false);
  });
});

describe("what is blanked before an error leaves in an email", () => {
  it("email addresses", () => {
    expect(redact("could not send to ana.perez+x@example.com now")).toBe("could not send to [email] now");
  });

  it("tokens: a JWT, a Bearer header, and a long key", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcDEFghiJKL";
    expect(redact(`session ${jwt} expired`)).toBe("session [token] expired");
    expect(redact("Authorization: Bearer sk_live_abc123")).toBe("Authorization: Bearer [token]");
    expect(redact("key=" + "a".repeat(40))).toBe("key=[secret]");
    expect(redact("a1b2c3d4e5f60718293a4b5c6d7e8f90")).toBe("[secret]");
  });

  it("query strings", () => {
    expect(redact("GET /api/schedule/book?project=domus&ticket=abc failed")).toBe("GET /api/schedule/book?[query] failed");
  });

  it("leaves an ordinary message alone", () => {
    expect(redact("Failed to reserve slot: duplicate key value")).toBe("Failed to reserve slot: duplicate key value");
  });
});

describe("telling problems apart", () => {
  it("the same problem has the same signature even when numbers and ids change", () => {
    const a = failureSignature("booking", new Error("Failed to reserve slot (meeting 123, id 6f1c9a52-1d2e-4f3a-9b8c-0a1b2c3d4e5f)"));
    const b = failureSignature("booking", new Error("Failed to reserve slot (meeting 456, id 11111111-2222-3333-4444-555555555555)"));
    expect(a).toBe(b);
  });

  it("different problems, kinds and error types differ", () => {
    const base = failureSignature("booking", new Error("Failed to reserve slot"));
    expect(failureSignature("booking", new Error("Google calendar is down"))).not.toBe(base);
    expect(failureSignature("cron", new Error("Failed to reserve slot"))).not.toBe(base);
    expect(failureSignature("booking", new TypeError("Failed to reserve slot"))).not.toBe(base);
  });

  it("is short and stable", () => {
    expect(failureSignature("x", new Error("y"))).toMatch(/^[0-9a-f]{16}$/);
    expect(failureSignature("x", new Error("y"))).toBe(failureSignature("x", new Error("y")));
  });
});

describe("when alerts are on", () => {
  it("in production, and not while developing", () => {
    expect(alertsEnabled({ NODE_ENV: "production" })).toBe(true);
    expect(alertsEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(alertsEnabled({})).toBe(false);
  });

  it("the setting wins either way", () => {
    expect(alertsEnabled({ NODE_ENV: "development", ALERT_ON_ERRORS: "true" })).toBe(true);
    expect(alertsEnabled({ NODE_ENV: "production", ALERT_ON_ERRORS: "false" })).toBe(false);
    expect(alertsEnabled({ NODE_ENV: "production", ALERT_ON_ERRORS: " FALSE " })).toBe(false);
  });
});

describe("the email", () => {
  const at = new Date("2026-10-30T14:00:00Z");

  it("says what and where, with a digest to find it in the logs", () => {
    const { subject, lines } = describeFailure({ kind: "booking", error: new Error("Failed to reserve slot"), path: "/api/schedule/book", method: "POST", digest: "987", at });
    expect(subject).toBe("[IxMa] booking: Failed to reserve slot");
    const body = lines.join("\n");
    expect(body).toContain("2026-10-30T14:00:00.000Z");
    expect(body).toContain("POST /api/schedule/book");
    expect(body).toContain("Error:   Error: Failed to reserve slot");
    expect(body).toContain("Digest:  987");
  });

  it("never carries a person's data: addresses and tokens are blanked, and the query string is dropped from the path", () => {
    const error = new Error("send failed for ana@example.com with Bearer abc.def.ghi");
    const { subject, lines } = describeFailure({ kind: "booking", error, path: "/api/schedule/book?project=domus&ticket=secret", at });
    const everything = [subject, ...lines].join("\n");
    expect(everything).not.toContain("ana@example.com");
    expect(everything).not.toContain("abc.def.ghi");
    expect(everything).not.toContain("project=domus");
    expect(everything).not.toContain("ticket=secret");
    expect(everything).toContain("/api/schedule/book");
  });

  it("copes with something that is not an Error", () => {
    const { subject, lines } = describeFailure({ kind: "cron", error: "just a string", at });
    expect(subject).toBe("[IxMa] cron: just a string");
    expect(lines.join("\n")).toContain("Error:   Error: just a string");
    expect(describeFailure({ kind: "cron", error: undefined, at }).subject).toBe("[IxMa] cron: unknown error");
  });

  it("keeps a long message in check", () => {
    const { subject, lines } = describeFailure({ kind: "x", error: new Error("boom ".repeat(200)), at });
    expect(subject.length).toBeLessThan(120);
    expect(lines.join("\n").length).toBeLessThan(2000);
  });
});
