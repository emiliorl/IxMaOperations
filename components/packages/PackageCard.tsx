import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { SpecSheet } from "@/components/packages/SpecSheet";
import { PackageOffer } from "@/lib/packages";
import { ArrowRight } from "lucide-react";

/**
 * Packages catalog grid item (Stage 10 Task 10.2). Shows name, description,
 * and turnaround only — NEVER a price (STANDARDS.md Rule 2). Links to the
 * package's own detail page, not straight into the request flow, so a
 * visitor can read what's included first.
 *
 * Design revamp (Phase 3): the old clock + turnaround line is now a small
 * input / output / turnaround spec sheet, so a visitor can tell at a glance
 * what they hand over and what they get back.
 *
 * i18n pivot (Aug 29, 2026): `pkg` still supplies the slug/turnaround (used
 * for matching + English email content); display name/pitch come from
 * messages/<locale>.json's `Packages.items` namespace, keyed by `pkg.slug`.
 */
export function PackageCard({ pkg }: { pkg: PackageOffer }) {
  const t = useTranslations("Packages");
  const tItem = useTranslations(`Packages.items.${pkg.slug}`);

  return (
    <Card marks className="flex flex-col justify-between p-6 space-y-5">
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white leading-snug">{tItem("name")}</h3>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{tItem("pitch")}</p>
        </div>

        <SpecSheet
          rows={[
            { label: t("specInput"), value: tItem("input") },
            { label: t("specOutput"), value: tItem("output") },
            { label: t("specTurnaround"), value: tItem("turnaround") },
          ]}
        />
      </div>

      <Link
        href={`/packages/${pkg.slug}`}
        className="inline-flex items-center justify-between w-full text-xs px-3 py-2 rounded-md border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
      >
        <span>{t("viewDetails")}</span>
        <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
      </Link>
    </Card>
  );
}
