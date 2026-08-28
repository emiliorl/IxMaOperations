/**
 * lib/packages.ts
 *
 * Canonical content model for the 6 starter packages (Stage 10 Task 10.1) —
 * single source of truth for the /packages catalog grid and each
 * /packages/[slug] detail page.
 *
 * See PROJECT_BLUEPRINT.md Section 2 for the full rationale and
 * PLAN_PROGRESS.md Stage 10 for status. Slugs here are the join key with
 * `lib/capabilities.ts`'s `packageSlug` field (1:1 mapping, resolved open
 * item #5) — keep them in sync if either file changes.
 *
 * PRICING RULE (locked Aug 27, 2026 — STANDARDS.md Rule 2, PROJECT_BLUEPRINT.md
 * Section 2 & 8): `internalReferencePrice` exists purely so Emilio has a
 * quoting anchor to work from. No component may ever render it. Every
 * package routes to the same request flow as Custom Projects — there is no
 * checkout, and no price is shown publicly anywhere on the site.
 */

export interface PackageOffer {
  /** URL slug — used at /packages/[slug] and as the join key with lib/capabilities.ts. */
  slug: string;
  /** Package name shown on the catalog card and detail page. */
  name: string;
  /** One-line, client-facing description shown on the catalog card. */
  pitch: string;
  /** Slightly longer explanation shown on the detail page. */
  whatItIs: string;
  /** Plain-English bullet list of what's included, shown on the detail page. */
  whatsIncluded: string[];
  /** Client-facing turnaround estimate — the only "numbers" shown publicly. */
  turnaround: string;
  /**
   * Internal-only reference price — Emilio's quoting anchor.
   * NEVER render this in any component. See file header.
   */
  internalReferencePrice: string;
}

export const PACKAGES: PackageOffer[] = [
  {
    slug: "lead-scraper-enrichment",
    name: "Custom Lead Scraper + Enrichment List",
    pitch: "Scrape a defined source, enrich records, hand back a clean list.",
    whatItIs:
      "You give me a defined source and the criteria that matter — I build a one-off scrape-and-enrich pass and hand back a clean, ready-to-use list instead of raw scraped rows.",
    whatsIncluded: [
      "Scrape of one clearly defined source against your criteria",
      "Enrichment of each record with the context that makes it usable",
      "A clean, deduplicated export (spreadsheet or CSV)",
    ],
    turnaround: "3–5 days",
    internalReferencePrice: "$549",
  },
  {
    slug: "invoice-ocr-pipeline",
    name: "Receipt/Invoice OCR Pipeline Setup",
    pitch: "Upload receipts/invoices → structured, exportable data.",
    whatItIs:
      "A one-time setup that turns photos or PDFs of receipts and invoices into structured, exportable line items — no more retyping totals by hand.",
    whatsIncluded: [
      "Pipeline configured for your receipt/invoice format",
      "Structured output (vendor, amount, date, category)",
      "Exportable to spreadsheet/CSV",
    ],
    turnaround: "3–5 days",
    internalReferencePrice: "$599",
  },
  {
    slug: "content-repurposing",
    name: "Content Repurposing Automation",
    pitch: "One video/transcript → multi-platform post drafts.",
    whatItIs:
      "Feed in one raw video or transcript and get back a batch of platform-ready drafts — no more manually reformatting the same idea five different ways.",
    whatsIncluded: [
      "Transcription + key-idea breakdown of one source video/recording",
      "Platform-ready drafts (threads, captions, a newsletter blurb)",
      "One round of revisions on the draft set",
    ],
    turnaround: "2–4 days",
    internalReferencePrice: "$499",
  },
  {
    slug: "data-qa-audit",
    name: "Small-Scope Data QA/Audit Script",
    pitch: "Rule + LLM-based checking of a defined dataset, with a measurable accuracy score.",
    whatItIs:
      "A script that checks a defined dataset against rules and an LLM-based review pass, so you get a measurable accuracy score instead of a gut feeling about your data quality.",
    whatsIncluded: [
      "Rule-based + LLM-based checks against your dataset",
      "A flagged-records report with a measurable accuracy score",
      "The script itself, so you can re-run it later",
    ],
    turnaround: "4–6 days",
    internalReferencePrice: "$749",
  },
  {
    slug: "api-workflow-integration",
    name: "Custom API/Workflow Integration",
    pitch: "Connect 2+ tools/systems with a custom automation script.",
    whatItIs:
      "I connect two or more tools you already use with a custom automation script, so information moves between them on its own instead of being copy-pasted by hand.",
    whatsIncluded: [
      "Integration script connecting your specified tools/systems",
      "Basic error handling and a run log",
      "Handoff notes on how it works",
    ],
    turnaround: "3–6 days",
    internalReferencePrice: "$649",
  },
  {
    slug: "custom-vision-model",
    name: "Custom-Trained Vision Model (small scope)",
    pitch: "A bespoke computer-vision model when off-the-shelf OCR/CV isn't accurate enough.",
    whatItIs:
      "When general-purpose OCR or object detection isn't accurate enough for your specific images, I train a small-scope custom vision model against your actual data instead.",
    whatsIncluded: [
      "Model trained against a sample of your images",
      "An accuracy report against a held-out test set",
      "Delivery notes on how to run/integrate it",
    ],
    turnaround: "Varies with scope",
    internalReferencePrice: "Starting around $1,200",
  },
];

export function getPackageBySlug(slug: string): PackageOffer | undefined {
  return PACKAGES.find((pkg) => pkg.slug === slug);
}
