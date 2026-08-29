/**
 * lib/scraper-engine.ts
 *
 * Pure HTML-parsing helpers behind the Phase 1 "Scraping & Enrichment" demo
 * (CAPABILITY_DEMOS_PLAN.md Phase 1). Kept dependency-free — regex/string
 * based, not a full DOM parser — which is enough for the <head> section and
 * common markup patterns of real public sites without pulling in
 * cheerio/jsdom for a lightweight demo endpoint.
 *
 * Consumed by app/api/examples/scrape/route.ts (server-side extraction);
 * the exported types are also imported by components/examples/ScraperDemo.tsx
 * for typing the fetched response.
 */

export interface ScrapeIdentity {
  title: string | null;
  description: string | null;
  favicon: string | null;
  canonicalUrl: string | null;
}

export interface ScrapeOpenGraph {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  type: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterImage: string | null;
}

export interface ScrapeLeads {
  emails: string[];
  twitter: string[];
  linkedin: string[];
  github: string[];
}

export interface ScrapeResult {
  requestedUrl: string;
  resolvedUrl: string;
  fetchedAt: string;
  httpStatus: number;
  contentType: string | null;
  identity: ScrapeIdentity;
  openGraph: ScrapeOpenGraph;
  jsonLd: unknown[];
  technologies: string[];
  leads: ScrapeLeads;
}

