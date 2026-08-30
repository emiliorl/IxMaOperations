import React from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CAPABILITIES } from "@/lib/capabilities";
import { CAPABILITY_ICONS } from "@/lib/capability-icons";
import { ScraperDemo } from "@/components/examples/ScraperDemo";
import { OcrDemo } from "@/components/examples/OcrDemo";
import { ContentDemo } from "@/components/examples/ContentDemo";
import { AuditDemo } from "@/components/examples/AuditDemo";
import { PlayCircle } from "lucide-react";

/**
 * Homepage "See It In Action" section (v4 pivot, Aug 29, 2026 — replaces
 * `CapabilityStrip.tsx`). This site now shows skill demos directly instead
 * of shallow cards that link out to a separate portfolio (superseded
 * PROJECT_BLUEPRINT.md Section 4 — see Section 0 v4 for the pivot).
 *
 * i18n pivot (same date): `lib/capabilities.ts` stays the canonical
 * slug/id list (also consumed server-side), but the display name/
 * description shown here come from messages/<locale>.json's `Capabilities`
 * namespace, keyed by the same `packageSlug`.
 *
 * Each card gets a real animation/graph slot. Emilio hasn't dropped the
 * media in yet for most cards, so those slots render a clearly labeled
 * placeholder instead of a working demo or simulated backend (Section 8
 * Rule 2 still stands — a placeholder stays honest about being one). Swap
 * the placeholder `div` for the real embed/animation per card as it's
 * built.
 *
 * CAPABILITY_DEMOS_PLAN.md phases (Aug 29, 2026 —): each phase gives one
 * capability a real working engine, listed in LIVE_DEMOS below. That card
 * renders full-width with its own component instead of the coming-soon
 * placeholder. Phase 1: `lead-scraper-enrichment` -> ScraperDemo (a real
 * POST /api/examples/scrape call). Phase 2: `invoice-ocr-pipeline` ->
 * OcrDemo (real tesseract.js OCR in a Web Worker, no server round-trip).
 * Phase 3: `content-repurposing` -> ContentDemo (a real synchronous
 * extractive-NLP pipeline, client-side only — no server round-trip, no
 * LLM). Phase 4: `data-qa-audit` -> AuditDemo (real email/phone/date
 * validation + dedup, same client-side-only architecture as Phase 3). The
 * rest stay placeholders until their own phase lands.
 */
const LIVE_DEMOS: Partial<Record<string, React.ComponentType>> = {
  "lead-scraper-enrichment": ScraperDemo,
  "invoice-ocr-pipeline": OcrDemo,
  "content-repurposing": ContentDemo,
  "data-qa-audit": AuditDemo,
};

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
            const LiveDemo = LIVE_DEMOS[capability.packageSlug];

            if (LiveDemo) {
              return (
                <Card
                  key={capability.packageSlug}
                  className="flex flex-col p-6 space-y-5 md:col-span-2 lg:col-span-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 w-fit shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white leading-snug">
                          {tCap(`${capability.packageSlug}.name`)}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed max-w-lg">
                          {tCap(`${capability.packageSlug}.description`)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="active" className="shrink-0">
                      {t("liveBadge")}
                    </Badge>
                  </div>

                  <LiveDemo />
                </Card>
              );
            }

            return (
              <Card key={capability.packageSlug} className="flex flex-col p-6 space-y-5">
                <div className="flex flex-col items-center justify-center gap-2 aspect-video rounded-md border border-dashed border-zinc-800 bg-zinc-900/50 text-zinc-600">
                  <PlayCircle className="h-6 w-6" />
                  <span className="text-[11px] font-mono uppercase tracking-wider">{t("comingSoon")}</span>
                </div>

                <div className="space-y-4">
                  <div className="p-2 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 w-fit">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white leading-snug">
                      {tCap(`${capability.packageSlug}.name`)}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      {tCap(`${capability.packageSlug}.description`)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
