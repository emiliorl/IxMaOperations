import { getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * lib/site-url.ts
 *
 * Single source for the site's absolute base URL — used by app/sitemap.ts,
 * app/robots.ts, and app/[locale]/layout.tsx's `metadataBase` so a domain
 * change (or a Vercel preview deployment) only has to be handled in one
 * place. Falls back to the production custom domain if NEXT_PUBLIC_APP_URL
 * isn't set, rather than to `localhost`, so a build that skips env setup
 * doesn't ship a sitemap full of `http://localhost:3000/...` URLs.
 *
 * Sep 1, 2026 correction: this previously fell back to
 * ixmaproductions.com — a domain that had auto-attached itself to the
 * Vercel project (visible in `vercel deploy` output) but was never
 * actually owned/delegated by this project; its DNS had no nameserver
 * delegation at all. The real domain is ixmaoperations.com. Caught via
 * Search Console's sitemap report ("URL not allowed") once the site was
 * live at the *real* domain but the sitemap it served still declared URLs
 * under the wrong one — a live host/sitemap mismatch, not a local bug.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ixmaoperations.com").replace(/\/+$/, "");

/**
 * Builds the canonical absolute URL for a public route in a specific locale,
 * always without query parameters (`?package=...`, etc.).
 */
export function publicUrl(locale: AppLocale, href: string): string {
  const pathname = getPathname({ locale, href });
  return `${SITE_URL}${pathname}`;
}

/**
 * Builds `Metadata["alternates"]` (`canonical` + reciprocal `hreflang`
 * `languages` including `x-default`) for a public page.
 */
export function publicAlternates(locale: string, href: string): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = publicUrl(loc, href);
  }
  languages["x-default"] = languages[routing.defaultLocale];
  return {
    canonical: languages[locale] ?? languages[routing.defaultLocale],
    languages,
  };
}
