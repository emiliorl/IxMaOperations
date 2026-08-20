"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, ArrowLeft, ShieldCheck, Box, Terminal, Cpu } from "lucide-react";

export default function SolopreneurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Segmentation Bar */}
      <div className="bg-slate-950 border-b border-slate-800/80 text-xs py-1.5 px-4 text-center">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-slate-400 hover:text-white font-mono text-[11px] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Enterprise Solutions ($5k–$25k+)</span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge variant="cyan" className="text-[10px] font-mono">
              Fixed-Scope 48h Micro-Sprints
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Solopreneur Navigation */}
      <header className="sticky top-0 z-40 bg-[#070a10]/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/tools" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center group-hover:border-cyan-400 transition-colors">
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block leading-none">
                IxMa Micro-Sprints
              </span>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                Productized AI Sprints
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/tools"
              className={`hover:text-cyan-300 transition-colors ${
                pathname === "/tools" ? "text-cyan-400 font-semibold" : "text-slate-400"
              }`}
            >
              Sprint Catalog
            </Link>
            <Link
              href="/portal"
              className={`hover:text-cyan-300 transition-colors ${
                pathname === "/portal" ? "text-cyan-400 font-semibold" : "text-slate-400"
              }`}
            >
              Client Portal
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Solopreneur Footer */}
      <footer className="border-t border-slate-800 bg-[#070a10] py-10 text-slate-500 text-xs">
        <div className="container mx-auto px-4 max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-bold text-slate-300 font-mono">IxMa Productized Engineering</div>
            <p className="text-[11px] text-slate-500">Autonomous 48-Hour Micro-Sprints for Operators & Founders.</p>
          </div>

          <div className="flex gap-4 font-mono text-[11px]">
            <Link href="/" className="hover:text-slate-300">Enterprise Solutions</Link>
            <Link href="/tools" className="hover:text-slate-300 text-cyan-400">Sprint Catalog</Link>
            <Link href="/portal" className="hover:text-slate-300">Client Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
