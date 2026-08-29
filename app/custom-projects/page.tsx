import type { Metadata } from "next";
import { BriefForm } from "@/components/custom-projects/BriefForm";
import { ScheduleEmbed } from "@/components/custom-projects/ScheduleEmbed";
import { getPackageBySlug } from "@/lib/packages";
import { parseSurveyAnswers } from "@/lib/estimator-logic";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Custom Projects — IxMaOperations",
  description:
    "Describe a custom automation project — or a pre-scoped package — and get a price and timeline back by email, or book a call.",
};

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
 */
export default function CustomProjectsPage({
  searchParams,
}: {
  searchParams: { package?: string; category?: string; complexity?: string; deliverable?: string; urgency?: string };
}) {
  const preselected = searchParams.package ? getPackageBySlug(searchParams.package) : undefined;
  const surveyAnswers = parseSurveyAnswers(searchParams);

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="max-w-2xl mb-12 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            {preselected ? `Requesting: ${preselected.name}` : "Start a Project"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            {preselected ? "Request this package" : "Describe your project"}
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            No price is shown here — submit a brief and I'll reply with a price and timeline. If you'd
            rather talk it through first, book a call instead.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <BriefForm initialPackageSlug={searchParams.package || ""} initialSurveyAnswers={surveyAnswers} />
          <div id="call" className="space-y-3 scroll-mt-16">
            <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
              Prefer to talk first?
            </h2>
            <ScheduleEmbed />
          </div>
        </div>
      </div>
    </div>
  );
}
