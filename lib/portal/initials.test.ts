import { describe, expect, it } from "vitest";
import { initialsOf } from "./initials";

describe("initials for the account button", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("Emilio Ramirez")).toBe("ER");
    expect(initialsOf("Ana María López Vega")).toBe("AM");
  });
  it("works with one word, accents and lowercase", () => {
    expect(initialsOf("carla")).toBe("C");
    expect(initialsOf("álvaro núñez")).toBe("ÁN");
  });
  it("ignores punctuation and brackets", () => {
    expect(initialsOf("(Marta) Finance")).toBe("MF");
    expect(initialsOf("  Omar   Ríos ")).toBe("OR");
  });
  it("falls back to a placeholder when there is no letter at all", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("—")).toBe("?");
  });
});
