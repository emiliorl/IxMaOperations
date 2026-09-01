"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { createRequestSchema, type RequestFormValues } from "@/lib/schemas";
import { PACKAGES } from "@/lib/packages";
import { matchScopeTier, type SurveyAnswers } from "@/lib/estimator-logic";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared brief/request form (Stage 11 Task 11.2) — serves both a picked
 * package ("Request This Package" from /packages/[slug], pre-filled via
 * `initialPackageSlug`) and an open-ended custom brief. Zod-validated
 * client-side (lib/schemas.ts, shared shape with the server route) and
 * again server-side in app/api/request/route.ts.
 *
 * Stage 14: `initialSurveyAnswers` carries the Project Estimator Wizard's
 * result over from the homepage (via /custom-projects's searchParams). The
 * four survey* fields ride along as hidden inputs — the visible summary
 * card shows the same qualitative tier the wizard showed, never a price.
 *
 * Sep 1, 2026 (client-journey review): the wizard's `urgency` answer is the
 * one field that genuinely overlaps this form's free-text `timeline` — so
 * when the hand-off is present, `timeline` starts pre-filled from the
 * matching `Estimator.urgency.<value>.description` string instead of blank
 * (still editable). `problem` stays required and `budgetRange` stays
 * optional either way — the wizard never asks either, so neither is
 * actually redundant.
 *
 * i18n pivot (Aug 29, 2026): labels/placeholders/validation messages come
 * from messages/<locale>.json's `BriefForm` namespace; the package <select>
 * shows each package's translated name via the `Packages.items` namespace.
 * `createRequestSchema` builds a validator with the current locale's error
 * strings so react-hook-form + zodResolver validate and display errors in
 * whichever locale the visitor is on (see lib/schemas.ts for why the
 * server route stays on the fixed English schema instead).
 */
export function BriefForm({
  initialPackageSlug = "",
  initialSurveyAnswers,
}: {
  initialPackageSlug?: string;
  initialSurveyAnswers?: SurveyAnswers;
}) {
  const t = useTranslations("BriefForm");
  const tPkg = useTranslations("Packages.items");
  const tEstimator = useTranslations("Estimator");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestSchema = useMemo(() => createRequestSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      name: "",
      email: "",
      packageSlug: initialPackageSlug,
      problem: "",
      timeline: initialSurveyAnswers ? tEstimator(`urgency.${initialSurveyAnswers.urgency}.description`) : "",
      budgetRange: "",
      surveyCategory: initialSurveyAnswers?.category ?? "",
      surveyComplexity: initialSurveyAnswers?.complexity ?? "",
      surveyDeliverable: initialSurveyAnswers?.deliverable ?? "",
      surveyUrgency: initialSurveyAnswers?.urgency ?? "",
    },
  });

  const scopeTier = initialSurveyAnswers ? matchScopeTier(initialSurveyAnswers.category) : undefined;
  const scopeTierName = scopeTier?.packageSlug
    ? tPkg(`${scopeTier.packageSlug}.name`)
    : scopeTier
      ? tEstimator("bespokeTierName")
      : undefined;

  const onSubmit = async (values: RequestFormValues) => {
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || t("errorGeneric"));
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : t("errorGeneric"));
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 flex items-start gap-3">
        <Check className="h-5 w-5 text-zinc-300 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-100">{t("successTitle")}</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{t("successBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {scopeTier && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 space-y-1">
          <span className="font-mono uppercase tracking-wider text-zinc-500">{t("fromYourScope")}</span>
          <p className="text-zinc-200">
            {scopeTierName} — {scopeTier.packageSlug ? tPkg(`${scopeTier.packageSlug}.turnaround`) : tEstimator("confirmedOnCall")}
          </p>
        </div>
      )}

      <input type="hidden" {...register("surveyCategory")} />
      <input type="hidden" {...register("surveyComplexity")} />
      <input type="hidden" {...register("surveyDeliverable")} />
      <input type="hidden" {...register("surveyUrgency")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("nameLabel")} error={errors.name?.message}>
          <Input {...register("name")} placeholder={t("namePlaceholder")} autoComplete="name" />
        </Field>
        <Field label={t("emailLabel")} error={errors.email?.message}>
          <Input {...register("email")} type="email" placeholder={t("emailPlaceholder")} autoComplete="email" />
        </Field>
      </div>

      <Field label={t("packageLabel")} error={errors.packageSlug?.message}>
        <select
          {...register("packageSlug")}
          className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
        >
          <option value="">{t("packageNotListed")}</option>
          {PACKAGES.map((pkg) => (
            <option key={pkg.slug} value={pkg.slug}>
              {tPkg(`${pkg.slug}.name`)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("problemLabel")} error={errors.problem?.message}>
        <Textarea {...register("problem")} placeholder={t("problemPlaceholder")} rows={5} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("timelineLabel")} error={errors.timeline?.message}>
          <Input {...register("timeline")} placeholder={t("timelinePlaceholder")} />
        </Field>
        <Field label={t("budgetLabel")} error={errors.budgetRange?.message}>
          <Input {...register("budgetRange")} placeholder={t("budgetPlaceholder")} />
        </Field>
      </div>

      {status === "error" && errorMessage && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}

      <Button type="submit" size="lg" disabled={status === "submitting"} className="gap-2">
        {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === "submitting" ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
      {error && <span className={cn("block text-xs text-red-400")}>{error}</span>}
    </label>
  );
}
