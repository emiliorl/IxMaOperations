import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CAPABILITIES } from "@/lib/capabilities";
import { CAPABILITY_ICONS } from "@/lib/capability-icons";
import { PlayCircle } from "lucide-react";

/**
 * Homepage "See It In Action" section (v4 pivot, Aug 29, 2026 — replaces
 * `CapabilityStrip.tsx`). This site now shows skill demos directly instead
 * of shallow cards that link out to a separate portfolio (superseded
 * PROJECT_BLUEPRINT.md Section 4 — see Section 0 v4 for the pivot).
 *
 * Each card gets a real animation/graph slot. Emilio hasn't dropped the
 * media in yet, so the slot renders a clearly labeled placeholder instead
 * of a working demo or simulated backend (Section 8 Rule 2 still stands —
 * a placeholder stays honest about being one). Swap the placeholder `div`
 * for the real embed/animation per card as it's built.
 */
export function ExamplesSection() {
  return (
    <section id="examples" className="py-16 md:py-24 border-b border-zinc-800 bg-zinc-950/60 scroll-mt-16">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-2xl mb-12 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            See It In Action
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            What this looks like when it's built
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Live walkthroughs and graphs for each skill area, going up here as they're ready.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CAPABILITIES.map((capability) => {
            const Icon = CAPABILITY_ICONS[capability.icon];
            return (
              <Card key={capability.packageSlug} className="flex flex-col p-6 space-y-5">
                <div className="flex flex-col items-center justify-center gap-2 aspect-video rounded-md border border-dashed border-zinc-800 bg-zinc-900/50 text-zinc-600">
                  <PlayCircle className="h-6 w-6" />
                  <span className="text-[11px] font-mono uppercase tracking-wider">Animation / graph — coming soon</span>
                </div>

                <div className="space-y-4">
                  <div className="p-2 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 w-fit">
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white leading-snug">{capability.name}</h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{capability.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
