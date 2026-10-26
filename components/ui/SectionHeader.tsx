import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Left-aligned section entrance: a monospaced index eyebrow
 * (`// 01 CAPABILITIES`), a hairline rule, then the heading and body copy.
 * Replaces the centered `[ Badge ]` + `<h2>` stack that every section used to
 * open with (design revamp plan, Section 1 — "Badge-itis"). STANDARDS.md
 * Section 3: section headings are `text-2xl sm:text-3xl`, body `max-w-2xl`;
 * `as="h1"` bumps the size up for a page's single top-level title.
 */
export function SectionHeader({
  index,
  label,
  title,
  description,
  as: Heading = "h2",
  className,
}: {
  /** Two-digit section number, e.g. "01". */
  index: string;
  /** Short eyebrow label — uppercased by CSS, so pass natural case. */
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl space-y-3", className)}>
      <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        <span>
          <span className="text-zinc-600">{"// "}</span>
          {index} {label}
        </span>
        <span className="h-px flex-1 bg-zinc-800" aria-hidden="true" />
      </div>
      <Heading
        className={cn(
          "font-semibold text-white tracking-tight",
          Heading === "h1" ? "text-3xl sm:text-4xl md:text-5xl" : "text-2xl sm:text-3xl"
        )}
      >
        {title}
      </Heading>
      {description && (
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
