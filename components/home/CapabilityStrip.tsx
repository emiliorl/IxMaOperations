import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CAPABILITIES } from "@/lib/capabilities";
import { getPackageBySlug } from "@/lib/packages";
import { CAPABILITY_ICONS } from "@/lib/capability-icons";
import { ArrowRight } from "lucide-react";

/**
 * Homepage capability strip (Stage 9 Task 9.2). Shallow, placeholder-only
 * cards for the skill areas behind the 6 packages — no live demos, no fake
 * backends (PROJECT_BLUEPRINT.md Section 4 & 8 Rule 2).
 *
 * Each card links out to the portfolio site once `portfolioUrl` is set in
 * lib/capabilities.ts (still pending — open item #2); until then it shows
 * a plain "coming soon" label instead of a dead or placeholder link, and
 * always links to its real, working package detail page.
 */
export function CapabilityStrip() {
  return (
    <section className="py-16 md:py-24 border-b border-zinc-800 bg-zinc-950/60">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-2xl mb-12 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            What's Behind It
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            The skill areas behind every package
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            A quick look at the underlying capability, not a case study — deep write-ups live on the
            portfolio site.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((capability) => {
            const Icon = CAPABILITY_ICONS[capability.icon];
            const relatedPackage = getPackageBySlug(capability.packageSlug);
            return (
              <Card key={capability.packageSlug} className="flex flex-col justify-between p-6 space-y-5">
                <div className="space-y-4">
                  <div className="p-2 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 w-fit">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white leading-snug">{capability.name}</h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{capability.description}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-850">
                  {capability.portfolioUrl ? (
                    <a
                      href={capability.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between w-full text-xs px-3 py-2 rounded-md border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
                    >
                      <span>See it in action</span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center w-full text-[11px] font-mono px-3 py-2 rounded-md border border-zinc-800/60 text-zinc-500">
                      Portfolio link coming soon
                    </span>
                  )}

                  {relatedPackage && (
                    <Link
                      href={`/packages/${relatedPackage.slug}`}
                      className="inline-flex items-center justify-between w-full text-xs px-3 py-2 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors"
                    >
                      <span>See the package</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
