/**
 * lib/scope-tiers.ts
 *
 * Qualitative scope tiers for the Project Estimator Wizard (Stage 14) —
 * client-safe content only. Each tier maps 1:1 to a package/capability
 * (STANDARDS.md-compliant: name, turnaround, matched skill tags), plus a
 * catch-all "bespoke" tier for anything that doesn't fit the 6 packages.
 *
 * PRICING RULE: this file intentionally carries no dollar figures. The
 * numeric side lives in lib/estimator-logic.ts's server-only section, which
 * reads lib/packages.ts's `internalReferencePrice` — never this file.
 */
import { CAPABILITIES } from "./capabilities";
import { getPackageBySlug } from "./packages";

export const BESPOKE_CATEGORY_ID = "bespoke";

export interface ScopeTier {
  /** Matches a CAPABILITIES packageSlug, or BESPOKE_CATEGORY_ID. */
  id: string;
  /** Set when this tier maps to a real package in lib/packages.ts. */
  packageSlug?: string;
  tierName: string;
  turnaround: string;
  /** Keys into CAPABILITIES, rendered as matched-skill badges on the result step. */
  matchedCapabilitySlugs: string[];
}

export const SCOPE_TIERS: ScopeTier[] = [
  ...CAPABILITIES.map((capability): ScopeTier => {
    const pkg = getPackageBySlug(capability.packageSlug);
    return {
      id: capability.packageSlug,
      packageSlug: capability.packageSlug,
      tierName: pkg?.name ?? capability.name,
      turnaround: pkg?.turnaround ?? "Confirmed on scoping call",
      matchedCapabilitySlugs: [capability.packageSlug],
    };
  }),
  {
    id: BESPOKE_CATEGORY_ID,
    tierName: "Bespoke Architecture",
    turnaround: "Confirmed on scoping call",
    matchedCapabilitySlugs: [],
  },
];

export function getScopeTierById(id: string): ScopeTier | undefined {
  return SCOPE_TIERS.find((tier) => tier.id === id);
}
