"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { selectClass } from "./Field";

/**
 * Owner: change a status. Tells the owner when the change did not happen
 * (instead of looking as if it had), and re-reads the page's data as soon as it
 * is saved so the new status shows everywhere at once. The database still
 * decides who may change what.
 */
export function StatusForm({
  action,
  hidden,
  current,
  options,
  ariaLabel,
  className,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Fixed fields the action needs (locale, ids). */
  hidden: Record<string, string>;
  current: string;
  options: { value: string; label: string }[];
  ariaLabel: string;
  className?: string;
}) {
  const t = useTranslations("Portal");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  // Controlled, so the browser's "reset the form after an action" can't flip it back to the old value while the page refreshes.
  const [value, setValue] = useState(current);

  useEffect(() => setValue(current), [current]);
  useEffect(() => {
    if (state.ok) router.refresh();
    if (state.error) setValue(current); // the change didn't happen: show the real status again
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to each new result, not to `current`
  }, [state]);

  return (
    <form action={formAction} className={cn("flex flex-wrap items-center gap-2", className)}>
      {Object.entries(hidden).map(([name, hiddenValue]) => (
        <input key={name} type="hidden" name={name} value={hiddenValue} />
      ))}
      <select
        name="status"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={ariaLabel}
        disabled={pending}
        className={cn(selectClass, "h-8 w-auto text-xs")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "gap-1.5")}>
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {t("save")}
      </button>
      {state.error && (
        <p role="alert" className="basis-full text-[11px] text-red-400">
          {t("statusError")}
        </p>
      )}
    </form>
  );
}
