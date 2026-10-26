import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyEmail } from "@/components/home/CopyEmail";
import { ArrowRight } from "lucide-react";

const CONTACT_EMAIL = "eramirez@ixmaoperations.com";

/** Order matters — this is the order the commitments render in. */
const COMMITMENTS = ["access", "reply", "ownership", "layers"] as const;

/**
 * Homepage hero (v4 pivot, Aug 29, 2026 — replaces the two-path "Packages
 * vs. Custom Projects" hero from Stage 9). One audience, one flow: describe
 * the problem, get scope + a time to talk back. The old two-CTA exception
 * (STANDARDS.md Section 4 Rule 3) no longer applies — see that file's v4
 * note and PROJECT_BLUEPRINT.md Section 0 for the full rationale.
 *
 * Design revamp (Milestone 4): the hero now speaks as one named engineer
 * (first person, Emilio Ramirez) instead of a faceless agency, opens with a
 * live-status line, and pairs the headline with a "commitments" sheet — the
 * concrete promises (direct access, 24h reply, full ownership, no layers)
 * that used to be buried on /about — plus a copyable direct email. The three
 * `Check` micro-claims that used to sit under the CTAs are folded into that
 * sheet. A hairline blueprint grid sits behind the section, faded out toward
 * the bottom; no glows or gradients (STANDARDS.md Section 1).
 *
 * i18n pivot (same date as v4): copy lives in messages/<locale>.json (Hero
 * namespace). The two in-page hash CTAs (`#project-scoper`, `#examples`)
 * stay plain relative anchors — no locale prefix needed for a same-page
 * scroll.
 *
 * No price appears here or anywhere else on the site (STANDARDS.md Rule 2).
 */
export function Hero() {
  const t = useTranslations("Hero");

  return (
    <section className="relative border-b border-zinc-800 overflow-hidden">
      <div className="absolute inset-0 blueprint-grid blueprint-grid-fade" aria-hidden="true" />

      <div className="relative container mx-auto px-6 max-w-6xl pt-14 pb-16 md:pt-20 md:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-10 lg:gap-14 items-start">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400">{t("statusAvailable")}</span>
              </span>
              <span className="text-zinc-700">·</span>
              <span>{t("statusTurnaround")}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-[1.08]">
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
          </div>

          <Card marks className="p-5 space-y-4 hover:translate-y-0">
            <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              <span className="text-zinc-600">{"// "}</span>
              {t("commitmentsLabel")}
            </div>

            <dl>
              {COMMITMENTS.map((key) => (
                <div
                  key={key}
                  className="flex items-baseline justify-between gap-4 py-2.5 border-b border-zinc-800/80 last:border-b-0"
                >
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 shrink-0">
                    {t(`commitments.${key}.label`)}
                  </dt>
                  <dd className="text-sm text-zinc-200 text-right">{t(`commitments.${key}.value`)}</dd>
                </div>
              ))}
            </dl>

            <CopyEmail email={CONTACT_EMAIL} copyLabel={t("copyEmail")} copiedLabel={t("copiedEmail")} />
          </Card>
        </div>
      </div>
    </section>
  );
}
