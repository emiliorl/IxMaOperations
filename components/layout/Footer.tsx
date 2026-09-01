import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Single site-wide footer (v4 pivot, Aug 29, 2026; i18n pivot same date —
 * strings moved to messages/<locale>.json, Link comes from i18n/navigation
 * so hrefs get the right locale prefix). Repeats the homepage questionnaire
 * and examples anchors plus /packages, /custom-projects, and /contact so
 * there's always a second way into any of them besides the header CTA.
 */
export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="border-t border-zinc-800 bg-[#09090b] py-10 text-zinc-500 text-xs">
      <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left space-y-1">
          <div className="flex items-center justify-center md:justify-start gap-2 font-medium text-zinc-300">
            <Image
              src="/logo-icon.svg"
              alt="IxMa Operations"
              width={18}
              height={18}
              className="w-4.5 h-4.5 object-contain"
            />
            <span>IxMa Operations</span>
          </div>
          <p className="text-zinc-500">{t("tagline")}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-zinc-400 text-xs">
          <Link href="/#project-scoper" className="hover:text-zinc-200">{t("startHere")}</Link>
          <Link href="/#examples" className="hover:text-zinc-200">{t("examples")}</Link>
          <Link href="/packages" className="hover:text-zinc-200">{t("packages")}</Link>
          <Link href="/custom-projects" className="hover:text-zinc-200">{t("customProjects")}</Link>
          <Link href="/contact" className="hover:text-zinc-200">{t("contact")}</Link>
        </div>
      </div>
    </footer>
  );
}
