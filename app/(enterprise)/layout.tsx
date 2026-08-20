"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { FeasibilityModal } from "@/components/enterprise/FeasibilityModal";

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setFeasibilityModalOpen } = useAppStore();

  const navLinks = [
    { href: "/", label: "Enterprise" },
    { href: "/sandbox", label: "Interactive Sandboxes" },
    { href: "/case-studies", label: "Case Studies" },
    { href: "/audit", label: "Discovery Audit" },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-zinc-100">
      {/* Minimal Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-6xl">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-semibold text-sm tracking-tight text-white">
              IxMa Operations
            </span>
          </Link>

          {/* Clean Nav Links (Max 4 plain text links) */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-zinc-400">
            {navLinks.map((link) => {
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

          {/* Single High-Contrast Header CTA */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="default"
              onClick={() => setFeasibilityModalOpen(true)}
            >
              Book Feasibility Call
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">{children}</main>

      {/* Sober Minimalist Footer */}
      <footer className="border-t border-zinc-800 bg-[#09090b] py-10 text-zinc-500 text-xs">
        <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left space-y-1">
            <div className="font-medium text-zinc-300">IxMa Operations Inc.</div>
            <p className="text-zinc-500">Deterministic Industrial AI & Edge Vision Systems.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-zinc-400 text-xs">
            <Link href="/" className="hover:text-zinc-200">Enterprise</Link>
            <Link href="/tools" className="hover:text-zinc-200">Micro-Sprints</Link>
            <Link href="/audit" className="hover:text-zinc-200">Discovery Audit</Link>
            <Link href="/case-studies" className="hover:text-zinc-200">Case Studies</Link>
          </div>
        </div>
      </footer>

      {/* Global Feasibility Modal */}
      <FeasibilityModal />
    </div>
  );
}
