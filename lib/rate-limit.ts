/**
 * lib/rate-limit.ts
 *
 * Per-IP sliding-window rate limiting for the two public POST routes
 * (app/api/examples/scrape, app/api/request), backed by Upstash Redis —
 * the correct store for this because Vercel runs each request on one of
 * many stateless serverless instances; an in-memory counter would reset on
 * every cold start and never be shared between concurrent instances,
 * making it a no-op under real abuse.
 *
 * Fails OPEN: if UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN aren't
 * set, or the Upstash call itself errors, requests are allowed through
 * rather than the route 500ing. A misconfigured or momentarily-unreachable
 * rate limiter degrading to "no rate limiting" is the safer failure mode
 * for a portfolio-site demo than an outage — it's a deterrent on top of
 * the existing SSRF/validation/size/timeout guards, not the only thing
 * standing between these routes and abuse.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the caller should retry — only meaningful when !allowed. */
  retryAfterSeconds: number;
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

if (!redis && process.env.NODE_ENV === "production") {
  // Loud in prod logs (not thrown — see file header on failing open), quiet
  // in local dev where most people won't have Upstash configured.
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — API routes are running with no rate limiting."
  );
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, requests: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null;
  let limiter = limiters.get(name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
      prefix: `ratelimit:${name}`,
      analytics: false,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

/** Best-effort client IP from the headers Vercel's proxy sets. Requests
 *  with neither header (shouldn't happen on Vercel; can happen in local
 *  dev) share one "unknown" bucket rather than bypassing the limiter. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimitOptions {
  /**
   * Deny instead of allow when the limiter is unconfigured or Upstash errors.
   * Use for routes with real side effects beyond a notification email (e.g.
   * writing to Google Calendar, auth attempts), where "no rate limiting" is
   * worse than a brief outage. Unconfigured still allows in local dev so the
   * app is usable without Upstash.
   */
  failClosed?: boolean;
}

export async function checkRateLimit(
  routeName: string,
  identifier: string,
  requests: number,
  windowSeconds: number,
  { failClosed = false }: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const open: RateLimitResult = { allowed: true, limit: requests, remaining: requests, retryAfterSeconds: 0 };
  const closed: RateLimitResult = { allowed: false, limit: requests, remaining: 0, retryAfterSeconds: 60 };
  const limiter = getLimiter(routeName, requests, windowSeconds);
  if (!limiter) {
    return failClosed && process.env.NODE_ENV === "production" ? closed : open;
  }
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return {
      allowed: success,
      limit,
      remaining,
      retryAfterSeconds: Math.max(0, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error(`[rate-limit] Upstash call failed for "${routeName}" — failing ${failClosed ? "closed" : "open"}.`, error);
    return failClosed ? closed : open;
  }
}
