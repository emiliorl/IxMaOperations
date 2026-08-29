import React from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight, Check } from "lucide-react";

/**
 * Homepage hero (Stage 9 Task 9.1) — the one sanctioned two-CTA moment
 * (STANDARDS.md Section 4 Rule 3): a visitor is genuinely one of two
 * audiences, choosing a path, not comparing pricing tiers.
 *
 * No price appears here or anywhere else on the site (STANDARDS.md Rule 2).
 */
export function Hero() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-20 border-b border-zinc-800">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-[1.1]">
            Contract automation work, two ways.
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
            Pick one of six pre-scoped automation packages, or bring a custom project. Either way, you submit
            a short request and hear back with a price and a timeline — no pricing tiers, no self-serve
            checkout, no surprise scope.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link href="/packages" className={buttonVariants({ size: "lg", variant: "default", className: "gap-2 justify-center" })}>
              I have a project to build
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link href="/custom-projects" className={buttonVariants({ size: "lg", variant: "secondary", className: "gap-2 justify-center" })}>
              I'm a business with a custom need
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>Deterministic, fixed timelines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>Defined scope or open-ended — you pick</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>Real reply with a price + timeline</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
