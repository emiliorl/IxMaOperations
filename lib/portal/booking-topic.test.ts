import { describe, expect, it } from "vitest";
import { problemLabel, problemsForArea, resolveTopic, type TopicArea, type TopicProblem } from "./booking-topic";

const areas: TopicArea[] = [
  { id: "fin", name: "Finance" },
  { id: "ops", name: "Operations" },
];
const problems: TopicProblem[] = [
  { id: "p-fin", code: "FIN-1", title: "Invoices", priority: "high", areaId: "fin" },
  { id: "p-ops", code: "OPE-1", title: "Dispatch", priority: "low", areaId: "ops" },
  { id: "p-all", code: null, title: "Kickoff", priority: "medium", areaId: null },
];

describe("what a booking is about", () => {
  it("takes the area and the problem when they agree", () => {
    expect(resolveTopic({ areas, problems, areaId: "fin", problemId: "p-fin" })).toEqual({ areaId: "fin", problemId: "p-fin" });
  });

  it("lets a problem decide its own area, even when another area was asked for", () => {
    expect(resolveTopic({ areas, problems, areaId: "ops", problemId: "p-fin" })).toEqual({ areaId: "fin", problemId: "p-fin" });
    expect(resolveTopic({ areas, problems, problemId: "p-ops" })).toEqual({ areaId: "ops", problemId: "p-ops" });
  });

  it("keeps the chosen area for a problem that belongs to the whole project", () => {
    expect(resolveTopic({ areas, problems, areaId: "ops", problemId: "p-all" })).toEqual({ areaId: "ops", problemId: "p-all" });
    expect(resolveTopic({ areas, problems, problemId: "p-all" })).toEqual({ areaId: null, problemId: "p-all" });
  });

  it("accepts an area alone, and nothing at all", () => {
    expect(resolveTopic({ areas, problems, areaId: "ops" })).toEqual({ areaId: "ops", problemId: null });
    expect(resolveTopic({ areas, problems })).toEqual({ areaId: null, problemId: null });
    expect(resolveTopic({ areas, problems, areaId: "", problemId: "" })).toEqual({ areaId: null, problemId: null });
  });

  it("ignores anything the person cannot open: unknown ids, other teams' problems, made-up values", () => {
    // Only Finance is available to this person: the Operations problem is not in their list at all.
    const onlyFinance = { areas: [areas[0]], problems: [problems[0], problems[2]] };
    expect(resolveTopic({ ...onlyFinance, areaId: "ops", problemId: "p-ops" })).toEqual({ areaId: null, problemId: null });
    expect(resolveTopic({ ...onlyFinance, areaId: "nope", problemId: "00000000-0000-0000-0000-000000000000" })).toEqual({ areaId: null, problemId: null });
    // A problem whose area the person cannot open does not smuggle that area in.
    expect(resolveTopic({ areas: [areas[0]], problems, problemId: "p-ops" }).areaId).toBeNull();
  });
});

describe("which problems to offer", () => {
  it("offers the chosen area's own problems plus the project-wide ones", () => {
    expect(problemsForArea(problems, "fin").map((p) => p.id)).toEqual(["p-fin", "p-all"]);
    expect(problemsForArea(problems, "ops").map((p) => p.id)).toEqual(["p-ops", "p-all"]);
  });

  it("offers all of them when no area is chosen", () => {
    expect(problemsForArea(problems, null)).toHaveLength(3);
  });

  it("labels a problem with its ID when it has one", () => {
    expect(problemLabel(problems[0])).toBe("FIN-1 · Invoices");
    expect(problemLabel(problems[2])).toBe("Kickoff");
  });
});
