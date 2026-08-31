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
