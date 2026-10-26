"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { ArrowRight, Check } from "lucide-react";
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
 * Project Scoper (Stage 14, rebuilt as a one-screen configurator in the
 * design revamp — Milestone 3). It used to be a 5-step multiple-choice quiz
 * that hid the result behind four clicks; now the controls and the matched
 * scope sit side by side and the scope sheet fills in live as soon as a
 * challenge and a handoff are picked.
 *
 * Complexity and priority are still sent to the server (`parseSurveyAnswers`
 * requires all four, and the internal quoting email uses them), but they
 * start on their middle values and live in a collapsed-weight "refine" row
 * instead of being mandatory steps.
 *
 * The result resolves to a qualitative scope tier + turnaround + matched
 * capability tags, never a dollar figure (STANDARDS.md Rule 2 / packages.ts's
 * locked pricing rule — see lib/estimator-logic.ts for where the real number
 * lives, server-side only). It hands off into the existing shared request
 * flow (/custom-projects, BriefForm.tsx, ScheduleEmbed.tsx) via query params
 * rather than duplicating submission logic here.
 *
 * i18n pivot (Aug 29, 2026): `lib/estimator-logic.ts`'s option arrays stay
 * the canonical `value` lists (used for matching/validation and, via
 * `parseSurveyAnswers`, the server email); their `label`/`description`
 * fields are English-only placeholders — the displayed text comes from
 * messages/<locale>.json's `Estimator` namespace, keyed by the same `value`.
 */
interface Answers {
  category?: string;
  deliverable?: Deliverable;
  complexity: Complexity;
  urgency: Urgency;
}

const DEFAULT_COMPLEXITY: Complexity = "moderate";
const DEFAULT_URGENCY: Urgency = "standard";

export function ProjectEstimatorWizard() {
  const t = useTranslations("Estimator");
  const tCap = useTranslations("Capabilities");
  const [answers, setAnswers] = useState<Answers>({
    complexity: DEFAULT_COMPLEXITY,
    urgency: DEFAULT_URGENCY,
  });

  const categoryOptions = useMemo(
    () => [
      ...CAPABILITIES.map((c) => ({
        value: c.packageSlug,
        label: tCap(`${c.packageSlug}.name`),
        description: tCap(`${c.packageSlug}.description`),
      })),
      {
        value: BESPOKE_CATEGORY_ID,
        label: t("bespokeLabel"),
        description: t("bespokeDescription"),
      },
    ],
    [t, tCap]
  );

  const deliverableOptions = useMemo(
    () => DELIVERABLE_OPTIONS.map((o) => ({ value: o.value, label: t(`deliverable.${o.value}.label`), description: t(`deliverable.${o.value}.description`) })),
    [t]
  );
  const complexityOptions = useMemo(
    () => COMPLEXITY_OPTIONS.map((o) => ({ value: o.value, label: t(`complexity.${o.value}.label`), description: t(`complexity.${o.value}.description`) })),
    [t]
  );
  const urgencyOptions = useMemo(
    () => URGENCY_OPTIONS.map((o) => ({ value: o.value, label: t(`urgency.${o.value}.label`), description: t(`urgency.${o.value}.description`) })),
    [t]
  );

  const isComplete = Boolean(answers.category && answers.deliverable);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
      <Card className="p-5 sm:p-6 space-y-8 hover:translate-y-0 hover:border-zinc-800/80">
        <OptionGroup index="A" title={t("challengeTitle")}>
          <Choices
            name="category"
            columns="sm:grid-cols-2"
            options={categoryOptions}
            value={answers.category}
            onChange={(category) => setAnswers((prev) => ({ ...prev, category }))}
          />
        </OptionGroup>

        <OptionGroup index="B" title={t("handoffTitle")}>
          <Choices
            name="deliverable"
            columns="sm:grid-cols-2"
            options={deliverableOptions}
            value={answers.deliverable}
            onChange={(deliverable) => setAnswers((prev) => ({ ...prev, deliverable }))}
          />
        </OptionGroup>

        <OptionGroup index="C" title={t("refineTitle")} hint={t("refineHint")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Segmented
              name="complexity"
              label={t("complexityLabel")}
              options={complexityOptions}
              value={answers.complexity}
              onChange={(complexity) => setAnswers((prev) => ({ ...prev, complexity }))}
            />
            <Segmented
              name="urgency"
              label={t("urgencyLabel")}
              options={urgencyOptions}
              value={answers.urgency}
              onChange={(urgency) => setAnswers((prev) => ({ ...prev, urgency }))}
            />
          </div>
        </OptionGroup>
      </Card>

      <ScopeSheet answers={answers} isComplete={isComplete} />
    </div>
  );
}

