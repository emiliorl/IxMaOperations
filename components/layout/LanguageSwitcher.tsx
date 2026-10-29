"use client";

import React from "react";
import { useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Header language toggle (i18n pivot, Aug 29, 2026). Swaps the URL prefix
 * for the current page between locales (i18n/routing.ts) while keeping the
 * same path — /packages <-> /es/packages, etc.
 *
 * On public pages, renders crawlable `<Link>` (`<a href>`) elements so search
 * engines can follow internal links directly between the English and Spanish
 * versions of each page. Inside `/portal`, renders `<button>` elements so
 * private portal paths never emit crawlable alternate links.
 */
export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isPortal = /^\/portal(\/|$)/.test(pathname);

  return (
    <div className="flex items-center gap-1 text-[11px] font-mono">
      {routing.locales.map((cur) => {
        const className = cn(
          "px-1.5 py-0.5 rounded transition-colors uppercase",
          cur === locale ? "text-zinc-100 font-medium" : "text-zinc-500 hover:text-zinc-300"
        );
        if (isPortal) {
          return (
            <button
              key={cur}
              type="button"
              onClick={() => router.replace(pathname, { locale: cur })}
              aria-current={cur === locale ? "true" : undefined}
              className={className}
            >
              {cur}
            </button>
          );
        }
        return (
          <Link
            key={cur}
            href={pathname}
            locale={cur}
            replace
            aria-current={cur === locale ? "true" : undefined}
            className={className}
          >
            {cur}
          </Link>
        );
      })}
    </div>
  );
}
