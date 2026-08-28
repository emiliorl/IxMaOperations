import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { CapabilityStrip } from "@/components/home/CapabilityStrip";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

/**
 * v3 homepage (Stage 9 Tasks 9.1-9.2) — replaces the v2 homepage
 * (Hero → ServicesGrid → ProcessSteps → CTA). One scroll: two-path hero,
 * capability strip, closing CTA repeating both paths. No price anywhere.
 */
export default function HomePage() {
  return (
    <div>
      <Hero />
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
