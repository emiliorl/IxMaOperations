"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createTicket, type FormState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { TICKET_CATEGORIES, TICKET_ENVIRONMENTS, TICKET_PRIORITIES } from "@/lib/portal/constants";
import { Field, selectClass } from "./Field";

const ERRORS = { invalid: "errorTicketInvalid", denied: "errorDenied", rate: "errorGeneric", unavailable: "errorGeneric", generic: "errorGeneric" } as const;

export function TicketForm({
  locale,
  projectSlug,
  departments,
  milestones,
  defaultDepartmentId,
  canPickProjectWide,
}: {
  locale: string;
  projectSlug: string;
  /** Departments this person may open tickets for. */
  departments: { id: string; name: string }[];
  milestones: { id: string; title: string }[];
  /** Pre-selected department ("" = project-wide). */
  defaultDepartmentId: string;
  /** Project-wide tickets are open to everyone on the project, so always allowed; kept explicit for clarity. */
  canPickProjectWide: boolean;
}) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<FormState, FormData>(createTicket, {});

  return (
    <form action={action} className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        <span className="text-zinc-600">{"// "}</span>
        {t("newTicket")}
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="projectSlug" value={projectSlug} />

        <Field index="01" label={t("fieldTitle")} help={t("fieldTitleHelp")} htmlFor="t-title">
          <Input id="t-title" name="title" required minLength={3} maxLength={200} />
        </Field>

        <Field index="02" label={t("fieldDescription")} help={t("fieldDescriptionHelp")} htmlFor="t-desc">
          <Textarea id="t-desc" name="description" rows={6} required maxLength={5000} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field index="03" label={t("fieldCategory")} htmlFor="t-category">
            <select id="t-category" name="category" defaultValue="question" className={selectClass}>
              {TICKET_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {t(`category.${value}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field index="04" label={t("fieldPriority")} htmlFor="t-priority">
            <select id="t-priority" name="priority" defaultValue="medium" className={selectClass}>
              {TICKET_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {t(`priority.${value}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field index="05" label={t("fieldDepartment")} help={t("fieldDepartmentHelp")} htmlFor="t-dept">
            <select id="t-dept" name="departmentId" defaultValue={defaultDepartmentId} className={selectClass}>
              {canPickProjectWide && <option value="">{t("deptProjectWide")}</option>}
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field index="06" label={t("fieldEnvironment")} htmlFor="t-env">
            <select id="t-env" name="environment" defaultValue="production" className={selectClass}>
              {TICKET_ENVIRONMENTS.map((value) => (
                <option key={value} value={value}>
                  {t(`environment.${value}`)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field index="07" label={t("fieldMilestone")} htmlFor="t-milestone">
            <select id="t-milestone" name="milestoneId" defaultValue="" className={selectClass}>
              <option value="">{t("fieldMilestoneNone")}</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </Field>
          <Field index="08" label={t("fieldAffectedUrl")} help={t("fieldAffectedUrlHelp")} htmlFor="t-url">
            <Input id="t-url" name="affectedUrl" type="url" maxLength={500} placeholder="https://" />
          </Field>
        </div>

        {state.error && (
          <p role="alert" className="text-xs text-red-400">
            {t(ERRORS[state.error])}
          </p>
        )}
      </div>

      <div className="border-t border-zinc-800 bg-zinc-900/40 px-5 py-4 sm:px-6">
        <Button type="submit" size="lg" disabled={pending} className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? t("creating") : t("createTicket")}
        </Button>
      </div>
    </form>
  );
}
