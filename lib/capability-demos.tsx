/**
 * lib/capability-demos.tsx
 *
 * Canonical map of which capabilities have a real, working interactive
 * engine (Phases 1-6 of `CAPABILITY_DEMOS_PLAN.md`), and which component
 * runs it. Factored out of `components/home/ExamplesSection.tsx` (v5 pivot,
 * Sep 1, 2026) so both the homepage and a package detail page can share one
 * source of truth for "does this capability have a live demo".
 *
 * v5 pivot: the homepage no longer embeds these full engines inline
 * (that was the v4 pivot, Aug 29, 2026). Each homepage card now shows a
 * lightweight animated preview (`components/home/CapabilityPreview.tsx`)
 * plus a link into `/packages/[slug]`, and *that* page renders the real
 * component from this map (see `app/[locale]/packages/[slug]/page.tsx`).
 * See `PROJECT_BLUEPRINT.md` Section 4 for the rationale.
 */
import type { ComponentType } from "react";
import { ScraperDemo } from "@/components/examples/ScraperDemo";
import { OcrDemo } from "@/components/examples/OcrDemo";
import { ContentDemo } from "@/components/examples/ContentDemo";
import { AuditDemo } from "@/components/examples/AuditDemo";
import { IntegrationDemo } from "@/components/examples/IntegrationDemo";
import { VisionDemo } from "@/components/examples/VisionDemo";

export const CAPABILITY_DEMOS: Partial<Record<string, ComponentType>> = {
  "lead-scraper-enrichment": ScraperDemo,
  "invoice-ocr-pipeline": OcrDemo,
  "content-repurposing": ContentDemo,
  "data-qa-audit": AuditDemo,
  "api-workflow-integration": IntegrationDemo,
  "custom-vision-model": VisionDemo,
};
