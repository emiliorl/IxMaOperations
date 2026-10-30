"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { selectClass } from "./Field";

/**
 * A compact dropdown that changes ONE URL filter and keeps the others. It
 * navigates on change (no Save button). Server pages stay in charge of what
 * each filter means; this only moves between URLs the page already understands.
 */
export function FilterSelect({
  label,
  pathname,
  param,
  value,
  options,
  query,
}: {
  label: string;
  pathname: string;
  /** The URL parameter this dropdown sets. */
  param: string;
  value: string;
  options: { value: string; label: string }[];
  /** The other filters currently in the URL; they are kept. */
  query: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = { ...query, [param]: event.target.value };
          startTransition(() => router.push({ pathname, query: next }));
        }}
        className={cn(selectClass, "h-10 w-auto min-w-[9rem] text-base sm:h-8 sm:text-xs", pending && "opacity-60")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
