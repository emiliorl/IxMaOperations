import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { CAPABILITIES } from "@/lib/capabilities";
import { CAPABILITY_ICONS } from "@/lib/capability-icons";
import { CAPABILITY_DEMOS } from "@/lib/capability-demos";
import { CapabilityPreview } from "@/components/home/CapabilityPreview";
import { ArrowRight } from "lucide-react";

/**
 * Homepage "See It In Action" section.
 *
 * v4 pivot (Aug 29, 2026, superseded below): replaced `CapabilityStrip.tsx`
 * with cards that embedded each capability's full working engine
 * (ScraperDemo, OcrDemo, ...) directly on the homepage.
 *
 * v5 pivot (Sep 1, 2026 — current): the full engines made this section
 * heavy and turned the homepage into a second copy of the package detail
 * pages. Each card now shows a lightweight, always-looping animated
 * preview (`CapabilityPreview.tsx`) that sketches the general shape of the
 * pipeline (input -> processing -> output) — a "general idea" card, not a
 * working demo — plus a link into `/packages/[slug]`. The real interactive
 * engine (`lib/capability-demos.tsx`'s `CAPABILITY_DEMOS` map) now renders
 * on that package's detail page instead (`app/[locale]/packages/[slug]/
 * page.tsx`). See `PROJECT_BLUEPRINT.md` Section 4.
 *
 * `lib/capabilities.ts` stays the canonical slug/id/icon list (also
 * consumed server-side); the display name/description/preview steps come
 * from messages/<locale>.json's `Capabilities` namespace, keyed by the
 * same `packageSlug`.
 */
export function ExamplesSection() {
  const t = useTranslations("Examples");
  const tCap = useTranslations("Capabilities");

  return (
    <section id="examples" className="py-16 md:py-24 border-b border-zinc-800 bg-zinc-950/60 scroll-mt-16">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-2xl mb-12 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            {t("badge")}
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            {t("title")}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            {t("description")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((capability) => {
            const Icon = CAPABILITY_ICONS[capability.icon];
            const hasLiveDemo = Boolean(CAPABILITY_DEMOS[capability.packageSlug]);
            const steps = tCap.raw(`${capability.packageSlug}.steps`) as [string, string, string];

            return (
              <Card key={capability.packageSlug} className="flex flex-col p-6 space-y-5">
                <CapabilityPreview icon={<Icon className="h-3.5 w-3.5" />} steps={steps} />

                <div className="flex flex-col flex-1 space-y-4">
                  <div className="p-2 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 w-fit">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-white leading-snug">
                      {tCap(`${capability.packageSlug}.name`)}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      {tCap(`${capability.packageSlug}.description`)}
                    </p>
                  </div>

                  <Link
                    href={`/packages/${capability.packageSlug}`}
                    className={buttonVariants({
                      variant: hasLiveDemo ? "secondary" : "outline",
                      size: "sm",
                      className: "gap-1.5 w-fit",
                    })}
                  >
                    {hasLiveDemo ? t("viewLiveDemo") : t("viewMoreInfo")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
