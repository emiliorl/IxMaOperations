import { describe, expect, it } from "vitest";
import { configPresent, runCheck, summarize } from "./health";

describe("running a check", () => {
  it("ok when it finishes", async () => {
    expect(await runCheck(async () => "fine", 100)).toBe("ok");
  });

  it("fail when it throws, without throwing itself", async () => {
    expect(await runCheck(async () => Promise.reject(new Error("db down")), 100)).toBe("fail");
  });

  it("fail when it hangs: a hung dependency can't hang the monitor", async () => {
    const started = Date.now();
    expect(await runCheck(() => new Promise(() => undefined), 30)).toBe("fail");
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe("settings present", () => {
  it("ok only when every named setting has a value", () => {
    expect(configPresent({ A: "x", B: "y" }, ["A", "B"])).toBe("ok");
    expect(configPresent({ A: "x", B: "" }, ["A", "B"])).toBe("fail");
    expect(configPresent({ A: "x" }, ["A", "B"])).toBe("fail");
  });
});

describe("the whole answer", () => {
  it("healthy only when everything is", () => {
    expect(summarize({ config: "ok", database: "ok" }).ok).toBe(true);
    expect(summarize({ config: "ok", database: "fail" }).ok).toBe(false);
  });

  it("says ok or fail per check and nothing else", () => {
    expect(JSON.stringify(summarize({ database: "fail" }))).toBe('{"ok":false,"checks":{"database":"fail"}}');
  });
});
