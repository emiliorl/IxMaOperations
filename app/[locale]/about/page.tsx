import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/ui/SectionHeader";
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

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "About" });
  return {
    title: `${t("metaTitle")} — IxMaOperations`,
    description: t("metaDescription"),
  };
}

/**
 * About Page — IxMaOperations
 *
 * Design revamp (Phase 2): rewritten from corporate third-person into
 * Emilio's own account — why the practice exists, the standards he holds
 * himself to, the actual tool stack, and a three-step collaboration path
 * ending in a full codebase handoff. Sections open with `// 0N LABEL`
 * eyebrows (`SectionHeader`) rather than a pill badge on every heading.
 *
 * Adheres strictly to STANDARDS.md / .agents/rules/website-style.md:
 * - Sober engineering aesthetic (Zinc 950 bg, Zinc 800 hairline borders, Zinc 100 text)
 * - Monospaced technical metadata cues
 * - Left-aligned structured grid layouts
 * - Fully bilingual (English & Spanish via next-intl)
 */
export default async function AboutPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
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

  const SPECS = (["turnaround", "architecture", "ownership", "engagement"] as const).map((key) => ({
    key,
    label: t(`specs.${key}`),
    value: t(`specs.${key}Value`),
  }));

  const STACK = (["backend", "vision", "delivery", "web"] as const).map((key) => ({
    key,
    label: t(`stack.${key}.label`),
    items: t(`stack.${key}.items`),
  }));

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
          <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
            <span className="text-zinc-600">{"// "}</span>
            {t("badge")}
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold text-white tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            {t("description")}
          </p>

          {/* Technical Specs Strip */}
          <dl className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SPECS.map((spec) => (
              <div key={spec.key} className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-3">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{spec.label}</dt>
                <dd className="font-mono text-xs font-medium text-zinc-200">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Story Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-8 md:gap-14">
          <SectionHeader index="01" label={t("storyBadge")} title={t("storyTitle")} />
          <div className="space-y-4 text-sm sm:text-base text-zinc-300 leading-relaxed md:pt-10">
            <p>{t("storyP1")}</p>
            <p>{t("storyP2")}</p>
          </div>
        </div>
      </section>

      {/* Engineering Standards Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="space-y-8">
          <SectionHeader
            index="02"
            label={t("philosophyBadge")}
            title={t("philosophyTitle")}
            description={t("philosophyDescription")}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRINCIPLES.map((p) => {
              const Icon = p.icon;
              return (
                <Card key={p.key} marks className="bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700">
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

      {/* Stack Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="space-y-8">
          <SectionHeader
            index="03"
            label={t("stackBadge")}
            title={t("stackTitle")}
            description={t("stackDescription")}
          />

          <dl className="rounded-lg border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800">
            {STACK.map((row) => (
              <div key={row.key} className="grid grid-cols-1 sm:grid-cols-[14rem_1fr] gap-1 sm:gap-6 px-5 py-4">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 sm:pt-0.5">{row.label}</dt>
                <dd className="font-mono text-sm text-zinc-200">{row.items}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="space-y-8">
          <SectionHeader
            index="04"
            label={t("focusBadge")}
            title={t("focusTitle")}
            description={t("focusDescription")}
          />

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

      {/* Collaboration Roadmap Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="space-y-8">
          <SectionHeader
            index="05"
            label={t("lifecycleBadge")}
            title={t("lifecycleTitle")}
            description={t("lifecycleDescription")}
          />

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <li
                key={step.number}
                className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-6 space-y-3 transition-colors hover:border-zinc-700"
              >
                <div className="flex items-center gap-3 font-mono text-xs font-semibold text-zinc-500">
                  <span>{step.number}</span>
                  <span className="h-px flex-1 bg-zinc-800" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="container mx-auto px-6 max-w-5xl">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="space-y-1">
              <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                {t("founderBadge")}
              </div>
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
        <div className="rounded-xl border border-zinc-800 bg-[#121215] p-8 sm:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
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
