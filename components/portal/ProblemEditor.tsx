"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Eye, PenLine, Columns2 } from "lucide-react";
import { updateProblem, type FormState } from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useRouter } from "@/i18n/navigation";
import { MILESTONE_STATUSES, type MilestoneStatus } from "@/lib/portal/constants";
import { cn } from "@/lib/utils";
import { Field, selectClass } from "./Field";
import { errorMessageKey } from "./error-messages";
import { Markdown } from "./Markdown";

export interface ProblemEditorValues {
  title: string;
  summary: string;
  delivery: string;
  priority: "high" | "medium" | "low";
  status: MilestoneStatus;
  waitingFor?: string;
  solution: string;
  /** One per line: "Label | https://..." */
  links: string;
}

/** Owner: edit a problem's text in place with live markdown preview. */
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
  const [status, setStatus] = useState<MilestoneStatus>(initial.status);
  const [waitingFor, setWaitingFor] = useState(initial.waitingFor ?? "");
  const [solutionText, setSolutionText] = useState(initial.solution);
  const [previewTab, setPreviewTab] = useState<"write" | "preview" | "split">("write");

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
        <div className="grid gap-4 sm:grid-cols-3">
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
          <Field index="05" label={t("adminFieldStatus")} htmlFor="pe-status">
            <select
              id="pe-status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
              className={selectClass}
            >
              {MILESTONE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`milestoneStatus.${s}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {status === "waiting" && (
          <Field index="06" label={t("adminFieldWaitingFor")} htmlFor="pe-waiting" help={t("adminFieldWaitingForHelp")}>
            <Input
              id="pe-waiting"
              name="waitingFor"
              value={waitingFor}
              onChange={(e) => setWaitingFor(e.target.value)}
              placeholder={t("waitingForPlaceholder")}
              maxLength={500}
            />
          </Field>
        )}

        {/* Action Plan with Live Preview Toolbar */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="pe-solution" className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              <span className="text-zinc-600 mr-2">{status === "waiting" ? "07" : "06"}</span>
              {t("adminFieldPlan")}
            </label>
            <div className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-950 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPreviewTab("write")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors",
                  previewTab === "write"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <PenLine className="h-3 w-3" />
                {t("previewWrite")}
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("preview")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors",
                  previewTab === "preview"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Eye className="h-3 w-3" />
                {t("previewTab")}
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab("split")}
                className={cn(
                  "hidden lg:inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition-colors",
                  previewTab === "split"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Columns2 className="h-3 w-3" />
                {t("previewSplit")}
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500">{t("adminFieldPlanHelp")}</p>

          {/* Write Mode */}
          {previewTab === "write" && (
            <Textarea
              id="pe-solution"
              name="solution"
              rows={14}
              value={solutionText}
              onChange={(e) => setSolutionText(e.target.value)}
              maxLength={100000}
              className="font-mono text-xs"
            />
          )}

          {/* Preview Mode */}
          {previewTab === "preview" && (
            <>
              {/* Keep form value submitted */}
              <input type="hidden" name="solution" value={solutionText} />
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-5 sm:p-7 min-h-[300px] overflow-x-auto">
                {solutionText.trim() ? (
                  <Markdown>{solutionText}</Markdown>
                ) : (
                  <p className="text-sm italic text-zinc-500">{t("previewEmpty")}</p>
                )}
              </div>
            </>
          )}

          {/* Split Mode (Side by side on lg+) */}
          {previewTab === "split" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Textarea
                id="pe-solution"
                name="solution"
                rows={16}
                value={solutionText}
                onChange={(e) => setSolutionText(e.target.value)}
                maxLength={100000}
                className="font-mono text-xs"
              />
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-5 max-h-[460px] overflow-y-auto">
                {solutionText.trim() ? (
                  <Markdown>{solutionText}</Markdown>
                ) : (
                  <p className="text-sm italic text-zinc-500">{t("previewEmpty")}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <Field index={status === "waiting" ? "08" : "07"} label={t("adminFieldLinks")} htmlFor="pe-links" help={t("adminFieldLinksHelp")}>
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
