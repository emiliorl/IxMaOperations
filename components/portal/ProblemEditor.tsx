"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { updateProblem, type FormState } from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Field, selectClass } from "./Field";
import { errorMessageKey } from "./error-messages";

export interface ProblemEditorValues {
  title: string;
  summary: string;
  delivery: string;
  priority: "high" | "medium" | "low";
  solution: string;
  /** One per line: "Label | https://..." */
  links: string;
}

/** Owner: edit a problem's text in place. The server action is owner-only and the database refuses anyone else. */
export function ProblemEditor({
  locale,
  projectSlug,
  milestoneId,
  initial,
}: {
  locale: string;
  projectSlug: string;
  milestoneId: string;
  initial: ProblemEditorValues;
}) {
  const t = useTranslations("Portal");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateProblem, {});

  useEffect(() => {
    if (state.ok) router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to each new result
  }, [state]);

  return (
    <details className="rounded-lg border border-zinc-800/80 bg-zinc-900/30">
      <summary className="cursor-pointer list-none px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-400 hover:text-white">
        ✎ {t("adminEditProblem")}
      </summary>
      <form action={formAction} className="space-y-4 border-t border-zinc-800/80 p-5 sm:p-6">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="milestoneId" value={milestoneId} />
        <Field index="01" label={t("adminFieldTitle")} htmlFor="pe-title">
          <Input id="pe-title" name="title" defaultValue={initial.title} required maxLength={200} />
        </Field>
        <Field index="02" label={t("adminFieldSummary")} htmlFor="pe-summary">
          <Textarea id="pe-summary" name="summary" rows={2} defaultValue={initial.summary} maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field index="03" label={t("adminFieldDelivery")} htmlFor="pe-delivery">
            <Input id="pe-delivery" name="delivery" defaultValue={initial.delivery} maxLength={120} />
          </Field>
          <Field index="04" label={t("adminFieldPriority")} htmlFor="pe-priority">
            <select id="pe-priority" name="priority" defaultValue={initial.priority} className={selectClass}>
              {(["high", "medium", "low"] as const).map((p) => (
                <option key={p} value={p}>
                  {t(`problemPriority.${p}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field index="05" label={t("adminFieldPlan")} htmlFor="pe-solution" help={t("adminFieldPlanHelp")}>
          <Textarea id="pe-solution" name="solution" rows={12} defaultValue={initial.solution} maxLength={100000} className="font-mono text-xs" />
        </Field>
        <Field index="06" label={t("adminFieldLinks")} htmlFor="pe-links" help={t("adminFieldLinksHelp")}>
          <Textarea id="pe-links" name="links" rows={3} defaultValue={initial.links} maxLength={10000} className="font-mono text-xs" />
        </Field>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("save")}
          </button>
          {state.ok && <span className="text-xs text-emerald-400">{t("adminSaved")}</span>}
          {state.error && (
            <p role="alert" className="text-xs text-red-400">
              {t(errorMessageKey(state.error, "ticket"))}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}
