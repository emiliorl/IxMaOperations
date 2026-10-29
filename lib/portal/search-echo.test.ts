import { describe, expect, it } from "vitest";
import { createSearchEcho } from "./search-echo";

describe("the search box and the page's late answers", () => {
  it("ignores the answer to something it asked for", () => {
    const echo = createSearchEcho("");
    echo.ask("inv");
    expect(echo.isNews("inv")).toBe(false);
  });

  it("ignores answers that arrive late or out of order while the person keeps typing", () => {
    const echo = createSearchEcho("");
    echo.ask("in");
    echo.ask("inv");
    echo.ask("invoi");
    // The answers come back in a different order than they were asked.
    for (const answer of ["inv", "in", "invoi", "inv"]) expect(echo.isNews(answer)).toBe(false);
  });

  it("ignores the answer for what the page already showed when it opened", () => {
    const echo = createSearchEcho("invoice");
    expect(echo.isNews("invoice")).toBe(false);
  });

  it("shows a search it did not ask for, such as a link that clears or changes it — once", () => {
    const echo = createSearchEcho("invoice");
    expect(echo.isNews("")).toBe(true);
    expect(echo.isNews("")).toBe(false);
    expect(echo.isNews("payroll")).toBe(true);
  });

  it("clearing the box on purpose is not news either", () => {
    const echo = createSearchEcho("invoice");
    echo.ask("");
    expect(echo.isNews("")).toBe(false);
  });
});
