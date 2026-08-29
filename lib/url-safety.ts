/**
 * lib/url-safety.ts
 *
 * SSRF guard for app/api/examples/scrape/route.ts, which fetches whatever
 * public URL a visitor types in (CAPABILITY_DEMOS_PLAN.md Phase 1). Without
 * this, that endpoint would happily fetch `http://169.254.169.254/...` or
 * `http://localhost:5432/...` on the server's behalf. Blocks non-HTTP(S)
 * schemes, loopback/private/link-local IPv4 ranges, IPv6 literals, and
 * non-default ports.
 *
 * Called once against the requested URL and again against every redirect
 * hop in route.ts's manual redirect loop — a public URL can still 302 into
 * a private one, so checking only the first URL isn't enough.
 *
 * Hostname-based only: this does not resolve DNS itself, so it can't catch
 * a DNS-rebinding attack where a public hostname later resolves to a
 * private IP at fetch time. Good enough for a best-effort demo endpoint
 * that also runs under a request timeout and a response size cap — not a
 * hardened forward proxy.
 */

const BLOCKED_HOSTNAME_PATTERNS = [/^localhost$/i, /^0\.0\.0\.0$/, /\.local$/i, /\.internal$/i];

function isPrivateIPv4(hostname: string): boolean {
  const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = [m[1], m[2], m[3], m[4]].map(Number);
  if (octets.some((n) => n > 255)) return false;
  const [a, b] = octets;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 — includes cloud metadata endpoints
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 0) return true; // 0.0.0.0/8
  return false;
}

export class UnsafeUrlError extends Error {}

export function assertPublicHttpUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http:// and https:// URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();

  // IPv6 literals come back bracketed (e.g. "[::1]"). Reject them outright
  // rather than replicate the private-range table for IPv6 — every sample
  // and realistic demo target here is reached over IPv4 or a hostname.
  if (hostname.startsWith("[")) {
    throw new UnsafeUrlError("That host isn't reachable from this demo.");
  }

  if (BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(hostname)) || isPrivateIPv4(hostname)) {
    throw new UnsafeUrlError("That host isn't reachable from this demo.");
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new UnsafeUrlError("Only default HTTP/HTTPS ports are supported.");
  }

  return url;
}
