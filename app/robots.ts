import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

/**
 * app/robots.ts
 *
 * Served automatically at /robots.txt. Disallows /api/* (server endpoints,
 * nothing there for a crawler to index) and points crawlers at the
 * sitemap this app now generates (app/sitemap.ts) — a sitemap with no
 * robots.txt referencing it still gets found by search engines that were
 * told about it directly (Search Console, etc.), but pointing to it here
 * is the standard way to make it self-discoverable.
 *
 * Also disallows the private client portal (/portal and /es/portal). That is
 * only crawler hygiene — a robots.txt entry is public, so it's not what keeps
 * the portal private (Supabase auth is). The portal is deliberately absent
 * from app/sitemap.ts and every nav component, and next.config.mjs sends
 * `X-Robots-Tag: noindex` on those paths as the enforcing signal.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/portal", "/es/portal", "/en/portal"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
