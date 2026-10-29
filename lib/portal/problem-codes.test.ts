import { describe, expect, it } from "vitest";

const load = () => import("../../scripts/problem-codes.mjs");

describe("the prefix of a problem's ID", () => {
  it("is the first three letters of the area", async () => {
    const { areaPrefix } = await load();
    expect(areaPrefix("Finance")).toBe("FIN");
    expect(areaPrefix("Operations")).toBe("OPE");
    expect(areaPrefix("Finanzas")).toBe("FIN");
  });
  it("keeps a short name as it is and uses the initials of a long one", async () => {
    const { areaPrefix } = await load();
    expect(areaPrefix("HR")).toBe("HR");
    expect(areaPrefix("Human Resources")).toBe("HR");
    expect(areaPrefix("Recursos Humanos")).toBe("RH");
    expect(areaPrefix("Customer Success Team Mexico")).toBe("CST");
  });
  it("drops accents and symbols, so the prefix is always plain letters and digits", async () => {
    const { areaPrefix } = await load();
    expect(areaPrefix("Ópticas & Ventas")).toBe("OV");
    expect(areaPrefix("Ñandú")).toBe("NAN");
  });
  it("a problem for the whole project gets PRJ", async () => {
    const { areaPrefix } = await load();
    expect(areaPrefix(null)).toBe("PRJ");
    expect(areaPrefix("")).toBe("PRJ");
    expect(areaPrefix("!!!")).toBe("PRJ");
  });
});

describe("the next number", () => {
  it("starts at 1", async () => {
    const { nextProblemCode } = await load();
    expect(nextProblemCode("FIN", [])).toBe("FIN-1");
    expect(nextProblemCode("FIN", ["OPE-4", null])).toBe("FIN-1");
  });
  it("is one more than the highest, so a deleted number is never handed out again", async () => {
    const { nextProblemCode } = await load();
    expect(nextProblemCode("FIN", ["FIN-1", "FIN-3"])).toBe("FIN-4");
    expect(nextProblemCode("FIN", ["fin-9", "FIN-10"])).toBe("FIN-11");
  });
  it("ignores other prefixes and codes written by hand in another style", async () => {
    const { nextProblemCode } = await load();
    expect(nextProblemCode("FIN", ["DW-7", "FIN-A", "FINX-2"])).toBe("FIN-1");
  });
});

describe("filling in the missing IDs", () => {
  const items = [
    { id: "a", code: null, areaName: "Finance" },
    { id: "b", code: null, areaName: "Operations" },
    { id: "c", code: null, areaName: "Finance" },
    { id: "d", code: null, areaName: null },
  ];
  it("numbers each area on its own, in the order given", async () => {
    const { assignMissingCodes } = await load();
    expect(assignMissingCodes(items)).toEqual([
      { id: "a", code: "FIN-1" },
      { id: "b", code: "OPE-1" },
      { id: "c", code: "FIN-2" },
      { id: "d", code: "PRJ-1" },
    ]);
  });
  it("never changes an ID that exists, and continues after it", async () => {
    const { assignMissingCodes } = await load();
    const withOne = [{ id: "x", code: "FIN-5", areaName: "Finance" }, ...items];
    const result = assignMissingCodes(withOne);
    expect(result.find((r) => r.id === "x")).toBeUndefined();
    expect(result.filter((r) => r.code.startsWith("FIN")).map((r) => r.code)).toEqual(["FIN-6", "FIN-7"]);
  });
  it("does nothing when every problem already has an ID", async () => {
    const { assignMissingCodes } = await load();
    expect(assignMissingCodes([{ id: "a", code: "DW-1", areaName: "Finance" }])).toEqual([]);
  });
});
