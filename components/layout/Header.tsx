"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

/**
 * Single site-wide header (v4 pivot, Aug 29, 2026 — replaces the v3 Stage 8
 * nav now that the homepage leads with one onboarding flow instead of a
 * Packages/Custom Projects split; i18n pivot, same date, added the locale
 * switcher and moved every string into messages/<locale>.json).
 *
 * Nav = Examples / Packages / Contact (3 links, logo doubles as Home), one
 * CTA — "Get Started" — routing into the homepage questionnaire. No price
 * ever appears here (STANDARDS.md Rule 2, .agents/rules/website-style.md).
 * `Link`/`usePathname` come from i18n/navigation.ts so hrefs get the right
 * locale prefix automatically.
 */
export function Header() {
  const t = useTranslations("Header");
  const pathname = usePathname();

  const NAV_LINKS = [
    { href: "/#examples", label: t("navExamples") },
    { href: "/packages", label: t("navPackages") },
    { href: "/about", label: t("navAbout") },
    { href: "/contact", label: t("navContact") },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-6xl">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo-icon.svg"
            alt="IxMa Operations"
            width={24}
            height={24}
            className="w-6 h-6 object-contain"
            priority
          />
          <span className="font-semibold text-sm tracking-tight text-white group-hover:text-zinc-200 transition-colors">
            IxMa Operations
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-zinc-100 ${isActive ? "text-zinc-100 font-medium" : ""
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/#project-scoper" className={buttonVariants({ size: "sm", variant: "default" })}>
            {t("getStarted")}
          </Link>
        </div>
      </div>
    </header>
  );
}
