import type { Metadata } from "next";
import { PACKAGES } from "@/lib/packages";
import { PackageCard } from "@/components/packages/PackageCard";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Packages — IxMaOperations",
  description:
    "Six pre-scoped, fixed-turnaround automation packages. No price shown — submit a request and get a price and timeline back.",
};

/**
 * Packages catalog (Stage 10 Task 10.2). No price anywhere on this page
 * (STANDARDS.md Rule 2) — every card links to its detail page, which links
 * into the shared request flow (Stage 11).
 */
export default function PackagesPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-2xl mb-12 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            Individuals & Small Teams
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Six pre-scoped automation packages
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Each one has a defined scope and turnaround. No price is shown here — pick the one that
            matches what you need, submit a request, and you'll hear back with a price and a timeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PACKAGES.map((pkg) => (
            <PackageCard key={pkg.slug} pkg={pkg} />
          ))}
        </div>
      </div>
    </div>
  );
}
