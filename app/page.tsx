import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { CapabilityStrip } from "@/components/home/CapabilityStrip";
import { ProjectEstimatorWizard } from "@/components/onboarding/ProjectEstimatorWizard";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

/**
 * v3 homepage (Stage 9 Tasks 9.1-9.2; estimator added Stage 14) — Hero →
 * Project Scoper → capability strip, closing CTA repeating both paths. No
 * price anywhere (STANDARDS.md Rule 2) — the estimator resolves to a
 * qualitative scope tier, never a dollar figure (lib/estimator-logic.ts).
 *
 * The estimator gets its own section rather than replacing Hero's two-CTA
 * choice or turning into a tabbed switcher — both would conflict with
 * STANDARDS.md §4.3 ("Two-Path Hero, Not a Segmented Control").
 */
export default function HomePage() {
  return (
    <div>
      <Hero />

      <section id="project-scoper" className="py-16 md:py-20 border-b border-zinc-800 scroll-mt-16">
        <div className="container mx-auto px-6 max-w-3xl text-center space-y-3 mb-10">
          <Badge variant="default" className="text-[11px] font-mono">
            Project Scoper
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Not sure what this needs? Answer five questions.
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl mx-auto">
            Get a matched scope tier and turnaround estimate, then book a call or send the brief straight
            through — or{" "}
            <Link href="/packages" className="text-zinc-300 underline underline-offset-4 hover:text-zinc-100">
              browse pre-scoped packages
            </Link>{" "}
            instead.
          </p>
        </div>
        <div className="container mx-auto px-6 max-w-2xl">
          <ProjectEstimatorWizard />
        </div>
      </section>

      <CapabilityStrip />

      <section className="py-16 md:py-20 border-b border-zinc-800 bg-zinc-950/80">
        <div className="container mx-auto px-6 max-w-4xl text-center space-y-6">
          <Badge variant="default" className="text-[11px] font-mono">
            Free 15-Minute Call
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Not sure which path fits? Reach out either way.
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Pick a package if your project matches one, or describe something custom — you'll hear back
            with a price and a timeline, not a hard sell.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/packages" className={buttonVariants({ size: "lg", variant: "default", className: "w-full sm:w-auto gap-2" })}>
              Browse Packages
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/custom-projects" className={buttonVariants({ size: "lg", variant: "secondary", className: "w-full sm:w-auto gap-2" })}>
              Describe a Custom Project
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
