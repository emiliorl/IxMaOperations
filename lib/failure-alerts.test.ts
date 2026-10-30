import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));

const state = { sent: [] as { subject: string; lines: string[] }[], allowed: true, sendThrows: false };
vi.mock("./email", () => ({
  sendOwnerAlert: async (subject: string, lines: string[]) => {
    if (state.sendThrows) throw new Error("resend down");
    state.sent.push({ subject, lines });
    return true;
  },
}));
vi.mock("./rate-limit", () => ({ checkRateLimit: async () => ({ allowed: state.allowed, limit: 10, remaining: 1, retryAfterSeconds: 0 }) }));

beforeEach(() => {
  state.sent = [];
  state.allowed = true;
  state.sendThrows = false;
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("ALERT_ON_ERRORS", "");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

const load = async () => (await import("./failure-alerts")).alertOwnerOfFailure;

describe("telling the owner about a failure", () => {
  it("sends one email with what and where, in production", async () => {
    const alert = await load();
    await alert("booking", new Error("Failed to reserve slot"), { path: "/api/schedule/book", method: "POST" });
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].subject).toBe("[IxMa] booking: Failed to reserve slot");
  });

  it("the same problem repeating is one email, a different one is another", async () => {
    const alert = await load();
    await alert("booking", new Error("Failed to reserve slot (meeting 1)"));
    await alert("booking", new Error("Failed to reserve slot (meeting 2)"));
    await alert("booking", new Error("Failed to reserve slot (meeting 3)"));
    expect(state.sent).toHaveLength(1);
    await alert("booking", new Error("Google calendar is down"));
    expect(state.sent).toHaveLength(2);
  });

  it("says nothing about a redirect or a not-found", async () => {
    const alert = await load();
    await alert("page", Object.assign(new Error("x"), { digest: "NEXT_REDIRECT;replace;/portal;307;" }));
    await alert("page", Object.assign(new Error("x"), { digest: "NEXT_NOT_FOUND" }));
    expect(state.sent).toEqual([]);
  });

  it("says nothing while developing, unless asked to", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const alert = await load();
    await alert("booking", new Error("boom"));
    expect(state.sent).toEqual([]);
    vi.stubEnv("ALERT_ON_ERRORS", "true");
    vi.resetModules();
    await (await load())("booking", new Error("boom"));
    expect(state.sent).toHaveLength(1);
  });

  it("stops at the hourly cap, so an outage can't flood the inbox", async () => {
    state.allowed = false;
    const alert = await load();
    await alert("booking", new Error("a"));
    expect(state.sent).toEqual([]);
  });

  it("never throws, even when sending the email fails, and the failure is still logged", async () => {
    state.sendThrows = true;
    const alert = await load();
    await expect(alert("booking", new Error("boom"))).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("never includes a person's data", async () => {
    const alert = await load();
    await alert("booking", new Error("send failed for ana@example.com"), { path: "/api/schedule/book?ticket=secret" });
    const everything = JSON.stringify(state.sent);
    expect(everything).not.toContain("ana@example.com");
    expect(everything).not.toContain("ticket=secret");
  });
});
