import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { buttonVariants } from "@/components/ui/Button";
import { CAPABILITIES } from "@/lib/capabilities";
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
 * v5 pivot (Sep 1, 2026): the full engines made this section heavy and
 * turned the homepage into a second copy of the package detail pages. Each
 * card now shows a lightweight preview plus a link into
 * `/packages/[slug]`, where the real interactive engine
 * (`lib/capability-demos.tsx`'s `CAPABILITY_DEMOS` map) renders instead.
 * See `PROJECT_BLUEPRINT.md` Section 4.
 *
 * Design revamp (Milestone 2): the preview is now a literal sample of each
 * pipeline's output (`CapabilityPreview.tsx`) instead of an abstract flow
 * diagram, and the section opens with a left-aligned index eyebrow rather
 * than a centered badge. The icon tile that used to sit under the preview is
 * gone — the preview carries that job now.
 *
 * `lib/capabilities.ts` stays the canonical slug/id/icon list (also
 * consumed server-side); the display name/description come from
 * messages/<locale>.json's `Capabilities` namespace, keyed by the same
 * `packageSlug`.
 */
export function ExamplesSection() {
  const t = useTranslations("Examples");
  const tCap = useTranslations("Capabilities");

  return (
    <section id="examples" className="py-16 md:py-24 border-b border-zinc-800 bg-zinc-950/60 scroll-mt-16">
      <div className="container mx-auto px-6 max-w-6xl">
        <SectionHeader
          index="02"
          label={t("badge")}
          title={t("title")}
          description={t("description")}
          className="mb-12"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((capability, i) => {
            const hasLiveDemo = Boolean(CAPABILITY_DEMOS[capability.packageSlug]);

            return (
              <Card key={capability.packageSlug} marks className="flex flex-col p-5 space-y-5">
                <CapabilityPreview slug={capability.packageSlug} sampleLabel={t("sampleLabel")} />

                <div className="flex flex-col flex-1 space-y-4">
                  <div className="flex-1">
                    <div className="font-mono text-[11px] text-zinc-600">{String(i + 1).padStart(2, "0")}</div>
                    <h3 className="mt-1 text-base font-semibold text-white leading-snug">
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
