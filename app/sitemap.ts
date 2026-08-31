import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { CAPABILITIES } from "@/lib/capabilities";
import { SITE_URL } from "@/lib/site-url";

/**
 * app/sitemap.ts
 *
 * Next.js's App Router convention — served automatically at /sitemap.xml,
 * no route handler needed. Every URL goes through next-intl's own
 * `getPathname` (i18n/navigation.ts) rather than hand-building locale
 * prefixes here, so this can't drift from i18n/routing.ts's actual
 * behavior (`localePrefix: "as-needed"` — English unprefixed, Spanish
 * under /es). Each entry also lists its language alternates
 * (`alternates.languages`), which is how a sitemap communicates hreflang
 * relationships — the same page in each locale, not separate pages.
 *
 * Only real, indexable pages here — /contact and /packages/[slug] exist,
 * but the actual conversion flow is the homepage's on-page questionnaire
 * (STANDARDS.md v4 pivot), so those stay light-priority entries rather
 * than competing with "/" for a search engine's attention.
 */

type StaticHref = "/" | "/packages" | "/custom-projects" | "/contact";

function localizedUrls(href: StaticHref | string): { url: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = `${SITE_URL}${getPathname({ locale, href })}`;
  }
  languages["x-default"] = languages[routing.defaultLocale];
  return { url: languages[routing.defaultLocale], languages };
}

function entry(
  href: StaticHref | string,
  priority: number,
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>
): MetadataRoute.Sitemap[number] {
  const { url, languages } = localizedUrls(href);
  return { url, lastModified: new Date(), changeFrequency, priority, alternates: { languages } };
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    entry("/", 1, "weekly"),
    entry("/packages", 0.8, "monthly"),
    entry("/custom-projects", 0.8, "monthly"),
    entry("/contact", 0.5, "monthly"),
    ...CAPABILITIES.map((capability) => entry(`/packages/${capability.packageSlug}`, 0.6, "monthly")),
  ];
}
