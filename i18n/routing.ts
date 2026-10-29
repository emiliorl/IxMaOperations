import { defineRouting } from "next-intl/routing";

/**
 * i18n/routing.ts — locale configuration shared by proxy.ts,
 * i18n/navigation.ts, and i18n/request.ts.
 *
 * `localePrefix: "as-needed"` keeps existing English URLs unprefixed
 * (`/packages`, `/custom-projects`, ...) so nothing that's already linked
 * or indexed breaks — Spanish gets its own prefixed tree (`/es/packages`).
 *
 * `alternateLinks: false` prevents the middleware from emitting automatic
 * HTTP `Link: rel="alternate"` headers on non-public routes (`/portal/*`),
 * 404s, or query-parameter URLs (`?package=...`). Instead, every public page
 * declares its exact canonical + `hreflang` alternates in `generateMetadata`
 * (`publicAlternates` in `lib/site-url.ts`) and in `app/sitemap.ts`.
 */
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  alternateLinks: false,
});

export type AppLocale = (typeof routing.locales)[number];
