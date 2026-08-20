"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SolopreneurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-zinc-100">
      {/* Minimal Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-6xl">
          <Link href="/tools" className="flex items-center gap-2.5">
            <span className="font-semibold text-sm tracking-tight text-white">
              IxMa Micro-Sprints
            </span>
          </Link>

          <nav className="flex items-center gap-6 text-xs text-zinc-400">
            <Link
              href="/"
              className="hover:text-zinc-100 transition-colors"
            >
              Enterprise
            </Link>
            <Link
              href="/tools"
              className={`hover:text-zinc-100 transition-colors ${
                pathname === "/tools" ? "text-zinc-100 font-medium" : ""
              }`}
            >
              Sprint Catalog
            </Link>
            <Link
              href="/portal"
              className={`hover:text-zinc-100 transition-colors ${
                pathname === "/portal" ? "text-zinc-100 font-medium" : ""
              }`}
            >
              Client Portal
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-[#09090b] py-10 text-zinc-500 text-xs">
        <div className="container mx-auto px-6 max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-medium text-zinc-300">IxMa Micro-Sprints</div>
            <p className="text-zinc-500">Autonomous 48-Hour Engineering Sprints for Operators & Founders.</p>
          </div>

          <div className="flex gap-4 text-zinc-400 text-xs">
            <Link href="/" className="hover:text-zinc-200">Enterprise</Link>
            <Link href="/tools" className="hover:text-zinc-200">Sprint Catalog</Link>
            <Link href="/portal" className="hover:text-zinc-200">Client Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
