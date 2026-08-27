import type { Metadata } from "next";
import { BeforeAfterSimulator } from "@/components/sandboxes/BeforeAfterSimulator";

export const metadata: Metadata = {
  title: "Practical Examples — IxMaOperations",
  description: "See a before/after example for each of the 5 automation offers, with a sample run for each.",
};

/**
 * Examples gallery (Task 9.4) — one place to browse a before/after for
 * every offer, using the recopied BeforeAfterSimulator.
 */
export default function ExamplesPage() {
  return (
    <div>
      <div className="border-b border-zinc-800">
        <div className="container mx-auto px-6 max-w-6xl py-12 md:py-16">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">Practical Examples</h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            A before/after for each offer, plus a sample run so you can see roughly what comes back.
          </p>
        </div>
      </div>
      <BeforeAfterSimulator />
    </div>
  );
}
