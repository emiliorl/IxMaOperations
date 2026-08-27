import React from "react";
import { Search, Hammer, PackageCheck } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Discover",
    description: "You show us the manual grind — we scope the smallest automation that removes it.",
  },
  {
    icon: Hammer,
    title: "Build",
    description: "We build it against your real workflow, not a generic template.",
  },
  {
    icon: PackageCheck,
    title: "Deliver",
    description: "You get a working automation, walked through, ready to use.",
  },
];

/**
 * Simple 3-step process strip (Task 9.3) — replaces the old audit/discovery-call
 * enterprise framing with a plain Discover → Build → Deliver sequence.
 */
export function ProcessSteps() {
  return (
    <section className="py-16 md:py-20 border-b border-zinc-800">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-2xl mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">How it works</h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            No pricing tiers, no self-serve checkout — just three steps from example to delivered automation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex flex-col gap-3 p-5 rounded-lg border border-zinc-800/80 bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">Step {idx + 1}</span>
                </div>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
