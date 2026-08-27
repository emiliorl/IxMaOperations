"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/Button";

/**
 * Single site-wide header — replaces the old (enterprise)/(solopreneur)
 * layout headers and the Enterprise/Solopreneur track switcher.
 *
 * Nav = Services / Examples / Contact (3 links, logo doubles as Home),
 * one CTA — "Book a Call" — everywhere, routing to /contact.
 * See STANDARDS.md Section 4 and PLAN_PROGRESS.md Stage 8.
 */
const NAV_LINKS = [
  { href: "/#services", label: "Services" },
  { href: "/examples", label: "Examples" },
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
          <Link href="/contact" className={buttonVariants({ size: "sm", variant: "default" })}>
            Book a Call
          </Link>
        </div>
      </div>
    </header>
  );
}
