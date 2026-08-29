import React from "react";
import Link from "next/link";

/**
 * Single site-wide footer (Stage 8 Task 8.3; Project Scoper link added
 * Stage 14) — links repeat /packages and /custom-projects so there's
 * always a second way into either path besides the header CTA, plus a
 * fallback /contact and an anchor into the homepage estimator section.
 */
export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-[#09090b] py-10 text-zinc-500 text-xs">
      <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left space-y-1">
          <div className="font-medium text-zinc-300">IxMa Operations</div>
          <p className="text-zinc-500">Contract automation work — pre-scoped packages or a custom project.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-zinc-400 text-xs">
          <Link href="/#project-scoper" className="hover:text-zinc-200">Project Scoper</Link>
          <Link href="/packages" className="hover:text-zinc-200">Packages</Link>
          <Link href="/custom-projects" className="hover:text-zinc-200">Custom Projects</Link>
          <Link href="/contact" className="hover:text-zinc-200">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
