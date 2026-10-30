import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A stand-in for Upstash: a sliding counter per identifier, with `limit` (spends one) and `getRemaining` (only reads). */
const store = { used: new Map<string, number>(), fail: false };

vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow(requests: number) {
      return requests;
    }
    private max: number;
    constructor(options: { limiter: number }) {
      this.max = options.limiter;
    }
    async limit(id: string) {
      if (store.fail) throw new Error("upstash down");
      const used = store.used.get(id) ?? 0;
      if (used >= this.max) return { success: false, limit: this.max, remaining: 0, reset: Date.now() + 90_000 };
      store.used.set(id, used + 1);
      return { success: true, limit: this.max, remaining: this.max - used - 1, reset: Date.now() + 90_000 };
    }
    async getRemaining(id: string) {
      if (store.fail) throw new Error("upstash down");
      return { remaining: this.max - (store.used.get(id) ?? 0), limit: this.max, reset: Date.now() + 90_000 };
    }
  }
  return { Ratelimit };
});

beforeEach(() => {
  store.used = new Map();
  store.fail = false;
  vi.resetModules();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
});
afterEach(() => vi.unstubAllEnvs());

describe("looking at a limit without spending it", () => {
  it("peeking never uses anything up, however often it is done", async () => {
    const { peekRateLimit } = await import("./rate-limit");
    for (let i = 0; i < 10; i++) expect((await peekRateLimit("book", "ip-1", 3, 3600)).allowed).toBe(true);
    expect((await peekRateLimit("book", "ip-1", 3, 3600)).remaining).toBe(3);
  });

  it("spending counts, and peeking then says when it is used up and how long to wait", async () => {
    const { peekRateLimit, checkRateLimit } = await import("./rate-limit");
    for (let i = 0; i < 3; i++) await checkRateLimit("book", "ip-1", 3, 3600);
    const left = await peekRateLimit("book", "ip-1", 3, 3600);
    expect(left).toMatchObject({ allowed: false, remaining: 0 });
    expect(left.retryAfterSeconds).toBeGreaterThan(0);
    // Someone else is unaffected.
    expect((await peekRateLimit("book", "ip-2", 3, 3600)).allowed).toBe(true);
  });

  it("when the limiter can't be read: open normally, closed when asked to fail closed", async () => {
    store.fail = true;
    const { peekRateLimit } = await import("./rate-limit");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await peekRateLimit("book", "ip-1", 3, 3600)).allowed).toBe(true);
    expect((await peekRateLimit("book", "ip-1", 3, 3600, { failClosed: true })).allowed).toBe(false);
  });

  it("with no Upstash configured: allowed in development, refused in production when failing closed", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("NODE_ENV", "development");
    const dev = await import("./rate-limit");
    expect((await dev.peekRateLimit("book", "ip-1", 3, 3600, { failClosed: true })).allowed).toBe(true);
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const prod = await import("./rate-limit");
    expect((await prod.peekRateLimit("book", "ip-1", 3, 3600, { failClosed: true })).allowed).toBe(false);
    expect((await prod.peekRateLimit("book", "ip-1", 3, 3600)).allowed).toBe(true);
  });
});
