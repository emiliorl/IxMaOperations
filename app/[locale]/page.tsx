import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Hero } from "@/components/home/Hero";
import { ExamplesSection } from "@/components/home/ExamplesSection";
import { ProjectEstimatorWizard } from "@/components/onboarding/ProjectEstimatorWizard";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
 *
 * Design revamp: sections open with left-aligned `// 0N LABEL` eyebrows
 * (`SectionHeader`) instead of centered badge + heading stacks; the scoper is
 * a one-screen configurator and gets the full 6xl width; the closing CTA is
 * a left-aligned sheet in Emilio's own voice.
 */
export default function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations("HomeScoper");
  const tCta = useTranslations("ClosingCta");

  return (
    <div>
      <Hero />

      <section id="project-scoper" className="py-16 md:py-20 border-b border-zinc-800 scroll-mt-16">
        <div className="container mx-auto px-6 max-w-6xl space-y-10">
          <SectionHeader
            index="01"
            label={t("badge")}
            title={t("title")}
            description={t.rich("description", {
              emailLink: (chunks) => (
                <Link href="/contact" className="text-zinc-300 underline underline-offset-4 hover:text-zinc-100">
                  {chunks}
                </Link>
              ),
            })}
          />
          <ProjectEstimatorWizard />
        </div>
      </section>

      <ExamplesSection />

      <section className="py-16 md:py-20 border-b border-zinc-800 bg-zinc-950/80">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="relative rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                <span className="text-zinc-600">{"// "}</span>
                03 {tCta("badge")}
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
                {tCta("title")}
              </h2>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                {tCta("description")}
              </p>
            </div>

            <Link href="#project-scoper" className={buttonVariants({ size: "lg", variant: "default", className: "w-full md:w-auto gap-2 shrink-0" })}>
              {tCta("cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
