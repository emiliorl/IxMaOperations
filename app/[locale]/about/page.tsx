import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import {
  ArrowRight,
  Terminal,
  Clock,
  FileCode,
  Search,
  FileText,
  Workflow,
  CheckCircle2,
  Cpu,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "About" });
  return {
    title: `${t("metaTitle")} — IxMaOperations`,
    description: t("metaDescription"),
  };
}

/**
 * About Us Page — IxMaOperations
 *
 * Communicates the engineering philosophy, technical capabilities, execution
 * lifecycle, and direct engineer-led model of IxMa Operations.
 *
 * Adheres strictly to STANDARDS.md / .agents/rules/website-style.md:
 * - Sober engineering aesthetic (Zinc 950 bg, Zinc 800 hairline borders, Zinc 100 text)
 * - Monospaced technical metadata cues
 * - Left-aligned structured grid layouts
 * - Fully bilingual (English & Spanish via next-intl)
 */
export default async function AboutPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  setRequestLocale(locale);

  const t = await getTranslations("About");

  const PRINCIPLES = [
    {
      key: "deterministic",
      icon: Cpu,
      title: t("principles.deterministic.title"),
      description: t("principles.deterministic.description"),
    },
    {
      key: "direct",
      icon: Terminal,
      title: t("principles.direct.title"),
      description: t("principles.direct.description"),
    },
    {
      key: "turnaround",
      icon: Clock,
      title: t("principles.turnaround.title"),
      description: t("principles.turnaround.description"),
    },
    {
      key: "ownership",
      icon: FileCode,
      title: t("principles.ownership.title"),
      description: t("principles.ownership.description"),
    },
  ];

  const DOMAINS = [
    {
      key: "scraping",
      icon: Search,
      title: t("domains.scraping.title"),
      description: t("domains.scraping.description"),
    },
    {
      key: "ocr",
      icon: FileText,
      title: t("domains.ocr.title"),
      description: t("domains.ocr.description"),
    },
    {
      key: "workflow",
      icon: Workflow,
      title: t("domains.workflow.title"),
      description: t("domains.workflow.description"),
    },
    {
      key: "auditing",
      icon: CheckCircle2,
      title: t("domains.auditing.title"),
      description: t("domains.auditing.description"),
    },
  ];

  const STEPS = [
    {
      number: t("steps.step1.number"),
      title: t("steps.step1.title"),
      description: t("steps.step1.description"),
    },
    {
      number: t("steps.step2.number"),
      title: t("steps.step2.title"),
      description: t("steps.step2.description"),
    },
    {
      number: t("steps.step3.number"),
      title: t("steps.step3.title"),
      description: t("steps.step3.description"),
    },
  ];

  return (
    <div className="py-16 md:py-24 space-y-20 sm:space-y-28">
      {/* Hero Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="space-y-6 max-w-3xl">
          <Badge variant="default" className="font-mono text-[11px] text-zinc-400">
            {t("badge")}
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-semibold text-white tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            {t("description")}
          </p>

          {/* Technical Specs Strip */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-3">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {t("specs.turnaround")}
              </span>
              <span className="font-mono text-xs font-medium text-zinc-200">
                {t("specs.turnaroundValue")}
              </span>
            </div>
            <div className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-3">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {t("specs.architecture")}
              </span>
              <span className="font-mono text-xs font-medium text-zinc-200">
                {t("specs.architectureValue")}
              </span>
            </div>
            <div className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-3">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {t("specs.ownership")}
              </span>
              <span className="font-mono text-xs font-medium text-zinc-200">
                {t("specs.ownershipValue")}
              </span>
            </div>
            <div className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-3">
              <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                {t("specs.engagement")}
              </span>
              <span className="font-mono text-xs font-medium text-zinc-200">
                {t("specs.engagementValue")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Engineering Philosophy Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="space-y-8">
          <div className="space-y-2 max-w-2xl">
            <Badge variant="default" className="font-mono text-[11px] text-zinc-400">
              {t("philosophyBadge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              {t("philosophyTitle")}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              {t("philosophyDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRINCIPLES.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.key} className="bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700">
                  <CardHeader className="space-y-2 p-6">
                    <div className="w-8 h-8 rounded-md bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
                      <Icon className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-zinc-100">
                      {p.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-zinc-400 leading-relaxed">
                      {p.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="space-y-8">
          <div className="space-y-2 max-w-2xl">
            <Badge variant="default" className="font-mono text-[11px] text-zinc-400">
              {t("focusBadge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              {t("focusTitle")}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              {t("focusDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOMAINS.map((d) => {
              const Icon = d.icon;
              return (
                <Card key={d.key} className="bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700">
                  <CardHeader className="space-y-2 p-6">
                    <div className="w-8 h-8 rounded-md bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-200">
                      <Icon className="w-4 h-4" />
                    </div>
                    <CardTitle className="text-base font-semibold text-zinc-100">
                      {d.title}
                    </CardTitle>
                    <CardDescription className="text-sm text-zinc-400 leading-relaxed">
                      {d.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Execution Lifecycle Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="space-y-8">
          <div className="space-y-2 max-w-2xl">
            <Badge variant="default" className="font-mono text-[11px] text-zinc-400">
              {t("lifecycleBadge")}
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              {t("lifecycleTitle")}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              {t("lifecycleDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-6 space-y-3 transition-colors hover:border-zinc-700"
              >
                <div className="font-mono text-xs font-semibold text-zinc-500">
                  {step.number}
                </div>
                <h3 className="text-base font-semibold text-zinc-100">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="space-y-1">
              <Badge variant="default" className="font-mono text-[11px] text-zinc-400">
                {t("founderBadge")}
              </Badge>
              <h3 className="text-lg sm:text-xl font-semibold text-white">
                {t("founderTitle")}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-md w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t("availableForContracts")}
            </div>
          </div>
          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-3xl">
            {t("founderBio")}
          </p>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="rounded-xl border border-zinc-800 bg-[#121215] p-8 sm:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              {t("ctaTitle")}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              {t("ctaDescription")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <Link
              href="/#project-scoper"
              className={buttonVariants({ size: "default", variant: "default", className: "w-full sm:w-auto gap-2" })}
            >
              {t("ctaScoper")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/packages"
              className={buttonVariants({ size: "default", variant: "secondary", className: "w-full sm:w-auto" })}
            >
              {t("ctaPackages")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
