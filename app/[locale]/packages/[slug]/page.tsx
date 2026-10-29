import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { PACKAGES, getPackageBySlug } from "@/lib/packages";
import { getCapabilityByPackageSlug } from "@/lib/capabilities";
import { CAPABILITY_DEMOS } from "@/lib/capability-demos";
import { buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SpecSheet } from "@/components/packages/SpecSheet";
import { ArrowRight, Check } from "lucide-react";
import { routing } from "@/i18n/routing";
import { publicAlternates } from "@/lib/site-url";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => PACKAGES.map((pkg) => ({ locale, slug: pkg.slug })));
}

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string; slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) return {};
  const t = await getTranslations({ locale: params.locale, namespace: `Packages.items.${pkg.slug}` });
  return {
    title: `${t("name")} — IxMaOperations`,
    description: t("pitch"),
    alternates: publicAlternates(params.locale, `/packages/${pkg.slug}`),
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
 *
 * v5 pivot (Sep 1, 2026): this is now where a capability's real working
 * demo lives (`lib/capability-demos.tsx`'s `CAPABILITY_DEMOS` map), reached
 * via a "Live Demo" link from that capability's card on the homepage
 * (`components/home/ExamplesSection.tsx`), which only shows a lightweight
 * animated preview now. See `PROJECT_BLUEPRINT.md` Section 4.
 */
export default async function PackageDetailPage(
  props: {
    params: Promise<{ locale: string; slug: string }>;
  }
) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) notFound();

  const capability = getCapabilityByPackageSlug(pkg.slug);
  const t = await getTranslations("Packages");
  const tItem = await getTranslations(`Packages.items.${pkg.slug}`);
  const tCap = capability ? await getTranslations(`Capabilities.${capability.packageSlug}`) : undefined;
  const tEx = await getTranslations("Examples");
  const LiveDemo = CAPABILITY_DEMOS[pkg.slug];

  return (
    <div className="py-16 md:py-24">
      <div className={cn("container mx-auto px-6 space-y-10", LiveDemo ? "max-w-4xl" : "max-w-3xl")}>
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            {tItem("name")}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">{tItem("whatItIs")}</p>
          <SpecSheet
            className="max-w-2xl"
            rows={[
              { label: t("specInput"), value: tItem("input") },
              { label: t("specOutput"), value: tItem("output") },
              { label: t("specTurnaround"), value: tItem("turnaround") },
            ]}
          />
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

        {LiveDemo && (
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">{t("tryItHeading")}</h2>
              <Badge variant="active">{tEx("liveBadge")}</Badge>
            </div>
            <LiveDemo />
          </div>
        )}

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
