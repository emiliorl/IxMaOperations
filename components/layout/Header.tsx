"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/Button";

/**
 * Single site-wide header (v4 pivot, Aug 29, 2026 — replaces the v3 Stage 8
 * nav now that the homepage leads with one onboarding flow instead of a
 * Packages/Custom Projects split).
 *
 * Nav = Examples / Packages / Contact (3 links, logo doubles as Home), one
 * CTA — "Get Started" — routing into the homepage questionnaire. No price
 * ever appears here (STANDARDS.md Rule 2, .agents/rules/website-style.md).
 */
const NAV_LINKS = [
  { href: "/#examples", label: "Examples" },
  { href: "/packages", label: "Packages" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800">
      <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-6xl">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-semibold text-sm tracking-tight text-white">
            IxMa Operations
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-zinc-100 ${
                  isActive ? "text-zinc-100 font-medium" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/#project-scoper" className={buttonVariants({ size: "sm", variant: "default" })}>
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
