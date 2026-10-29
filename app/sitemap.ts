import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { CAPABILITIES } from "@/lib/capabilities";
import { publicAlternates } from "@/lib/site-url";

/**
 * app/sitemap.ts
 *
 * Next.js's App Router convention — served automatically at /sitemap.xml,
 * no route handler needed. Every URL goes through next-intl's own
 * `getPathname` (via `publicAlternates` in lib/site-url.ts) rather than
 * hand-building locale prefixes here, so this can't drift from
 * i18n/routing.ts's actual behavior (`localePrefix: "as-needed"` — English
 * unprefixed, Spanish under /es).
 *
 * Per Google's XML sitemap `xhtml:link` specification, every localized page
 * (both English `/` and Spanish `/es`) must have its own `<url><loc>` entry
 * in the sitemap with the full reciprocal `alternates.languages` map (`en`,
 * `es`, `x-default`). Emitting `<loc>` only for the default locale caused
 * Search Console to discover `/es/*` URLs via `xhtml:link` without seeing
 * them as primary sitemap entries ("Discovered - currently not indexed").
 *
 * Only public, indexable pages are listed here — never `/portal/*` or `/api/*`.
 */

type StaticHref = "/" | "/about" | "/packages" | "/custom-projects" | "/book" | "/contact" | "/privacy" | "/terms";

function entries(
  href: StaticHref | string,
  priority: number,
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>
): MetadataRoute.Sitemap {
  const { languages } = publicAlternates(routing.defaultLocale, href);
  const lastModified = new Date();
  return routing.locales.map((locale) => ({
    url: languages[locale],
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...entries("/", 1, "weekly"),
    ...entries("/packages", 0.8, "monthly"),
    ...entries("/custom-projects", 0.8, "monthly"),
    ...entries("/about", 0.7, "monthly"),
    ...entries("/book", 0.7, "monthly"),
    ...entries("/contact", 0.5, "monthly"),
    ...entries("/privacy", 0.3, "yearly"),
    ...entries("/terms", 0.3, "yearly"),
    ...CAPABILITIES.flatMap((capability) => entries(`/packages/${capability.packageSlug}`, 0.6, "monthly")),
  ];
}
