/**
 * lib/estimator-logic.ts
 *
 * Deterministic logic behind the Project Estimator Wizard (Stage 14).
 *
 * Split into two halves on purpose:
 *  - The top half (types, option content, `matchScopeTier`,
 *    `parseSurveyAnswers`) is client-safe and imported directly by
 *    `components/onboarding/ProjectEstimatorWizard.tsx`.
 *  - `computeInternalPriceRange` / `formatPriceRange` are SERVER-ONLY: they
 *    read `PackageOffer.internalReferencePrice`, which lib/packages.ts's
 *    file header marks as "NEVER render this in any component" (locked
 *    pricing rule, STANDARDS.md Rule 2). Only call these from
 *    app/api/request/route.ts to build the internal email Emilio receives —
 *    never from a "use client" file, and never send the result back to the
 *    browser in an API response.
 */
import { getPackageBySlug } from "./packages";
import { BESPOKE_CATEGORY_ID, getScopeTierById, type ScopeTier } from "./scope-tiers";

export type Complexity = "simple" | "moderate" | "complex";
export type Deliverable = "dataset" | "scheduled-script" | "webhook" | "model-api";
export type Urgency = "express" | "standard" | "flexible";

export interface SurveyAnswers {
  /** A CAPABILITIES packageSlug, or BESPOKE_CATEGORY_ID. */
  category: string;
  complexity: Complexity;
  deliverable: Deliverable;
  urgency: Urgency;
}

export const COMPLEXITY_OPTIONS: { value: Complexity; label: string; description: string }[] = [
  { value: "simple", label: "Simple", description: "One clear source, static or well-structured." },
  { value: "moderate", label: "Moderate", description: "A few variables — mixed formats or a handful of edge cases." },
  { value: "complex", label: "Complex", description: "Multiple sources or systems, or a lot of edge-case handling." },
];

export const DELIVERABLE_OPTIONS: { value: Deliverable; label: string; description: string }[] = [
  { value: "dataset", label: "Clean dataset / CSV", description: "A one-off structured export." },
  { value: "scheduled-script", label: "Automated script", description: "Runs on a schedule (cron) without you." },
  { value: "webhook", label: "Webhook / real-time trigger", description: "Fires the moment something changes." },
  { value: "model-api", label: "Containerized model / API", description: "A standalone service you or your team call." },
];

export const URGENCY_OPTIONS: { value: Urgency; label: string; description: string }[] = [
  { value: "express", label: "Express", description: "2–3 days — priority turnaround." },
  { value: "standard", label: "Standard", description: "3–6 days — the usual pace." },
  { value: "flexible", label: "Flexible", description: "No rush — whenever it's ready." },
];

const COMPLEXITY_VALUES = new Set<string>(COMPLEXITY_OPTIONS.map((o) => o.value));
const DELIVERABLE_VALUES = new Set<string>(DELIVERABLE_OPTIONS.map((o) => o.value));
const URGENCY_VALUES = new Set<string>(URGENCY_OPTIONS.map((o) => o.value));

/**
 * Resolves a category (packageSlug or "bespoke") to its qualitative scope
 * tier. Client-safe — no dollar figures anywhere in ScopeTier.
 */
export function matchScopeTier(category: string): ScopeTier {
  return getScopeTierById(category) ?? getScopeTierById(BESPOKE_CATEGORY_ID)!;
}

/**
 * Validates a bag of loose strings (e.g. from URL search params or a form
 * submission) into a typed SurveyAnswers, or undefined if incomplete/
 * invalid. Shared by the wizard (client) and the request API (server) so
 * both agree on what counts as "a complete survey."
 */
export function parseSurveyAnswers(input: {
  category?: string | null;
  complexity?: string | null;
  deliverable?: string | null;
  urgency?: string | null;
}): SurveyAnswers | undefined {
  const { category, complexity, deliverable, urgency } = input;
  if (!category || !complexity || !deliverable || !urgency) return undefined;
  if (!COMPLEXITY_VALUES.has(complexity)) return undefined;
  if (!DELIVERABLE_VALUES.has(deliverable)) return undefined;
  if (!URGENCY_VALUES.has(urgency)) return undefined;

  return {
    category,
    complexity: complexity as Complexity,
    deliverable: deliverable as Deliverable,
    urgency: urgency as Urgency,
  };
}

// ---------------------------------------------------------------------------
// SERVER-ONLY — see file header. Do not import these two functions from any
// "use client" component.
// ---------------------------------------------------------------------------

const COMPLEXITY_MULTIPLIER: Record<Complexity, number> = {
  simple: 0.85,
  moderate: 1,
  complex: 1.35,
};

const DELIVERABLE_MULTIPLIER: Record<Deliverable, number> = {
  dataset: 0.9,
  "scheduled-script": 1,
  webhook: 1.15,
  "model-api": 1.3,
};

const URGENCY_MULTIPLIER: Record<Urgency, number> = {
  express: 1.25,
  standard: 1,
  flexible: 0.9,
};

/** Used only when the category has no matching package (bespoke / unrecognized). */
const DEFAULT_BASELINE = { low: 900, high: 1500 };

function parseBaselineFromReferencePrice(reference: string | undefined): { low: number; high: number } {
  if (!reference) return DEFAULT_BASELINE;
  const numbers = reference.match(/[\d,]+/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];
  if (numbers.length === 0) return DEFAULT_BASELINE;
  if (numbers.length === 1) {
    // e.g. "Starting around $1,200" — treat as a floor, extend a band above it.
    return { low: numbers[0], high: Math.round(numbers[0] * 1.6) };
  }
  return { low: numbers[0], high: numbers[1] };
}

/**
 * Computes an internal-only reference price range for Emilio's quoting —
 * derived from lib/packages.ts's internalReferencePrice, adjusted for
 * complexity/deliverable/urgency. NEVER return this from an API response
 * body or render it in a component — it exists solely to be embedded in the
 * internal notification email (lib/email.ts).
 */
export function computeInternalPriceRange(answers: SurveyAnswers): { low: number; high: number } {
  const tier = matchScopeTier(answers.category);
  const pkg = tier.packageSlug ? getPackageBySlug(tier.packageSlug) : undefined;
  const baseline = parseBaselineFromReferencePrice(pkg?.internalReferencePrice);

  const multiplier =
    COMPLEXITY_MULTIPLIER[answers.complexity] *
    DELIVERABLE_MULTIPLIER[answers.deliverable] *
    URGENCY_MULTIPLIER[answers.urgency];

  const round50 = (n: number) => Math.round(n / 50) * 50;

  return {
    low: round50(baseline.low * multiplier),
    high: round50(baseline.high * multiplier),
  };
}

export function formatPriceRange(range: { low: number; high: number }): string {
  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
  return `${fmt(range.low)}–${fmt(range.high)}`;
}
