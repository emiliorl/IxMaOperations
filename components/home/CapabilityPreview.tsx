"use client";

/**
 * components/home/CapabilityPreview.tsx
 *
 * A small, always-looping 3-stage flow diagram used as each capability
 * card's media slot on the homepage (v5 pivot, Sep 1, 2026 — see
 * `components/home/ExamplesSection.tsx`'s header comment). This is a
 * decorative sketch of the general shape of the pipeline (input ->
 * processing -> output), not the real engine — it never claims to be one.
 * The real, working demo for a capability lives at its package detail
 * page (`app/[locale]/packages/[slug]/page.tsx`), reached via the card's
 * link.
 *
 * Built with plain CSS animation (STANDARDS.md: no neon glow/gradients,
 * zinc palette, 1px hairline borders) using the shared `flow-pulse` and
 * `pulse-glow` keyframes from `tailwind.config.ts`.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

interface CapabilityPreviewProps {
  /** Already-rendered icon element (e.g. `<Search className="h-3.5 w-3.5" />`) — a component
   * reference can't cross the server -> client boundary, only a rendered element can. */
  icon: React.ReactNode;
  steps: [string, string, string];
  className?: string;
}

export function CapabilityPreview({ icon, steps, className }: CapabilityPreviewProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-6 aspect-video overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center">
        {steps.map((step, i) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center gap-1.5 text-center w-16 shrink-0">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border",
                  i === 0 && "border-dashed border-zinc-700 bg-zinc-950 text-zinc-500",
                  i === 1 && "border-zinc-600 bg-zinc-800 text-zinc-100 animate-pulse-glow",
                  i === 2 && "border-emerald-900/60 bg-emerald-950/30 text-emerald-400"
                )}
              >
                {icon}
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 leading-tight">
                {step}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div className="relative h-px flex-1 bg-zinc-800 min-w-4">
                <span
                  className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-zinc-200 animate-flow-pulse"
                  style={{ animationDelay: `${i * 0.5}s` }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
