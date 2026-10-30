import { describe, expect, it } from "vitest";
import { TWO_STEP_CODE, aalFromAccessToken, canRemoveFactor, normalizeCode, ownerTwoStepRequired, twoStepGate, verifiedTotpCount } from "./mfa";

/** An access token with the given claims (the signature is irrelevant here: only the payload is read). */
const token = (claims: Record<string, unknown>) => {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "HS256" })}.${part(claims)}.signature`;
};

describe("which authenticator apps count", () => {
  it("only confirmed ones: a setup that was started and never finished does not protect anything", () => {
    expect(verifiedTotpCount([{ status: "verified", factor_type: "totp" }])).toBe(1);
    expect(verifiedTotpCount([{ status: "unverified", factor_type: "totp" }])).toBe(0);
    expect(verifiedTotpCount([{ status: "verified", factor_type: "totp" }, { status: "verified", factor_type: "totp" }])).toBe(2);
  });

  it("is none for no factors at all", () => {
    expect(verifiedTotpCount([])).toBe(0);
    expect(verifiedTotpCount(null)).toBe(0);
    expect(verifiedTotpCount(undefined)).toBe(0);
  });

  it("ignores other kinds of factor", () => {
    expect(verifiedTotpCount([{ status: "verified", factor_type: "phone" }])).toBe(0);
  });
});

describe("how strongly the session was verified", () => {
  it("is aal2 only when the token says so", () => {
    expect(aalFromAccessToken(token({ aal: "aal2" }))).toBe("aal2");
    expect(aalFromAccessToken(token({ aal: "aal1" }))).toBe("aal1");
  });

  it("is aal1 whenever it cannot tell: no claim, a wrong value, no token, garbage", () => {
    expect(aalFromAccessToken(token({}))).toBe("aal1");
    expect(aalFromAccessToken(token({ aal: "AAL2" }))).toBe("aal1");
    expect(aalFromAccessToken(token({ aal: 2 }))).toBe("aal1");
    expect(aalFromAccessToken(undefined)).toBe("aal1");
    expect(aalFromAccessToken(null)).toBe("aal1");
    expect(aalFromAccessToken("")).toBe("aal1");
    expect(aalFromAccessToken("not-a-token")).toBe("aal1");
    expect(aalFromAccessToken("a.b.c")).toBe("aal1");
  });
});

describe("what a person must do before using the portal", () => {
  const owner = { isAdmin: true, ownerRequired: true };
  const client = { isAdmin: false, ownerRequired: true };

  it("anyone who has it set up must enter a code in this session", () => {
    expect(twoStepGate({ ...owner, verifiedFactors: 1, aal: "aal1" })).toBe("verify");
    expect(twoStepGate({ ...client, verifiedFactors: 1, aal: "aal1" })).toBe("verify");
    expect(twoStepGate({ ...owner, verifiedFactors: 1, aal: "aal2" })).toBe("ok");
    expect(twoStepGate({ ...client, verifiedFactors: 2, aal: "aal2" })).toBe("ok");
  });

  it("the owner without it is sent to set it up, however the session looks", () => {
    expect(twoStepGate({ ...owner, verifiedFactors: 0, aal: "aal1" })).toBe("enroll");
    expect(twoStepGate({ ...owner, verifiedFactors: 0, aal: "aal2" })).toBe("enroll");
  });

  it("a client without it is not asked for anything", () => {
    expect(twoStepGate({ ...client, verifiedFactors: 0, aal: "aal1" })).toBe("ok");
  });

  it("with the requirement switched off, the owner is not forced, but a code is still needed once it is set up", () => {
    expect(twoStepGate({ isAdmin: true, ownerRequired: false, verifiedFactors: 0, aal: "aal1" })).toBe("ok");
    expect(twoStepGate({ isAdmin: true, ownerRequired: false, verifiedFactors: 1, aal: "aal1" })).toBe("verify");
  });
});

describe("the requirement setting", () => {
  it("is on unless clearly switched off", () => {
    expect(ownerTwoStepRequired(undefined)).toBe(true);
    expect(ownerTwoStepRequired("")).toBe(true);
    expect(ownerTwoStepRequired("true")).toBe(true);
    expect(ownerTwoStepRequired("yes")).toBe(true);
    expect(ownerTwoStepRequired("anything else")).toBe(true);
  });

  it("is off for false, off, no or 0, in any case and with spaces", () => {
    for (const value of ["false", "FALSE", " off ", "No", "0"]) expect(ownerTwoStepRequired(value), value).toBe(false);
  });
});

describe("removing an authenticator app", () => {
  it("the owner cannot remove the last one while it is required, but can remove a spare", () => {
    expect(canRemoveFactor({ isAdmin: true, ownerRequired: true, verifiedFactors: 1 })).toBe(false);
    expect(canRemoveFactor({ isAdmin: true, ownerRequired: true, verifiedFactors: 2 })).toBe(true);
  });

  it("anyone else can, and so can the owner when it is not required", () => {
    expect(canRemoveFactor({ isAdmin: false, ownerRequired: true, verifiedFactors: 1 })).toBe(true);
    expect(canRemoveFactor({ isAdmin: true, ownerRequired: false, verifiedFactors: 1 })).toBe(true);
  });
});

describe("the code as typed", () => {
  it("drops the spaces and dashes an authenticator app shows", () => {
    expect(normalizeCode("123 456")).toBe("123456");
    expect(normalizeCode(" 123-456 ")).toBe("123456");
    expect(normalizeCode("123456")).toBe("123456");
  });

  it("accepts exactly six digits", () => {
    expect(TWO_STEP_CODE.test("123456")).toBe(true);
    for (const bad of ["12345", "1234567", "12345a", "", "12 3456", "１２３４５６"]) expect(TWO_STEP_CODE.test(bad), bad).toBe(false);
  });
});
