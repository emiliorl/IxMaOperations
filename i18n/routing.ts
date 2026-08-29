import { defineRouting } from "next-intl/routing";

/**
 * i18n/routing.ts — locale configuration shared by middleware.ts,
 * i18n/navigation.ts, and i18n/request.ts.
 *
 * `localePrefix: "as-needed"` keeps existing English URLs unprefixed
 * (`/packages`, `/custom-projects`, ...) so nothing that's already linked
 * or indexed breaks — Spanish gets its own prefixed tree (`/es/packages`).
 * Add a locale here (and a matching `messages/<locale>.json`) to support
 * another language later.
 */
export const routing = defineRouting({
  locales: ["en", "es"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
