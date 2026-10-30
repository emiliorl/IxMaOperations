"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createTicket, type FormState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { MAX_FILES, MAX_TOTAL_BYTES, humanSize } from "@/lib/portal/attachments";
import { TICKET_CATEGORIES, TICKET_ENVIRONMENTS, TICKET_PRIORITIES } from "@/lib/portal/constants";
import { showAreaPicker } from "@/lib/portal/ticket-form";
import { errorMessageKey } from "./error-messages";
import { Field, selectClass } from "./Field";
import { FileField } from "./FileField";

export interface PlanItemOption {
  id: string;
  title: string;
  description: string | null;
  /** The area the item belongs to; null = whole project. */
  departmentId: string | null;
}

/**
 * Report a problem in a few clear steps: what is it about, what happened, a
 * screenshot. Arriving from a plan item shows that item as a small card (with a
 * way to change it) instead of a dropdown, a preview and a locked field all at
 * once; the area is only asked when there is a real choice; the technical
 * details (priority, environment, page) wait behind a disclosure with sensible
 * defaults. What the person typed is kept in state, so a server-side error
 * never wipes it.
 */
export function TicketForm({
  locale,
  projectSlug,
  folders,
  items,
  initialItemId,
  defaultFolderId,
  isAdmin,
}: {
  locale: string;
  projectSlug: string;
  /** Areas this person may open tickets in. */
  folders: { id: string; name: string }[];
  /** Plan items this person may report against. */
  items: PlanItemOption[];
  /** Pre-selected plan item (from a "Report an issue" link), or "". */
  initialItemId: string;
  /** Pre-selected area ("" = whole project). */
  defaultFolderId: string;
  /** The owner sees the technical details open; everyone else starts with them folded away. */
  isAdmin: boolean;
}) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<FormState, FormData>(createTicket, {});
  const [itemId, setItemId] = useState(items.some((i) => i.id === initialItemId) ? initialItemId : "");
  const [choosingItem, setChoosingItem] = useState(false);
  const [folderId, setFolderId] = useState(defaultFolderId);
  const [customTitle, setCustomTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("bug");
  const [priority, setPriority] = useState<string>("medium");
  const [environment, setEnvironment] = useState<string>("production");
  const [affectedUrl, setAffectedUrl] = useState("");

  const item = items.find((i) => i.id === itemId) ?? null;
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name ?? t("deptProjectWide");
  // A plan item that belongs to an area decides the area; otherwise the person chooses (when there is a choice).
  const lockedFolder = item?.departmentId ?? null;
  const effectiveFolder = lockedFolder ?? folderId;
  const askArea = showAreaPicker(folders.length, lockedFolder);
  // Without a plan item the ticket needs its own title; with one it is named after it, unless the person wants a custom one.
  const titleRequired = !item;
  const showTitle = titleRequired || customTitle;

  let step = 0;
  const n = () => String(++step).padStart(2, "0");

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

        {/* What is this about? A chosen item is a compact card; changing it (or having none) shows the list. */}
        {item && !choosingItem ? (
          <div className="space-y-1.5">
            <p className="flex items-baseline gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
              <span className="text-zinc-600">{n()}</span>
              {t("fieldItem")}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-zinc-100">{item.title}</p>
                <p className="font-mono text-[11px] text-zinc-500">{folderName(item.departmentId)}</p>
              </div>
              <button
                type="button"
                onClick={() => setChoosingItem(true)}
                className="shrink-0 text-xs text-zinc-400 underline underline-offset-4 hover:text-zinc-100"
              >
                {t("changeItem")}
              </button>
            </div>
          </div>
        ) : (
          <Field index={n()} label={t("fieldItem")} help={t("fieldItemHelp")} htmlFor="t-item">
            <select
              id="t-item"
              value={itemId}
              onChange={(event) => {
                setItemId(event.target.value);
                setChoosingItem(false);
              }}
              className={selectClass}
            >
              <option value="">{t("fieldItemNone")}</option>
              {items.map((planItem) => (
                <option key={planItem.id} value={planItem.id}>
                  {planItem.title}
                  {planItem.departmentId ? ` — ${folderName(planItem.departmentId)}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        {askArea && (
          <Field index={n()} label={t("fieldDepartment")} help={t("fieldDepartmentHelp")} htmlFor="t-folder">
            <select id="t-folder" value={folderId} onChange={(event) => setFolderId(event.target.value)} className={selectClass}>
              <option value="">{t("deptProjectWide")}</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        {showTitle ? (
          <Field
            index={n()}
            label={titleRequired ? t("fieldTitle") : t("fieldTitleOptional")}
            help={titleRequired ? t("fieldTitleHelp") : t("fieldTitleOptionalHelp")}
            htmlFor="t-title"
          >
            <Input
              id="t-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required={titleRequired}
              minLength={titleRequired ? 3 : undefined}
              maxLength={200}
            />
          </Field>
        ) : (
          <button type="button" onClick={() => setCustomTitle(true)} className="block text-xs text-zinc-500 hover:text-zinc-200">
            {t("addCustomTitle")}
          </button>
        )}

        <Field index={n()} label={t("fieldDescription")} help={t("fieldDescriptionHelp")} htmlFor="t-desc">
          <Textarea
            id="t-desc"
            name="description"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            maxLength={5000}
            autoFocus={Boolean(item) && !showTitle}
          />
        </Field>

        <Field index={n()} label={t("fieldFiles")} help={t("fieldFilesHelp", { n: MAX_FILES, size: humanSize(MAX_TOTAL_BYTES) })} htmlFor="t-files">
          <FileField id="t-files" />
        </Field>

        {/* What kind of ticket stays visible: a question or a request is not a bug, and the owner reads this first. */}
        <Field index={n()} label={t("fieldCategory")} htmlFor="t-category">
          <select id="t-category" name="category" value={category} onChange={(event) => setCategory(event.target.value)} className={selectClass}>
            {TICKET_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t(`category.${value}`)}
              </option>
            ))}
          </select>
        </Field>

        <details open={isAdmin} className="group rounded-md border border-zinc-800">
          <summary className="flex cursor-pointer list-none select-none items-center justify-between px-3 py-2.5 text-xs text-zinc-400 hover:text-zinc-200">
            {t("moreDetails")}
            <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
          </summary>
          {/* Closed or open, these are part of the form and are submitted with it. */}
          <div className="grid grid-cols-1 gap-4 border-t border-zinc-800 p-3 sm:grid-cols-2">
            <Field index="·" label={t("fieldPriority")} htmlFor="t-priority">
              <select id="t-priority" name="priority" value={priority} onChange={(event) => setPriority(event.target.value)} className={selectClass}>
                {TICKET_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {t(`priority.${value}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field index="·" label={t("fieldEnvironment")} htmlFor="t-env">
              <select id="t-env" name="environment" value={environment} onChange={(event) => setEnvironment(event.target.value)} className={selectClass}>
                {TICKET_ENVIRONMENTS.map((value) => (
                  <option key={value} value={value}>
                    {t(`environment.${value}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field index="·" label={t("fieldAffectedUrl")} help={t("fieldAffectedUrlHelp")} htmlFor="t-url" className="sm:col-span-2">
              <Input
                id="t-url"
                name="affectedUrl"
                type="url"
                value={affectedUrl}
                onChange={(event) => setAffectedUrl(event.target.value)}
                maxLength={500}
                placeholder="https://"
              />
            </Field>
          </div>
        </details>

        {state.error && (
          <p role="alert" className="text-xs text-red-400">
            {t(errorMessageKey(state.error, "ticket"), { n: 5, size: "4 MB" })}
          </p>
        )}
      </div>

      <div className="border-t border-zinc-800 bg-zinc-900/40 px-5 py-4 sm:px-6">
        <Button type="submit" size="lg" disabled={pending} className="w-full gap-2 sm:w-auto">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? t("creating") : t("createTicket")}
        </Button>
      </div>
    </form>
  );
}