function OptionGroup({
  index,
  title,
  hint,
  children,
}: {
  index: string;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3 min-w-0">
      <legend className="flex items-baseline gap-2.5">
        <span className="font-mono text-[11px] text-zinc-600">{index}</span>
        <span className="text-sm font-semibold text-zinc-100">{title}</span>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function Choices<T extends string>({
  name,
  columns,
  options,
  value,
  onChange,
}: {
  name: string;
  columns: string;
  options: { value: T; label: string; description: string }[];
  value?: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("grid grid-cols-1 gap-2.5", columns)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative text-left rounded-md border p-3.5 pr-8 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400",
              selected
                ? "border-zinc-500 bg-zinc-800/70"
                : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
            )}
          >
            <div className="text-sm font-medium text-zinc-100">{option.label}</div>
            <div className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">{option.description}</div>
            {selected && <Check className="absolute right-3 top-3.5 h-3.5 w-3.5 text-zinc-200" />}
          </button>
        );
      })}
    </div>
  );
}

function Segmented<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: { value: T; label: string; description: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const active = options.find((o) => o.value === value);
  return (
    <div className="space-y-2 min-w-0">
      <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div role="radiogroup" aria-label={name} className="grid grid-flow-col auto-cols-fr rounded-md border border-zinc-800 bg-zinc-950 p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded px-2 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400",
              option.value === value ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {active && <p className="text-xs text-zinc-500 leading-relaxed">{active.description}</p>}
    </div>
  );
}

function SpecRow({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-zinc-800/80 last:border-b-0">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 shrink-0">{label}</dt>
      <dd className={cn("text-sm text-right", muted ? "text-zinc-700" : "text-zinc-200")}>{value}</dd>
    </div>
  );
}

function ScopeSheet({ answers, isComplete }: { answers: Answers; isComplete: boolean }) {
  const t = useTranslations("Estimator");
  const tCap = useTranslations("Capabilities");
  const tPkg = useTranslations("Packages.items");

  const tier = answers.category ? matchScopeTier(answers.category) : undefined;
  const tierName = tier ? (tier.packageSlug ? tPkg(`${tier.packageSlug}.name`) : t("bespokeTierName")) : undefined;
  const turnaround = tier ? (tier.packageSlug ? tPkg(`${tier.packageSlug}.turnaround`) : t("confirmedOnCall")) : undefined;
  const matchedCapabilities = (tier?.matchedCapabilitySlugs ?? [])
    .map(getCapabilityByPackageSlug)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  // Guard against parseSurveyAnswers/UI drifting apart — if this ever fails,
  // the query string being built no longer round-trips on /custom-projects.
  const verified = isComplete ? parseSurveyAnswers(answers) : undefined;
  const surveyQuery = verified
    ? new URLSearchParams({
        category: verified.category,
        complexity: verified.complexity,
        deliverable: verified.deliverable,
        urgency: verified.urgency,
      }).toString()
    : "";

  const dash = "—";

  return (
    <Card marks className="p-5 sm:p-6 space-y-5 lg:sticky lg:top-20 hover:translate-y-0">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{t("specSheet")}</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
          <span className={cn("h-1.5 w-1.5 rounded-full", isComplete ? "bg-emerald-400" : "bg-zinc-700")} />
          {isComplete ? t("statusReady") : t("statusWaiting")}
        </span>
      </div>

      <div>
        <div className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{t("matchedScope")}</div>
        <h3 className={cn("mt-1 text-xl font-semibold tracking-tight", tierName ? "text-white" : "text-zinc-700")}>
          {tierName ?? dash}
        </h3>
      </div>

      <dl>
        <SpecRow label={t("turnaroundLabel")} value={turnaround ?? dash} muted={!turnaround} />
        <SpecRow
          label={t("handoffLabel")}
          value={answers.deliverable ? t(`deliverable.${answers.deliverable}.label`) : dash}
          muted={!answers.deliverable}
        />
        <SpecRow label={t("complexityLabel")} value={t(`complexity.${answers.complexity}.label`)} />
        <SpecRow label={t("urgencyLabel")} value={t(`urgency.${answers.urgency}.label`)} />
        <SpecRow label={t("accessLabel")} value={t("accessValue")} />
        <SpecRow label={t("ownershipLabel")} value={t("ownershipValue")} />
      </dl>

      {matchedCapabilities.length > 0 && (
        <div className="space-y-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{t("matchedCapability")}</span>
          <div className="flex flex-wrap gap-2">
            {matchedCapabilities.slice(0, 3).map((capability) => {
              const Icon = CAPABILITY_ICONS[capability.icon];
              return (
                <Badge key={capability.packageSlug} variant="secondary" className="gap-1.5">
                  {Icon && <Icon className="h-3 w-3" />}
                  {tCap(`${capability.packageSlug}.name`)}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {verified ? (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-zinc-500 leading-relaxed border-t border-zinc-800 pt-4">{t("referenceNote")}</p>
          <div className="flex flex-col gap-2.5">
            <Link
              href={`/custom-projects?${surveyQuery}`}
              className={buttonVariants({ size: "lg", variant: "default", className: "gap-2 justify-center" })}
            >
              {t("sendBrief")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/custom-projects?${surveyQuery}#call`}
              className={buttonVariants({ size: "lg", variant: "secondary", className: "gap-2 justify-center" })}
            >
              {t("bookCall")}
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500 leading-relaxed border-t border-zinc-800 pt-4">{t("emptyState")}</p>
      )}
    </Card>
  );
}
