import * as React from "react";
import { cn } from "@/lib/utils";

/** Numbered mono field wrapper — the same pattern as the brief form (`01 NAME`). */
export function Field({
  index,
  label,
  help,
  htmlFor,
  children,
  className,
}: {
  index: string;
  label: string;
  help?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
        <span className="text-zinc-600">{index}</span>
        {label}
      </label>
      {children}
      {help && <p className="text-[11px] text-zinc-500 leading-relaxed">{help}</p>}
    </div>
  );
}

export const selectClass =
  "flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 sm:h-10 sm:text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-60";
