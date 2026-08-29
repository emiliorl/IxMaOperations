"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { CAPABILITIES, getCapabilityByPackageSlug } from "@/lib/capabilities";
import { CAPABILITY_ICONS } from "@/lib/capability-icons";
import { BESPOKE_CATEGORY_ID } from "@/lib/scope-tiers";
import {
  COMPLEXITY_OPTIONS,
  DELIVERABLE_OPTIONS,
  URGENCY_OPTIONS,
  matchScopeTier,
  parseSurveyAnswers,
  type Complexity,
  type Deliverable,
  type Urgency,
} from "@/lib/estimator-logic";

/**
 * Project Estimator Wizard (Stage 14) — a 5-step needs diagnostic that
 * resolves to a qualitative scope tier + turnaround + matched capability
 * tags, never a dollar figure (STANDARDS.md Rule 2 / packages.ts's locked
 * pricing rule — see lib/estimator-logic.ts for where the real number
 * lives, server-side only).
 *
 * The result step hands off into the existing shared request flow
 * (/custom-projects, BriefForm.tsx, ScheduleEmbed.tsx) via query params
 * rather than duplicating submission logic here.
 */
interface Answers {
  category?: string;
  complexity?: Complexity;
  deliverable?: Deliverable;
  urgency?: Urgency;
}

const CATEGORY_OPTIONS = [
  ...CAPABILITIES.map((c) => ({ value: c.packageSlug, label: c.name, description: c.description })),
  {
    value: BESPOKE_CATEGORY_ID,
    label: "Bespoke Architecture",
    description: "Something else — doesn't fit the categories above.",
  },
];

const TOTAL_STEPS = 5;

export function ProjectEstimatorWizard() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({});

  const isComplete = Boolean(answers.category && answers.complexity && answers.deliverable && answers.urgency);

  const surveyQuery = useMemo(() => {
    if (!isComplete) return "";
    const params = new URLSearchParams({
      category: answers.category!,
      complexity: answers.complexity!,
      deliverable: answers.deliverable!,
      urgency: answers.urgency!,
    });
    return params.toString();
  }, [answers, isComplete]);

  function selectAndAdvance<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  return (
    <Card className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
          Step {Math.min(step, TOTAL_STEPS)} / {TOTAL_STEPS}
        </span>
        {step > 1 && step <= TOTAL_STEPS && (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        )}
      </div>

      {step === 1 && (
        <StepChoice
          title="What's the core problem?"
          options={CATEGORY_OPTIONS}
          onSelect={(value) => selectAndAdvance("category", value)}
        />
      )}

      {step === 2 && (
        <StepChoice
          title="How complex is the source data?"
          options={COMPLEXITY_OPTIONS}
          onSelect={(value) => selectAndAdvance("complexity", value)}
        />
      )}

      {step === 3 && (
        <StepChoice
          title="What should the handoff look like?"
          options={DELIVERABLE_OPTIONS}
          onSelect={(value) => selectAndAdvance("deliverable", value)}
        />
      )}

      {step === 4 && (
        <StepChoice
          title="What's the turnaround priority?"
          options={URGENCY_OPTIONS}
          onSelect={(value) => selectAndAdvance("urgency", value)}
        />
      )}

      {step === 5 && isComplete && <ResultStep answers={answers as Required<Answers>} surveyQuery={surveyQuery} />}
    </Card>
  );
}

function StepChoice<T extends string>({
  title,
  options,
  onSelect,
}: {
  title: string;
  options: { value: T; label: string; description: string }[];
  onSelect: (value: T) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className="text-left rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 hover:bg-zinc-900/70 transition-colors"
          >
            <div className="text-sm font-medium text-zinc-100">{option.label}</div>
            <div className="text-xs text-zinc-400 mt-1 leading-relaxed">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultStep({ answers, surveyQuery }: { answers: Required<Answers>; surveyQuery: string }) {
  const tier = matchScopeTier(answers.category);
  const matchedCapabilities = tier.matchedCapabilitySlugs
    .map(getCapabilityByPackageSlug)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  // Guard against parseSurveyAnswers/UI drifting apart — if this ever fails,
  // the query string being built no longer round-trips on /custom-projects.
  const verified = parseSurveyAnswers(answers);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
          <Check className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Matched scope</div>
          <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">{tier.tierName}</h3>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-300">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Turnaround</span>
        <span>{tier.turnaround}</span>
      </div>

      {matchedCapabilities.length > 0 && (
        <div className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">Matched capability</span>
          <div className="flex flex-wrap gap-2">
            {matchedCapabilities.map((capability) => {
              const Icon = CAPABILITY_ICONS[capability.icon];
              return (
                <Badge key={capability.packageSlug} variant="secondary" className="gap-1.5">
                  {Icon && <Icon className="h-3 w-3" />}
                  {capability.name}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500 leading-relaxed border-t border-zinc-800 pt-4">
        Reference scope based on your answers. Final deliverables, timeline, and price are confirmed on a
        scoping call or in my reply to your brief.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={verified ? `/custom-projects?${surveyQuery}#call` : "/custom-projects"}
          className={cn(buttonVariants({ size: "lg", variant: "default", className: "gap-2 justify-center" }))}
        >
          Book Scoping Call
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={verified ? `/custom-projects?${surveyQuery}` : "/custom-projects"}
          className={cn(buttonVariants({ size: "lg", variant: "secondary", className: "gap-2 justify-center" }))}
        >
          Send Project Brief
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
