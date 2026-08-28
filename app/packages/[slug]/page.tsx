import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PACKAGES, getPackageBySlug } from "@/lib/packages";
import { getCapabilityByPackageSlug } from "@/lib/capabilities";
import { buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight, Check, Clock } from "lucide-react";

export function generateStaticParams() {
  return PACKAGES.map((pkg) => ({ slug: pkg.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) return {};
  return {
    title: `${pkg.name} — IxMaOperations`,
    description: pkg.pitch,
  };
}

/**
 * Package detail page (Stage 10 Task 10.3). What's included + turnaround
 * only — no price (STANDARDS.md Rule 2). "Request This Package" routes into
 * the shared request flow (Stage 11), pre-selecting this package via
 * ?package=<slug> rather than triggering a checkout.
 */
export default function PackageDetailPage({ params }: { params: { slug: string } }) {
  const pkg = getPackageBySlug(params.slug);
  if (!pkg) notFound();

  const capability = getCapabilityByPackageSlug(pkg.slug);

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-3xl space-y-10">
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{pkg.turnaround}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            {pkg.name}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">{pkg.whatItIs}</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">What's Included</h2>
          <ul className="space-y-2">
            {pkg.whatsIncluded.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-zinc-300 leading-relaxed">
                <Check className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {capability && (
          <div className="space-y-2">
            <Badge variant="default" className="text-[11px] font-mono">
              Built on: {capability.name}
            </Badge>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">{capability.description}</p>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-800 space-y-3">
          <p className="text-xs text-zinc-500">No price is shown here — submit a request and I'll reply with a price and timeline.</p>
          <Link
            href={`/custom-projects?package=${pkg.slug}`}
            className={buttonVariants({ size: "lg", variant: "default", className: "gap-2" })}
          >
            Request This Package
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
