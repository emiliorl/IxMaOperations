import React from "react";
import Link from "next/link";

/**
 * Single site-wide footer (v4 pivot, Aug 29, 2026) — repeats the homepage
 * questionnaire and examples anchors plus /packages, /custom-projects, and
 * /contact so there's always a second way into any of them besides the
 * header CTA.
 */
export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-[#09090b] py-10 text-zinc-500 text-xs">
      <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left space-y-1">
          <div className="font-medium text-zinc-300">IxMa Operations</div>
          <p className="text-zinc-500">Automation and AI tooling — tell me what you need, I'll reply with scope and a time to talk.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-5 text-zinc-400 text-xs">
          <Link href="/#project-scoper" className="hover:text-zinc-200">Start Here</Link>
          <Link href="/#examples" className="hover:text-zinc-200">Examples</Link>
          <Link href="/packages" className="hover:text-zinc-200">Packages</Link>
          <Link href="/custom-projects" className="hover:text-zinc-200">Custom Projects</Link>
          <Link href="/contact" className="hover:text-zinc-200">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
