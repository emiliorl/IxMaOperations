/**
 * lib/capabilities.ts
 *
 * Canonical content for the shallow skills/capabilities strip shown on the
 * homepage (`components/home/CapabilityStrip.tsx`, Stage 9 Task 9.2) and
 * reused wherever a package detail page wants to point at the underlying
 * skill area (Stage 10).
 *
 * See PROJECT_BLUEPRINT.md Section 4 for the "placeholder only" rule and
 * PLAN_PROGRESS.md Stage 7 Task 7.4 / open item #5 for status.
 *
 * Content rules (STANDARDS.md, PROJECT_BLUEPRINT.md Section 5 & 8):
 * - One capability per package (open item #5, resolved — all 6, 1:1).
 * - Plain, client-facing language only — no TensorRT/LayoutLM/PLC/OPC-UA or
 *   other leftover industrial-B2B jargon.
 * - Shallow on purpose: one sentence on the skill, not a case study. Deep
 *   write-ups live on the portfolio site — this is a labeled slot that
 *   links out, never a working demo or simulated backend (Section 8 Rule 2).
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
  /**
   * "See it in action →" target on the portfolio site.
   * TODO(open item #2): portfolio site URL is still pending from Emilio.
   * Leave `undefined` — CapabilityStrip.tsx must render the card without a
   * working link (label it "Coming soon" or omit the link entirely) until
   * this is filled in. Do not point it at a placeholder URL.
   */
  portfolioUrl?: string;
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
