import { describe, expect, it } from "vitest";
import { isLunchEventTitle, parseOverrideTitle } from "./google-calendar";

describe("isLunchEventTitle", () => {
  it("matches standard lunch event titles in English and Spanish", () => {
    expect(isLunchEventTitle("Lunch")).toBe(true);
    expect(isLunchEventTitle("lunch")).toBe(true);
    expect(isLunchEventTitle("Lunch Break")).toBe(true);
    expect(isLunchEventTitle("Comida")).toBe(true);
    expect(isLunchEventTitle("comida")).toBe(true);
    expect(isLunchEventTitle("Hora de comida")).toBe(true);
    expect(isLunchEventTitle("Almuerzo")).toBe(true);
    expect(isLunchEventTitle("almuerzo")).toBe(true);
  });

  it("does not match non-lunch events", () => {
    expect(isLunchEventTitle("Launch meeting")).toBe(false);
    expect(isLunchEventTitle("Product launch")).toBe(false);
    expect(isLunchEventTitle("Project review")).toBe(false);
    expect(isLunchEventTitle("")).toBe(false);
    expect(isLunchEventTitle(undefined)).toBe(false);
  });
});

describe("parseOverrideTitle", () => {
  it("identifies availability overrides", () => {
    expect(parseOverrideTitle("IN-PERSON")).toBe("IN_PERSON");
    expect(parseOverrideTitle("On-site")).toBe("IN_PERSON");
    expect(parseOverrideTitle("Online-only")).toBe("ONLINE_ONLY");
    expect(parseOverrideTitle("OFF")).toBe("OFF");
    expect(parseOverrideTitle("Random meeting")).toBeNull();
  });
});

describe("live calendar lunch fetch", () => {
  it("detects Thursday Nov 12 lunch event if Google credentials exist", async () => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) return;
    const { getHostLunchEvents } = await import("./google-calendar");
    const { zonedTimeToUtc, localDate } = await import("./tz");
    const tz = "America/Guatemala";
    const from = zonedTimeToUtc("2026-11-12", "00:00", tz);
    const to = zonedTimeToUtc("2026-11-12", "23:59", tz);
    const lunches = await getHostLunchEvents(from, to);
    expect(lunches.length).toBeGreaterThan(0);
    expect(lunches[0].summary).toBe("Lunch");
    expect(localDate(lunches[0].start, tz)).toBe("2026-11-12");
  });
});
