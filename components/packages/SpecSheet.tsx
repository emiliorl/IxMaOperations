import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Input / output / turnaround rows for a package, laid out like a datasheet
 * (design revamp, Phase 3). Takes already-translated strings so both the
 * catalog card (`useTranslations`) and the detail page (`getTranslations`)
 * can render it. Turnaround is the only number it ever shows — never a price
 * (STANDARDS.md Rule 2).
 */
export function SpecSheet({
  rows,
  className,
}: {
  rows: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <dl className={cn("border-t border-zinc-800/80", className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[4.75rem_1fr] gap-3 py-2 border-b border-zinc-800/80 last:border-b-0"
        >
          <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 pt-0.5">{row.label}</dt>
          <dd className="text-xs text-zinc-300 leading-relaxed">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
