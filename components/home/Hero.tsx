import React from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Check, ArrowRight } from "lucide-react";

/**
 * Homepage hero — repurposed from components/enterprise/HeroSection.tsx
 * (Task 9.1). Drops the enterprise/sprints track switcher entirely and
 * cuts to a single sentence: who this is for + what it does, one CTA.
 */
export function Hero() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-20 border-b border-zinc-800">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-[1.1]">
            Automation that gives solo operators and creators their time back.
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
            You&apos;re a freelancer, VA, or creator losing 10–20 hours a week to repetitive admin and
            production work — repurposing content, chasing leads, onboarding clients, logging receipts,
            triaging your inbox. We build a small, concrete automation for the grind that&apos;s costing you the most.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link href="/contact" className={buttonVariants({ size: "lg", variant: "default", className: "gap-2 justify-center" })}>
              Book a Call
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link href="/examples" className={buttonVariants({ size: "lg", variant: "secondary", className: "gap-2 justify-center" })}>
              See Practical Examples
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>No pricing tiers, one scoped quote</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>Built around your actual workflow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>See a real example before you commit</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
