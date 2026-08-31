/**
 * lib/site-url.ts
 *
 * Single source for the site's absolute base URL — used by app/sitemap.ts,
 * app/robots.ts, and app/[locale]/layout.tsx's `metadataBase` so a domain
 * change (or a Vercel preview deployment) only has to be handled in one
 * place. Falls back to the production custom domain if NEXT_PUBLIC_APP_URL
 * isn't set, rather than to `localhost`, so a build that skips env setup
 * doesn't ship a sitemap full of `http://localhost:3000/...` URLs.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.ixmaproductions.com").replace(/\/+$/, "");
