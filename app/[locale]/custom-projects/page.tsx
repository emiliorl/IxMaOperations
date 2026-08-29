import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BriefForm } from "@/components/custom-projects/BriefForm";
import { ScheduleEmbed } from "@/components/custom-projects/ScheduleEmbed";
import { getPackageBySlug } from "@/lib/packages";
import { parseSurveyAnswers } from "@/lib/estimator-logic";
import { Badge } from "@/components/ui/Badge";

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: "CustomProjects" });
  return {
    title: `${t("titleDefault")} — IxMaOperations`,
    description: t("description"),
  };
}

/**
 * Custom Projects page (Stage 11 Task 11.1) — the shared request path for
 * both an open-ended custom brief and a "Request This Package" click from
 * /packages/[slug] (pre-selected via ?package=<slug>). No price shown
 * anywhere (STANDARDS.md Rule 2).
 *
 * Stage 14: also the hand-off target for the homepage Project Estimator
 * Wizard, which arrives via ?category=&complexity=&deliverable=&urgency=
 * (re-validated with parseSurveyAnswers — an unrecognized/incomplete query
 * just falls back to the plain open-ended brief, same as no package).
 *
 * i18n pivot (Aug 29, 2026): the package's display name comes from
 * messages/<locale>.json's `Packages.items` namespace (getPackageBySlug
 * itself still only resolves the canonical English slug/turnaround record).
 */
export default async function CustomProjectsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { package?: string; category?: string; complexity?: string; deliverable?: string; urgency?: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("CustomProjects");
  const tPkg = await getTranslations("Packages.items");

  const preselected = searchParams.package ? getPackageBySlug(searchParams.package) : undefined;
  const surveyAnswers = parseSurveyAnswers(searchParams);

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="max-w-2xl mb-12 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            {preselected ? t("badgeRequesting", { name: tPkg(`${preselected.slug}.name`) }) : t("badgeDefault")}
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            {preselected ? t("titleRequesting") : t("titleDefault")}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">{t("description")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <BriefForm initialPackageSlug={searchParams.package || ""} initialSurveyAnswers={surveyAnswers} />
          <div id="call" className="space-y-3 scroll-mt-16">
            <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">{t("preferToTalk")}</h2>
            <ScheduleEmbed />
          </div>
        </div>
      </div>
    </div>
  );
}
