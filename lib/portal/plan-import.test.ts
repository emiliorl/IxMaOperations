import { describe, expect, it } from "vitest";

// The importer is a plain .mjs script (it runs from the CLI); load it the same way field-crypto.test.ts loads the CLI crypto.
const load = () => import("../../scripts/plan-import.mjs");

const problem = (extra: Record<string, unknown> = {}) => ({ code: "X-1", title: "A problem", ...extra });

describe("plan import: validation", () => {
  it("accepts a minimal plan and fills in defaults", async () => {
    const { validatePlan } = await load();
    const result = validatePlan({ problems: [{ title: "First" }, { title: "Second" }] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.problems[0]).toMatchObject({ priority: "medium", status: "pending", links: [], order: 10, cost: undefined });
    expect(result.plan.problems[1].order).toBe(20);
  });

  it("rejects things that aren't a plan", async () => {
    const { validatePlan } = await load();
    expect(validatePlan(null).ok).toBe(false);
    expect(validatePlan([]).ok).toBe(false);
    expect(validatePlan({}).ok).toBe(false);
    expect(validatePlan({ problems: [] }).ok).toBe(false);
  });

  it("requires a title, and a known priority and status", async () => {
    const { validatePlan } = await load();
    const result = validatePlan({ problems: [{ code: "A" }, problem({ code: "B", priority: "urgent", status: "done" })] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join("\n")).toMatch(/problems\[0\]\.title: is required/);
    expect(result.errors.join("\n")).toMatch(/problems\[1\]\.priority/);
    expect(result.errors.join("\n")).toMatch(/problems\[1\]\.status/);
  });

  it("keeps each team's general information apart from the problems", async () => {
    const { validatePlan } = await load();
    const result = validatePlan({
      areas: [{ folder: "RRHH", overview: "## Equipo\n\n- Líder: Valeria" }],
      problems: [problem({ folder: "RRHH" })],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.areas).toEqual([{ folder: "RRHH", overview: "## Equipo\n\n- Líder: Valeria" }]);
    expect(result.plan.problems[0].solution).toBeNull();
    // No areas given is fine, and means "leave the teams' information alone".
    const plain = validatePlan({ problems: [problem()] });
    expect(plain.ok && plain.plan.areas).toEqual([]);
  });

  it("rejects team information without a folder or text, repeated folders, and prices in it", async () => {
    const { validatePlan } = await load();
    const bad = (areas: unknown) => validatePlan({ areas, problems: [problem()] });
    expect(bad("RRHH").ok).toBe(false);
    expect(bad([{ overview: "texto" }]).ok).toBe(false);
    expect(bad([{ folder: "RRHH" }]).ok).toBe(false);
    expect(bad([{ folder: "RRHH", overview: "a" }, { folder: "rrhh", overview: "b" }]).ok).toBe(false);
    expect(bad([{ folder: "RRHH", overview: "La licencia cuesta US$125 al mes" }]).ok).toBe(false);
  });

  it("rejects duplicate codes, ignoring case", async () => {
    const { validatePlan } = await load();
    const result = validatePlan({ problems: [problem({ code: "DW-1" }), problem({ code: "dw-1" })] });
    expect(result.ok).toBe(false);
  });

  it("rejects bad dates, orders and over-long text", async () => {
    const { validatePlan, LIMITS } = await load();
    expect(validatePlan({ problems: [problem({ due: "15/11/2026" })] }).ok).toBe(false);
    expect(validatePlan({ problems: [problem({ due: "2026-13-45" })] }).ok).toBe(false);
    expect(validatePlan({ problems: [problem({ due: "2026-11-15" })] }).ok).toBe(true);
    expect(validatePlan({ problems: [problem({ order: -1 })] }).ok).toBe(false);
    expect(validatePlan({ problems: [problem({ title: "x".repeat(LIMITS.title + 1) })] }).ok).toBe(false);
  });

  it("only keeps http(s) links and refuses anything else", async () => {
    const { validatePlan } = await load();
    const ok = validatePlan({ problems: [problem({ links: [{ label: "Brief", url: "https://drive.google.com/x" }, { url: "http://example.com/a" }] })] });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.plan.problems[0].links.map((l: { label: string }) => l.label)).toEqual(["Brief", "http://example.com/a"]);

    for (const url of ["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "not a url", ""]) {
      expect(validatePlan({ problems: [problem({ links: [{ url }] })] }).ok, url).toBe(false);
    }
  });
});

describe("plan import: prices only go in the cost field", () => {
  it("recognises prices written the usual ways", async () => {
    const { looksLikeMoney } = await load();
    for (const text of ["US$181 to US$383 per month", "costs $4", "about 125 USD", "€ 20", "300 pesos", "US$ 125", "12.50 dólares"]) {
      expect(looksLikeMoney(text), text).toBe(true);
    }
    for (const text of ["no third-party software", "Week 1: rules", "3 real renders for 2 weeks", "1.5x the target", "ChatGPT Team"]) {
      expect(looksLikeMoney(text), text).toBe(false);
    }
  });

  it("rejects a price in the overview, summary, solution, title, delivery or a link label", async () => {
    const { validatePlan } = await load();
    const price = "it costs US$125 a month";
    for (const plan of [
      { overview: price, problems: [problem()] },
      { problems: [problem({ summary: price })] },
      { problems: [problem({ solution: price })] },
      { problems: [problem({ title: price })] },
      { problems: [problem({ delivery: price })] },
      { problems: [problem({ links: [{ label: price, url: "https://x.test" }] })] },
    ]) {
      expect(validatePlan(plan).ok).toBe(false);
    }
  });

  it("allows the price in cost, and leaves cost untouched when it is absent", async () => {
    const { validatePlan } = await load();
    const withCost = validatePlan({ problems: [problem({ cost: "US$181–383 per month ceiling" })] });
    expect(withCost.ok).toBe(true);
    if (withCost.ok) expect(withCost.plan.problems[0].cost).toBe("US$181–383 per month ceiling");

    const without = validatePlan({ problems: [problem()] });
    expect(without.ok).toBe(true);
    if (without.ok) expect(without.plan.problems[0].cost).toBeUndefined(); // undefined = do not touch an existing cost

    const cleared = validatePlan({ problems: [problem({ cost: null })] });
    expect(cleared.ok).toBe(true);
    if (cleared.ok) expect(cleared.plan.problems[0].cost).toBeNull(); // null = remove it
  });
});
