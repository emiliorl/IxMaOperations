import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Single site-wide footer (v4 pivot, Aug 29, 2026; i18n pivot same date —
 * strings moved to messages/<locale>.json, Link comes from i18n/navigation
 * so hrefs get the right locale prefix). Repeats the homepage questionnaire
 * and examples anchors plus /packages, /custom-projects, /book, and /contact
 * so there's always a crawlable internal path into every public page.
 */
export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="border-t border-zinc-800 bg-[#09090b] py-10 text-zinc-500 text-xs">
      <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left space-y-2">
          <Link href="/" className="inline-flex items-center justify-center md:justify-start group">
            <Image
              src="/ixma-operations-lockup-jade.svg"
              alt="IxMa Operations"
              width={101}
              height={32}
              className="h-7 w-auto object-contain transition-opacity group-hover:opacity-90"
            />
          </Link>
          <p className="text-zinc-500">{t("tagline")}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-0 text-zinc-400 text-xs [&_a]:inline-block [&_a]:py-3 sm:gap-y-1 sm:[&_a]:py-1">
          <Link href="/about" className="hover:text-zinc-200">{t("about")}</Link>
          <Link href="/#project-scoper" className="hover:text-zinc-200">{t("startHere")}</Link>
          <Link href="/#examples" className="hover:text-zinc-200">{t("examples")}</Link>
          <Link href="/packages" className="hover:text-zinc-200">{t("packages")}</Link>
          <Link href="/custom-projects" className="hover:text-zinc-200">{t("customProjects")}</Link>
          <Link href="/book" className="hover:text-zinc-200">{t("book")}</Link>
          <Link href="/contact" className="hover:text-zinc-200">{t("contact")}</Link>
          <Link href="/privacy" className="text-zinc-500 hover:text-zinc-200">{t("privacy")}</Link>
          <Link href="/terms" className="text-zinc-500 hover:text-zinc-200">{t("terms")}</Link>
        </div>
      </div>
    </footer>
  );
}
