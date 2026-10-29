import { describe, expect, it } from "vitest";
import { initialArea, showAreaPicker } from "./ticket-form";

describe("when the ticket form asks for an area", () => {
  it("only when there is a real choice", () => {
    expect(showAreaPicker(2, null)).toBe(true);
    expect(showAreaPicker(3, null)).toBe(true);
    expect(showAreaPicker(1, null)).toBe(false); // nothing to choose between
    expect(showAreaPicker(0, null)).toBe(false);
  });
  it("never when the plan item already belongs to an area", () => {
    expect(showAreaPicker(3, "fin")).toBe(false);
  });
});

describe("which area the ticket form starts on", () => {
  const areas = [{ id: "fin" }, { id: "ops" }];
  it("the only area, when there is only one", () => {
    expect(initialArea([{ id: "fin" }], undefined)).toBe("fin");
    expect(initialArea([{ id: "fin" }], "ops")).toBe("fin");
  });
  it("the area they were looking at, if they may file there", () => {
    expect(initialArea(areas, "ops")).toBe("ops");
  });
  it("nothing (whole project) when the requested area isn't one they can use, or none was asked for", () => {
    expect(initialArea(areas, "hr")).toBe("");
    expect(initialArea(areas, undefined)).toBe("");
    expect(initialArea([], "fin")).toBe("");
  });
});
