"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createTicket, type FormState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { MAX_FILES, MAX_TOTAL_BYTES, humanSize } from "@/lib/portal/attachments";
import { TICKET_CATEGORIES, TICKET_ENVIRONMENTS, TICKET_PRIORITIES } from "@/lib/portal/constants";
import { errorMessageKey } from "./error-messages";
import { Field, selectClass } from "./Field";
import { FileField } from "./FileField";

export interface PlanItemOption {
  id: string;
  title: string;
  description: string | null;
  /** The folder the item belongs to; null = whole project. */
  departmentId: string | null;
}

/**
 * Report a problem. The first question is "what is this about?" — picking a
 * plan item (a problem from the diagnosis) files the ticket in that item's
 * folder, shows the item's context, and makes the title optional (the ticket
 * is named after the item). That is what keeps typing to a minimum; the person
 * then adds what they saw and, ideally, a screenshot so the problem can be
 * recreated.
 */
export function TicketForm({
  locale,
  projectSlug,
  folders,
  items,
  initialItemId,
  defaultFolderId,
}: {
  locale: string;
  projectSlug: string;
  /** Folders this person may open tickets in. */
  folders: { id: string; name: string }[];
  /** Plan items this person may report against. */
  items: PlanItemOption[];
  /** Pre-selected plan item (from a "Report a problem" link), or "". */
  initialItemId: string;
  /** Pre-selected folder ("" = project-wide). */
  defaultFolderId: string;
}) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<FormState, FormData>(createTicket, {});
  const [itemId, setItemId] = useState(items.some((i) => i.id === initialItemId) ? initialItemId : "");
  const [folderId, setFolderId] = useState(defaultFolderId);

  const item = items.find((i) => i.id === itemId) ?? null;
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? t("deptProjectWide");
  // A plan item that belongs to a folder decides the folder; otherwise the person chooses.
  const lockedFolder = item?.departmentId ?? null;
  const effectiveFolder = lockedFolder ?? folderId;

  return (
    <form action={action} className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        <span className="text-zinc-600">{"// "}</span>
        {t("openTicket")}
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="milestoneId" value={itemId} />
        <input type="hidden" name="departmentId" value={effectiveFolder} />

        <Field index="01" label={t("fieldItem")} help={t("fieldItemHelp")} htmlFor="t-item">
          <select id="t-item" value={itemId} onChange={(event) => setItemId(event.target.value)} className={selectClass}>
            <option value="">{t("fieldItemNone")}</option>
            {items.map((planItem) => (
              <option key={planItem.id} value={planItem.id}>
                {planItem.title}
                {planItem.departmentId ? ` — ${folderName(planItem.departmentId)}` : ""}
              </option>
            ))}
          </select>
        </Field>

        {item && (
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-3 space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{t("itemContext")}</p>
            <p className="text-sm text-zinc-100">{item.title}</p>
            {item.description && <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>}
            <p className="text-[11px] font-mono text-zinc-500">{folderName(item.departmentId)}</p>
          </div>
        )}

        <Field
          index="02"
          label={item ? t("fieldTitleOptional") : t("fieldTitle")}
          help={item ? t("fieldTitleOptionalHelp") : t("fieldTitleHelp")}
          htmlFor="t-title"
        >
          <Input id="t-title" name="title" required={!item} minLength={item ? undefined : 3} maxLength={200} />
        </Field>

        <Field index="03" label={t("fieldDescription")} help={t("fieldDescriptionHelp")} htmlFor="t-desc">
          <Textarea id="t-desc" name="description" rows={5} required maxLength={5000} />
        </Field>

        <Field index="04" label={t("fieldFiles")} help={t("fieldFilesHelp", { n: MAX_FILES, size: humanSize(MAX_TOTAL_BYTES) })} htmlFor="t-files">
          <FileField id="t-files" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field index="05" label={t("fieldCategory")} htmlFor="t-category">
            <select id="t-category" name="category" defaultValue="bug" className={selectClass}>
              {TICKET_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {t(`category.${value}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field index="06" label={t("fieldPriority")} htmlFor="t-priority">
            <select id="t-priority" name="priority" defaultValue="medium" className={selectClass}>
              {TICKET_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {t(`priority.${value}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field index="07" label={t("fieldEnvironment")} htmlFor="t-env">
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
          <Field index="08" label={t("fieldDepartment")} help={t("fieldDepartmentHelp")} htmlFor="t-folder">
            {/* Disabled controls aren't submitted — the hidden field above carries the value. */}
            <select
              id="t-folder"
              value={effectiveFolder}
              disabled={lockedFolder !== null}
              onChange={(event) => setFolderId(event.target.value)}
              className={selectClass}
            >
              <option value="">{t("deptProjectWide")}</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </Field>
          <Field index="09" label={t("fieldAffectedUrl")} help={t("fieldAffectedUrlHelp")} htmlFor="t-url">
            <Input id="t-url" name="affectedUrl" type="url" maxLength={500} placeholder="https://" />
          </Field>
        </div>

        {state.error && (
          <p role="alert" className="text-xs text-red-400">
            {t(errorMessageKey(state.error, "ticket"), { n: 5, size: "4 MB" })}
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
