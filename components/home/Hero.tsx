import React from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight, Check } from "lucide-react";

/**
 * Homepage hero (v4 pivot, Aug 29, 2026 — replaces the two-path "Packages
 * vs. Custom Projects" hero from Stage 9). One audience, one flow: describe
 * the problem, get scope + a time to talk back. The old two-CTA exception
 * (STANDARDS.md Section 4 Rule 3) no longer applies — see that file's v4
 * note and PROJECT_BLUEPRINT.md Section 0 for the full rationale.
 *
 * No price appears here or anywhere else on the site (STANDARDS.md Rule 2).
 */
export function Hero() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-20 border-b border-zinc-800">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-[1.1]">
            Automation and AI tooling, built around your problem.
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
            Tell me what you're trying to solve — scraping, document processing, content workflows, data
            QA, integrations, or custom vision. Answer a few questions and I'll get back to you with real
            scope and a time to talk.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link href="#project-scoper" className={buttonVariants({ size: "lg", variant: "default", className: "gap-2 justify-center" })}>
              Tell Me What You Need
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link href="#examples" className={buttonVariants({ size: "lg", variant: "secondary", className: "gap-2 justify-center" })}>
              See It In Action
            </Link>
          </div>

          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>Five questions, no forms to decode</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>Real reply with scope + timeline</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>Book a call or send a brief — you pick</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
