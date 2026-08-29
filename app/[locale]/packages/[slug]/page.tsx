import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { PACKAGES, getPackageBySlug } from "@/lib/packages";
import { getCapabilityByPackageSlug } from "@/lib/capabilities";
import { buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight, Check, Clock } from "lucide-react";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => PACKAGES.map((pkg) => ({ locale, slug: pkg.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) return {};
  const t = await getTranslations({ locale: params.locale, namespace: `Packages.items.${pkg.slug}` });
  return {
    title: `${t("name")} — IxMaOperations`,
    description: t("pitch"),
  };
}

/**
 * Package detail page (Stage 10 Task 10.3). What's included + turnaround
 * only — no price (STANDARDS.md Rule 2). "Request This Package" routes into
 * the shared request flow (Stage 11), pre-selecting this package via
 * ?package=<slug> rather than triggering a checkout.
 *
 * i18n pivot (Aug 29, 2026): `pkg`/`capability` still resolve the canonical
 * slug-keyed records; every rendered string comes from
 * messages/<locale>.json (`Packages.items.<slug>` / `Capabilities.<slug>`).
 */
export default async function PackageDetailPage({
  params,
}: {
  params: { locale: string; slug: string };
}) {
  setRequestLocale(params.locale);
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) notFound();

  const capability = getCapabilityByPackageSlug(pkg.slug);
  const t = await getTranslations("Packages");
  const tItem = await getTranslations(`Packages.items.${pkg.slug}`);
  const tCap = capability ? await getTranslations(`Capabilities.${capability.packageSlug}`) : undefined;

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-3xl space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{tItem("turnaround")}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            {tItem("name")}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">{tItem("whatItIs")}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">{t("whatsIncludedHeading")}</h2>
          <ul className="space-y-2">
            {tItem.raw("whatsIncluded").map((item: string) => (
              <li key={item} className="flex items-start gap-2 text-sm text-zinc-300 leading-relaxed">
                <Check className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {capability && tCap && (
          <div className="space-y-2">
            <Badge variant="default" className="text-[11px] font-mono">
              {t("builtOn", { name: tCap("name") })}
            </Badge>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">{tCap("description")}</p>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <p className="text-xs text-zinc-500">{t("noPriceNote")}</p>
          <Link
            href={`/custom-projects?package=${pkg.slug}`}
            className={buttonVariants({ size: "lg", variant: "default", className: "gap-2" })}
          >
            {t("requestThisPackage")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
