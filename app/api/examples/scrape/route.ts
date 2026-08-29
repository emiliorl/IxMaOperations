/**
 * app/api/examples/scrape/route.ts
 *
 * Phase 1 of CAPABILITY_DEMOS_PLAN.md — the real scrape-and-enrich engine
 * behind components/examples/ScraperDemo.tsx. Fetches a visitor-supplied
 * public URL server-side (a browser can't fetch arbitrary cross-origin HTML
 * to inspect it) and extracts page identity, OpenGraph/Twitter Card data,
 * JSON-LD, technology fingerprints, and contact/social leads via
 * lib/scraper-engine.ts.
 *
 * Runs on the Node runtime (the default for a route handler) rather than
 * Edge — nothing here needs Edge, and Node's fewer restrictions leave room
 * for heavier parsing later.
 *
 * Security: this endpoint fetches whatever URL a visitor gives it, which is
 * a classic SSRF surface. lib/url-safety.ts's assertPublicHttpUrl() is
 * re-checked against every redirect hop (not just the original URL — a
 * public URL can still 302 into a private one), redirects are followed
 * manually so an unsafe hop is never actually requested, the fetch is
 * time-boxed, and the response body is read with a hard size cap.
 *
 * Accuracy: a lot of real homepages don't expose an email or social link at
 * all (VC-backed SaaS sites route everything through a contact form on
 * purpose) or only render their footer client-side, which this endpoint —
 * deliberately not running a headless browser — can't see. When the
 * homepage comes up short on emails/LinkedIn, we make one extra bounded
 * attempt at `/contact` on the same origin (tryEnrichLeadsFromContactPage)
 * before giving up; see lib/scraper-engine.ts's leads section for the rest
 * of the accuracy work (JSON-LD `sameAs`/`email`, Cloudflare email
 * deobfuscation, scanning full HTML instead of just `<a href>`).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPublicHttpUrl, UnsafeUrlError } from "@/lib/url-safety";
import { buildScrapeResult, extractEmails, extractSocialLeads, mergeLeads, type ScrapeLeads } from "@/lib/scraper-engine";

const bodySchema = z.object({ url: z.string().trim().min(1, "Enter a URL.") });

const FETCH_TIMEOUT_MS = 8000;
const CONTACT_PAGE_TIMEOUT_MS = 4000; // shorter — this is a best-effort bonus fetch, not the main request
const MAX_BYTES = 2_000_000; // 2MB cap so a huge page can't stall or blow up the demo
const MAX_REDIRECTS = 5;
const USER_AGENT = "Mozilla/5.0 (compatible; IxMaOperationsScraperDemo/1.0; +https://ixmaoperations.com)";

class ScrapeFetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Follows redirects by hand (rather than `redirect: "follow"`) so each hop
 * can be validated by assertPublicHttpUrl() *before* it's requested — a
 * public URL that redirects to a private one would otherwise still get
 * fetched by the time we could inspect `res.url`.
 */
async function fetchPublicHtml(
  startUrl: URL,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<{ res: Response; finalUrl: URL }> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      throw new ScrapeFetchError(timedOut ? "The page took too long to respond." : "Couldn't reach that URL.", 502);
    } finally {
      clearTimeout(timeout);
    }

    const isRedirect = res.status >= 300 && res.status < 400;
    const location = res.headers.get("location");
    if (isRedirect && location) {
      if (hop === MAX_REDIRECTS) {
        throw new ScrapeFetchError("That URL redirected too many times.", 502);
      }
      let next: URL;
      try {
        next = assertPublicHttpUrl(new URL(location, current.toString()).toString());
      } catch (error) {
        if (error instanceof UnsafeUrlError) {
          throw new ScrapeFetchError("That URL redirected somewhere this demo won't follow.", 400);
        }
        throw new ScrapeFetchError("That URL redirected somewhere invalid.", 400);
      }
      current = next;
      continue;
    }

    return { res, finalUrl: current };
  }

  throw new ScrapeFetchError("That URL redirected too many times.", 502);
}

/** Same size cap as the main body read, but never throws/reports an error —
 *  this backs a best-effort bonus fetch, so any failure just means "no
 *  extra leads," not a request failure. */
async function readBodyCappedSilent(res: Response, maxBytes: number): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
}

/**
 * Best-effort second fetch of `/contact` on the same origin, tried only
 * when the homepage's own leads came up short (see the accuracy note atop
 * this file). Every failure mode — blocked by url-safety, network error,
 * timeout, non-HTML, oversized, 404 — resolves to `null` rather than
 * throwing, since this is a bonus, not a requirement.
 */
async function tryEnrichLeadsFromContactPage(baseUrl: URL): Promise<ScrapeLeads | null> {
  let contactUrl: URL;
  try {
    contactUrl = assertPublicHttpUrl(new URL("/contact", baseUrl).toString());
  } catch {
    return null;
  }

  let res: Response;
  try {
    ({ res } = await fetchPublicHtml(contactUrl, CONTACT_PAGE_TIMEOUT_MS));
  } catch {
    return null;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return null;

  const html = await readBodyCappedSilent(res, MAX_BYTES);
  if (!html) return null;

  return { emails: extractEmails(html), ...extractSocialLeads(html, contactUrl.hostname) };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid URL." }, { status: 400 });
  }

  let target: URL;
  try {
    target = assertPublicHttpUrl(parsed.data.url);
  } catch (error) {
    const message = error instanceof UnsafeUrlError ? error.message : "Invalid URL.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const startedAt = Date.now();

  let res: Response;
  let finalUrl: URL;
  try {
    ({ res, finalUrl } = await fetchPublicHtml(target));
  } catch (error) {
    if (error instanceof ScrapeFetchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Couldn't reach that URL." }, { status: 502 });
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    return NextResponse.json(
      { error: `That URL returned ${contentType || "a non-HTML response"}, not an HTML page.` },
      { status: 415 }
    );
  }

  const reader = res.body?.getReader();
  if (!reader) {
    return NextResponse.json({ error: "Couldn't read a response body from that URL." }, { status: 502 });
  }

  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: "That page is too large for this demo to scan." }, { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return NextResponse.json({ error: "The connection dropped while reading that page." }, { status: 502 });
  }

  const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");

  const result = buildScrapeResult({
    requestedUrl: parsed.data.url,
    resolvedUrl: finalUrl.toString(),
    html,
    httpStatus: res.status,
    headers: res.headers,
  });

  // The homepage often doesn't carry an email or LinkedIn link even when
  // the site publishes one elsewhere — give /contact one bounded shot
  // before returning empty-handed on those two.
  if (result.leads.emails.length === 0 || result.leads.linkedin.length === 0) {
    const contactLeads = await tryEnrichLeadsFromContactPage(finalUrl);
    if (contactLeads) {
      result.leads = mergeLeads(result.leads, contactLeads);
    }
  }

  return NextResponse.json({ ok: true, data: result, elapsedMs: Date.now() - startedAt });
}