// --- low-level tag/attribute helpers ------------------------------------

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function matchAttr(tag: string, attr: string): string | null {
  const re = new RegExp(`${attr}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i");
  const m = tag.match(re);
  if (!m) return null;
  return decodeEntities((m[2] ?? m[3] ?? "").trim());
}

function getMetaTags(html: string): string[] {
  return html.match(/<meta\b[^>]*>/gi) ?? [];
}

function getLinkTags(html: string): string[] {
  return html.match(/<link\b[^>]*>/gi) ?? [];
}

function findMeta(metaTags: string[], key: "name" | "property", value: string): string | null {
  const tag = metaTags.find((t) => matchAttr(t, key)?.toLowerCase() === value.toLowerCase());
  return tag ? matchAttr(tag, "content") : null;
}

function resolveUrl(href: string | null, baseUrl: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

// --- identity / social metadata ------------------------------------------

export function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1].trim()) || null : null;
}

export function extractIdentity(html: string, baseUrl: string): ScrapeIdentity {
  const metaTags = getMetaTags(html);
  const linkTags = getLinkTags(html);

  const description = findMeta(metaTags, "name", "description");

  const canonicalTag = linkTags.find((t) => matchAttr(t, "rel")?.toLowerCase() === "canonical");
  const canonicalUrl = canonicalTag ? resolveUrl(matchAttr(canonicalTag, "href"), baseUrl) : null;

  const iconTag = linkTags.find((t) => {
    const rel = matchAttr(t, "rel")?.toLowerCase() ?? "";
    return rel === "icon" || rel === "shortcut icon" || rel.includes("apple-touch-icon");
  });
  const favicon = iconTag ? resolveUrl(matchAttr(iconTag, "href"), baseUrl) : resolveUrl("/favicon.ico", baseUrl);

  return {
    title: extractTitle(html),
    description,
    favicon,
    canonicalUrl,
  };
}

export function extractOpenGraph(html: string): ScrapeOpenGraph {
  const metaTags = getMetaTags(html);
  return {
    title: findMeta(metaTags, "property", "og:title"),
    description: findMeta(metaTags, "property", "og:description"),
    image: findMeta(metaTags, "property", "og:image"),
    siteName: findMeta(metaTags, "property", "og:site_name"),
    type: findMeta(metaTags, "property", "og:type"),
    twitterCard: findMeta(metaTags, "name", "twitter:card"),
    twitterTitle: findMeta(metaTags, "name", "twitter:title"),
    twitterImage: findMeta(metaTags, "name", "twitter:image"),
  };
}

export function extractJsonLd(html: string): unknown[] {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const results: unknown[] = [];
  for (const block of blocks) {
    const inner = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(inner.trim());
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch {
      // Malformed JSON-LD on the live page — skip it rather than fail the whole scrape.
    }
  }
  return results;
}

// --- technology fingerprinting --------------------------------------------

const TECH_SIGNATURES: Array<{ name: string; test: (html: string, headers: Headers) => boolean }> = [
  { name: "Next.js", test: (html) => /__NEXT_DATA__|\/_next\/static\//.test(html) },
  { name: "React", test: (html) => /data-reactroot|react-dom(\.production)?(\.min)?\.js/.test(html) },
  { name: "Vue.js", test: (html) => /data-v-[0-9a-f]{6,}|__VUE__/.test(html) },
  { name: "WordPress", test: (html) => /wp-content|wp-includes/i.test(html) },
  {
    name: "Shopify",
    test: (html, headers) => /cdn\.shopify\.com|Shopify\.theme/i.test(html) || headers.has("x-shopify-stage"),
  },
  { name: "Webflow", test: (html) => /data-wf-site|assets\.website-files\.com/i.test(html) },
  { name: "Squarespace", test: (html) => /squarespace\.com|static1\.squarespace\.com/i.test(html) },
  { name: "Wix", test: (html) => /static\.wixstatic\.com/i.test(html) },
  {
    name: "Tailwind CSS",
    test: (html) => /tailwindcss/i.test(html) || /class="[^"]*\b(?:flex|grid)\b[^"]*\b(?:px-\d|py-\d|gap-\d)/.test(html),
  },
  { name: "Google Tag Manager", test: (html) => /googletagmanager\.com/i.test(html) },
  {
    name: "Cloudflare",
    test: (_html, headers) => headers.has("cf-ray") || (headers.get("server") ?? "").toLowerCase().includes("cloudflare"),
  },
];

export function detectTechnologies(html: string, headers: Headers): string[] {
  return TECH_SIGNATURES.filter((sig) => sig.test(html, headers)).map((sig) => sig.name);
}

// --- contact & social leads -------------------------------------------------
//
// Two independent signal sources are merged for every lead type:
//  1. JSON-LD (`sameAs` / `email` on Organization-style nodes) — always
//     present in the server-rendered HTML (JSON-LD is never client-hydrated
//     the way a React/Vue footer can be), so it's the more reliable source
//     when a site publishes it. Checked first so it wins dedupe ties.
//  2. A regex scan of the *entire* raw HTML, not just <a href> attributes —
//     catches links embedded in inline JSON blobs (e.g. Next.js's
//     `__NEXT_DATA__` script tag, which is server-rendered and often
//     carries footer/nav link data even on pages whose visible DOM is
//     built client-side).
//
// This still can't see anything that only exists after client-side JS runs
// with no server-rendered trace of it (no headless browser here — see
// Section 1 of CAPABILITY_DEMOS_PLAN.md), and it can't find an email a site
// simply never publishes. app/api/examples/scrape/route.ts additionally
// retries once against `/contact` when the homepage turns up no email or
// LinkedIn lead.
//
// One false-positive source worth calling out: stripe.com's homepage
// scans clean for `<a href>`/JSON-LD/Cloudflare emails, but a loose
// full-text scan alone picks up "jane.diaz@stripe.com" — a placeholder
// customer address baked into a `<script>` JSON blob that drives a
// checkout-mockup graphic, not a real contact. The free-text EMAIL_RE pass
// below runs against `stripScriptsAndStyles(html)` for exactly this
// reason — `<script>`/`<style>` bodies are full of generated IDs, i18n
// keys, and demo data that happen to match `word@word.tld`, whereas the
// visible page text and actual `<a href="mailto:...">`/JSON-LD signals
// (both checked separately, against the untouched HTML) are what a
// human visitor would actually find and trust.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_TEST_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
const PLACEHOLDER_DOMAINS = ["example.com", "sentry.io", "wixpress.com", "sentry-cdn.com"];

function dedupeCap(items: string[], cap: number): string[] {
  return Array.from(new Set(items)).slice(0, cap);
}

function stripScriptsAndStyles(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
}

/** `placeholder="you@domain.com"` is a form hint, not data — the HTML spec
 *  defines it as example text, never a real value. Stripped before the
 *  free-text email scan so hint text on a signup input can't masquerade as
 *  a found contact address (seen live on github.com's own homepage). */
function stripPlaceholderAttrs(html: string): string {
  return html.replace(/\splaceholder=["'][^"']*["']/gi, "");
}

/** Decodes Cloudflare's "email protection" obfuscation: the first hex byte
 *  is an XOR key applied to the rest. Used by sites that swap real mailto:
 *  addresses and visible text for this encoding to block plain scrapers —
 *  which otherwise made those emails invisible to a non-JS fetch. */
function decodeCfEmail(hex: string): string | null {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length < 4 || hex.length % 2 !== 0) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  }
  return EMAIL_TEST_RE.test(out) ? out : null;
}

function extractCfEmails(html: string): string[] {
  const spanHexes = Array.from(html.matchAll(/data-cfemail=["']([a-fA-F0-9]+)["']/g), (m) => m[1]);
  const hrefHexes = Array.from(html.matchAll(/\/cdn-cgi\/l\/email-protection#([a-fA-F0-9]+)/g), (m) => m[1]);
  return spanHexes
    .concat(hrefHexes)
    .map(decodeCfEmail)
    .filter((e): e is string => Boolean(e));
}

export function extractEmails(html: string): string[] {
  const mailtoMatches = Array.from(html.matchAll(/href=["']mailto:([^"'?]+)["']/gi), (m) => m[1]);
  const textMatches = stripPlaceholderAttrs(stripScriptsAndStyles(html)).match(EMAIL_RE) ?? [];
  const cfMatches = extractCfEmails(html);
  const all = mailtoMatches
    .concat(textMatches, cfMatches)
    .map((e) => decodeEntities(e).trim().toLowerCase())
    .filter((e) => !IMAGE_EXT_RE.test(e) && !PLACEHOLDER_DOMAINS.some((d) => e.endsWith(d)));
  return dedupeCap(all, 10);
}

const RESERVED_TWITTER_HANDLES = new Set([
  "intent", "share", "hashtag", "search", "home", "i", "tos", "privacy", "settings", "messages", "notifications", "explore", "login", "signup",
]);
const RESERVED_GITHUB_HANDLES = new Set([
  "sponsors", "marketplace", "topics", "features", "about", "orgs", "apps", "settings", "notifications", "issues", "pulls", "login", "join",
  "site", "security", "pricing", "enterprise", "customer-stories", "readme", "collections", "explore", "new", "dashboard", "team", "resources",
  "solutions", "why-github", "mcp", "copilot", "education", "contact", "trust-center", "accessibility", "changelog",
]);

/** Domains a page-under-test could never legitimately have a "lead" for
 *  because they *are* the page's own domain (e.g. scraping github.com's own
 *  homepage otherwise turns its internal nav links — github.com/team,
 *  github.com/resources — into false "GitHub leads"). `pageHostname` is the
 *  resolved page's own host; matches on it are dropped for that platform. */
const PLATFORM_HOSTS = {
  twitter: ["twitter.com", "x.com"],
  linkedin: ["linkedin.com"],
  github: ["github.com"],
} as const;

function isSamePlatformHost(pageHostname: string | undefined, platform: keyof typeof PLATFORM_HOSTS): boolean {
  if (!pageHostname) return false;
  const host = pageHostname.toLowerCase();
  return PLATFORM_HOSTS[platform].some((d) => host === d || host.endsWith(`.${d}`));
}

function extractTwitterHandles(html: string, pageHostname?: string): string[] {
  if (isSamePlatformHost(pageHostname, "twitter")) return [];
  const handles = Array.from(
    html.matchAll(/(?:https?:)?\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,30})(?=[/?#"'\s]|$)/gi),
    (m) => m[1]
  ).filter((h) => !RESERVED_TWITTER_HANDLES.has(h.toLowerCase()));
  return dedupeCap(handles.map((h) => `https://x.com/${h}`), 5);
}

function extractLinkedinLeads(html: string, pageHostname?: string): string[] {
  if (isSamePlatformHost(pageHostname, "linkedin")) return [];
  const matches = Array.from(
    html.matchAll(/(?:https?:)?\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(company|in|showcase|school)\/([A-Za-z0-9\-_%.]{1,100})/gi),
    (m) => `https://www.linkedin.com/${m[1].toLowerCase()}/${m[2]}`
  );
  return dedupeCap(matches, 5);
}

function extractGithubLeads(html: string, pageHostname?: string): string[] {
  if (isSamePlatformHost(pageHostname, "github")) return [];
  const handles = Array.from(
    html.matchAll(/(?:https?:)?\/\/(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})(?=[/?#"'\s]|$)/gi),
    (m) => m[1]
  ).filter((h) => !RESERVED_GITHUB_HANDLES.has(h.toLowerCase()));
  return dedupeCap(handles.map((h) => `https://github.com/${h}`), 5);
}

export function extractSocialLeads(html: string, pageHostname?: string): Omit<ScrapeLeads, "emails"> {
  return {
    twitter: extractTwitterHandles(html, pageHostname),
    linkedin: extractLinkedinLeads(html, pageHostname),
    github: extractGithubLeads(html, pageHostname),
  };
}

/** Walks JSON-LD nodes (including `@graph` arrays some sites nest their
 *  entities under) for `email` and `sameAs` — the schema.org-standard way
 *  an Organization declares its contact address and social profiles. */
function flattenJsonLdNodes(nodes: unknown[]): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    out.push(obj);
    if (Array.isArray(obj["@graph"])) (obj["@graph"] as unknown[]).forEach(visit);
  };
  nodes.forEach(visit);
  return out;
}

export function extractJsonLdLeads(jsonLd: unknown[], pageHostname?: string): ScrapeLeads {
  const nodes = flattenJsonLdNodes(jsonLd);
  const emails: string[] = [];
  const sameAsUrls: string[] = [];

  for (const node of nodes) {
    const email = node["email"];
    if (typeof email === "string") emails.push(email.replace(/^mailto:/i, ""));

    const sameAs = node["sameAs"];
    if (typeof sameAs === "string") sameAsUrls.push(sameAs);
    else if (Array.isArray(sameAs)) {
      for (const entry of sameAs) if (typeof entry === "string") sameAsUrls.push(entry);
    }
  }

  const joinedSameAs = sameAsUrls.join(" ");
  return {
    emails: dedupeCap(
      emails.map((e) => e.trim().toLowerCase()).filter((e) => EMAIL_TEST_RE.test(e)),
      10
    ),
    ...extractSocialLeads(joinedSameAs, pageHostname),
  };
}

// --- top-level assembly -----------------------------------------------------

export function buildScrapeResult(params: {
  requestedUrl: string;
  resolvedUrl: string;
  html: string;
  httpStatus: number;
  headers: Headers;
}): ScrapeResult {
  const { requestedUrl, resolvedUrl, html, httpStatus, headers } = params;
  const pageHostname = (() => {
    try {
      return new URL(resolvedUrl).hostname;
    } catch {
      return undefined;
    }
  })();
  const jsonLd = extractJsonLd(html);
  const jsonLdLeads = extractJsonLdLeads(jsonLd, pageHostname);
  const htmlLeads = extractSocialLeads(html, pageHostname);
  const htmlEmails = extractEmails(html);

  return {
    requestedUrl,
    resolvedUrl,
    fetchedAt: new Date().toISOString(),
    httpStatus,
    contentType: headers.get("content-type"),
    identity: extractIdentity(html, resolvedUrl),
    openGraph: extractOpenGraph(html),
    jsonLd,
    technologies: detectTechnologies(html, headers),
    leads: {
      // JSON-LD leads first — Set-based dedupe keeps first occurrence, and
      // JSON-LD (schema.org-declared) is the more authoritative source.
      emails: dedupeCap(jsonLdLeads.emails.concat(htmlEmails), 10),
      twitter: dedupeCap(jsonLdLeads.twitter.concat(htmlLeads.twitter), 5),
      linkedin: dedupeCap(jsonLdLeads.linkedin.concat(htmlLeads.linkedin), 5),
      github: dedupeCap(jsonLdLeads.github.concat(htmlLeads.github), 5),
    },
  };
}

/** Merges a secondary page's extracted leads into a primary result's leads
 *  (see route.ts's opportunistic `/contact` retry) — same JSON-LD-first,
 *  dedupe-and-cap treatment as buildScrapeResult. */
export function mergeLeads(primary: ScrapeLeads, secondary: ScrapeLeads): ScrapeLeads {
  return {
    emails: dedupeCap(primary.emails.concat(secondary.emails), 10),
    twitter: dedupeCap(primary.twitter.concat(secondary.twitter), 5),
    linkedin: dedupeCap(primary.linkedin.concat(secondary.linkedin), 5),
    github: dedupeCap(primary.github.concat(secondary.github), 5),
  };
}
