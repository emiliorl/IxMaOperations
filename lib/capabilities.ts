/**
 * lib/capabilities.ts
 *
 * Canonical content for the "See It In Action" examples section shown on
 * the homepage (`components/home/ExamplesSection.tsx`, v4 pivot Aug 29,
 * 2026 — replaces the old CapabilityStrip) and reused wherever a package
 * detail page wants to point at the underlying skill area (Stage 10).
 *
 * v4 note: this content now lives and is demonstrated directly on this
 * site (no more external portfolio hand-off — PROJECT_BLUEPRINT.md Section
 * 0 v4).
 *
 * v5 note (Sep 1, 2026): each entry's homepage card renders a lightweight
 * animated preview (`components/home/CapabilityPreview.tsx`, steps sourced
 * from messages/<locale>.json's `Capabilities.<slug>.steps`) plus a link
 * into `/packages/[slug]`, where the real working engine renders if one
 * exists (`lib/capability-demos.tsx`'s `CAPABILITY_DEMOS` map — still no
 * faked backends, Section 8 Rule 2 stands).
 *
 * Content rules (STANDARDS.md, PROJECT_BLUEPRINT.md Section 5 & 8):
 * - One capability per package (open item #5, resolved — all 6, 1:1).
 * - Plain, client-facing language only — no TensorRT/LayoutLM/PLC/OPC-UA or
 *   other leftover industrial-B2B jargon.
 * - Shallow copy is still fine (one sentence on the skill) — the real
 *   depth comes from the media slot, not a wall of case-study text.
 */

export interface Capability {
  /** Matches the `slug` of its package in `lib/packages.ts` (1:1 mapping). */
  packageSlug: string;
  /** Short skill-area name shown as the card title. */
  name: string;
  /** One sentence, plain language — the shallow pitch, not a case study. */
  description: string;
  /** lucide-react icon name, resolved by the component that renders the strip. */
  icon: "Search" | "Receipt" | "FileVideo" | "ShieldCheck" | "Workflow" | "Eye";
}

export const CAPABILITIES: Capability[] = [
  {
    packageSlug: "lead-scraper-enrichment",
    name: "Scraping & Enrichment",
    description:
      "Pulling structured data out of unstructured web sources and enriching it with the context that makes it usable — company, role, recent activity — not just raw scraped rows.",
    icon: "Search",
  },
  {
    packageSlug: "invoice-ocr-pipeline",
    name: "Document & Receipt OCR",
    description:
      "Turning photos and PDFs of receipts, invoices, and forms into clean, structured, exportable data — no manual retyping.",
    icon: "Receipt",
  },
  {
    packageSlug: "content-repurposing",
    name: "Content Automation",
    description:
      "Breaking one piece of long-form content into platform-ready drafts automatically — transcript in, threads and captions out.",
    icon: "FileVideo",
  },
  {
    packageSlug: "data-qa-audit",
    name: "Data Auditing",
    description:
      "Rule-based and LLM-based checks that catch bad records at scale, with a measurable accuracy score instead of a gut feeling.",
    icon: "ShieldCheck",
  },
  {
    packageSlug: "api-workflow-integration",
    name: "Backend Integrations",
    description:
      "Connecting the tools you already use so information moves between them automatically instead of being copy-pasted by hand.",
    icon: "Workflow",
  },
  {
    packageSlug: "custom-vision-model",
    name: "Computer Vision",
    description:
      "Training a model on your specific images when off-the-shelf OCR or object detection isn't accurate enough for the job.",
    icon: "Eye",
  },
];

export function getCapabilityByPackageSlug(slug: string): Capability | undefined {
  return CAPABILITIES.find((capability) => capability.packageSlug === slug);
}
