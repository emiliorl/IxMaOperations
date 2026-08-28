"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/Button";

/**
 * Single site-wide header (Stage 8 Task 8.2) — replaces the v2 Services/
 * Examples/Contact nav.
 *
 * Nav = Packages / Custom Projects / Contact (3 links, logo doubles as
 * Home), one CTA — "Get Started" — routing to /packages. No price ever
 * appears here (STANDARDS.md Rule 2, .agents/rules/website-style.md).
 */
const NAV_LINKS = [
  { href: "/packages", label: "Packages" },
  { href: "/custom-projects", label: "Custom Projects" },
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
          <Link href="/packages" className={buttonVariants({ size: "sm", variant: "default" })}>
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
