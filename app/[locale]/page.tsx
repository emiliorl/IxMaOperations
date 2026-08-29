import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Hero } from "@/components/home/Hero";
import { ExamplesSection } from "@/components/home/ExamplesSection";
import { ProjectEstimatorWizard } from "@/components/onboarding/ProjectEstimatorWizard";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

/**
 * v4 homepage (pivot Aug 29, 2026 — supersedes the v3 Stage 9 layout).
 * Hero → onboarding questionnaire (the primary flow, not a fallback for
 * "not sure") → examples in action → a light closing nudge back to it.
 * No price anywhere (STANDARDS.md Rule 2) — the estimator resolves to a
 * qualitative scope tier, never a dollar figure (lib/estimator-logic.ts).
 *
 * The packages catalog (`/packages`) still exists as a reference for
 * people who already know what they want, but it's no longer a top-level
 * path from the homepage — see PROJECT_BLUEPRINT.md Section 0 v4.
 *
 * i18n pivot (same date): copy moved to messages/<locale>.json
 * (HomeScoper/ClosingCta namespaces); `setRequestLocale` enables static
 * rendering per next-intl's App Router pattern.
 */
export default function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations("HomeScoper");
  const tCta = useTranslations("ClosingCta");

  return (
    <div>
      <Hero />

      <section id="project-scoper" className="py-16 md:py-20 border-b border-zinc-800 scroll-mt-16">
        <div className="container mx-auto px-6 max-w-3xl text-center space-y-3 mb-10">
          <Badge variant="default" className="text-[11px] font-mono">
            {t("badge")}
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            {t("title")}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl mx-auto">
            {t.rich("description", {
              emailLink: (chunks) => (
                <Link href="/contact" className="text-zinc-300 underline underline-offset-4 hover:text-zinc-100">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
        <div className="container mx-auto px-6 max-w-2xl">
          <ProjectEstimatorWizard />
        </div>
      </section>

      <ExamplesSection />

      <section className="py-16 md:py-20 border-b border-zinc-800 bg-zinc-950/80">
        <div className="container mx-auto px-6 max-w-4xl text-center space-y-6">
          <Badge variant="default" className="text-[11px] font-mono">
            {tCta("badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            {tCta("title")}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            {tCta("description")}
          </p>

          <div className="flex items-center justify-center pt-2">
            <Link href="#project-scoper" className={buttonVariants({ size: "lg", variant: "default", className: "w-full sm:w-auto gap-2" })}>
              {tCta("cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
