import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PackageOffer } from "@/lib/packages";
import { ArrowRight, Clock } from "lucide-react";

/**
 * Packages catalog grid item (Stage 10 Task 10.2). Shows name, description,
 * and turnaround only — NEVER a price (STANDARDS.md Rule 2). Links to the
 * package's own detail page, not straight into the request flow, so a
 * visitor can read what's included first.
 */
export function PackageCard({ pkg }: { pkg: PackageOffer }) {
  return (
    <Card className="flex flex-col justify-between p-6 space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
          <Clock className="h-3.5 w-3.5" />
          <span>{pkg.turnaround}</span>
        </div>

        <div>
          <h3 className="text-base font-semibold text-white leading-snug">{pkg.name}</h3>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{pkg.pitch}</p>
        </div>
      </div>

      <Link
        href={`/packages/${pkg.slug}`}
        className="inline-flex items-center justify-between w-full text-xs px-3 py-2 rounded-md border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
      >
        <span>View details</span>
        <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
      </Link>
    </Card>
  );
}
