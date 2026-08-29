import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight, Check } from "lucide-react";

/**
 * Homepage hero (v4 pivot, Aug 29, 2026 — replaces the two-path "Packages
 * vs. Custom Projects" hero from Stage 9). One audience, one flow: describe
 * the problem, get scope + a time to talk back. The old two-CTA exception
 * (STANDARDS.md Section 4 Rule 3) no longer applies — see that file's v4
 * note and PROJECT_BLUEPRINT.md Section 0 for the full rationale.
 *
 * i18n pivot (same date): copy moved to messages/<locale>.json (Hero
 * namespace). The two in-page hash CTAs (`#project-scoper`, `#examples`)
 * stay plain relative anchors — no locale prefix needed for a same-page
 * scroll.
 *
 * No price appears here or anywhere else on the site (STANDARDS.md Rule 2).
 */
export function Hero() {
  const t = useTranslations("Hero");

  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-20 border-b border-zinc-800">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-[1.1]">
            {t("title")}
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
            {t("description")}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link href="#project-scoper" className={buttonVariants({ size: "lg", variant: "default", className: "gap-2 justify-center" })}>
              {t("ctaPrimary")}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link href="#examples" className={buttonVariants({ size: "lg", variant: "secondary", className: "gap-2 justify-center" })}>
              {t("ctaSecondary")}
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>{t("badge1")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>{t("badge2")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>{t("badge3")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
