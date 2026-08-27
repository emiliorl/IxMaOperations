import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { ProcessSteps } from "@/components/home/ProcessSteps";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

/**
 * v2 homepage (Task 9.1-9.3) — replaces app/(enterprise)/page.tsx.
 * One scroll: hero, services grid, process, closing CTA. No dual-funnel
 * remnants, single "Book a Call" CTA family throughout.
 */
export default function HomePage() {
  return (
    <div>
      <Hero />
      <ServicesGrid />
      <ProcessSteps />

      <section className="py-16 md:py-20 border-b border-zinc-800 bg-zinc-950/80">
        <div className="container mx-auto px-6 max-w-4xl text-center space-y-6">
          <Badge variant="default" className="text-[11px] font-mono">
            Free 15-Minute Call
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Ready to get an hour of your week back?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Tell us which grind is costing you the most time. We'll tell you honestly whether it's worth
            automating and what it would take.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/contact" className={buttonVariants({ size: "lg", variant: "default", className: "w-full sm:w-auto gap-2" })}>
              Book a Call
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
