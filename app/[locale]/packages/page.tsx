import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PACKAGES } from "@/lib/packages";
import { PackageCard } from "@/components/packages/PackageCard";
import { Badge } from "@/components/ui/Badge";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "Packages" });
  return {
    title: `${t("listTitle")} — IxMaOperations`,
    description: t("listDescription"),
  };
}

/**
 * Packages catalog (Stage 10 Task 10.2; demoted from a top-level homepage
 * path to a reference page in the v4 pivot — PROJECT_BLUEPRINT.md Section
 * 0 v4). No price anywhere on this page (STANDARDS.md Rule 2) — every card
 * links to its detail page, which links into the shared request flow
 * (Stage 11).
 */
export default async function PackagesPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("Packages");

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-2xl mb-12 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            {t("listBadge")}
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            {t("listTitle")}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">{t("listDescription")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PACKAGES.map((pkg) => (
            <PackageCard key={pkg.slug} pkg={pkg} />
          ))}
        </div>
      </div>
    </div>
  );
}
