import { describe, expect, it } from "vitest";
import { formatVisit } from "./onsite-format";

const visit = { date: "2026-11-05", start: "10:00", end: "15:30" };
const host = "America/Mexico_City"; // UTC-6

describe("how a day at the office reads", () => {
  it("names the day in the viewer's language, with a capital letter", () => {
    expect(formatVisit(visit, "en", host, host).day).toBe("Thursday, November 5");
    expect(formatVisit(visit, "es", host, host).day).toBe("Jueves, 5 de noviembre");
  });
  it("shows the hours on the viewer's own clock", () => {
    expect(formatVisit(visit, "en", host, host).hours).toMatch(/10:00\sAM\s–\s3:30\sPM/);
    // Someone in Madrid (UTC+1 in November) reads the same hours seven hours later.
    expect(formatVisit(visit, "en", "Europe/Madrid", host).hours).toMatch(/5:00\sPM\s–\s10:30\sPM/);
  });
  it("uses the language's own clock style", () => {
    expect(formatVisit(visit, "es", "Europe/Madrid", host).hours).toMatch(/17:00\s–\s22:30/);
  });
});
