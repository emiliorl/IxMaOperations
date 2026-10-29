"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { FormState } from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { selectClass } from "./Field";

/**
 * Owner: change a status. Tells the owner when the change did not happen
 * (instead of looking as if it had), and refreshes the page in place. The
 * database still decides who may change what.
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
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className={cn("flex flex-wrap items-center gap-2", className)}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <select name="status" defaultValue={current} aria-label={ariaLabel} disabled={pending} className={cn(selectClass, "h-8 w-auto text-xs")}>
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
