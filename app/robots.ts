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
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
