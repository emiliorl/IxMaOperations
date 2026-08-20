"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FeasibilityModal } from "@/components/enterprise/FeasibilityModal";
import { Cpu, Terminal, ArrowUpRight, ShieldCheck, Sparkles, Sliders } from "lucide-react";

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { setFeasibilityModalOpen } = useAppStore();

  const navLinks = [
    { href: "/", label: "Solutions & Architecture" },
    { href: "/sandbox", label: "Interactive Lab" },
    { href: "/case-studies", label: "Industrial Case Studies" },
    { href: "/audit", label: "2-Week Discovery Audit" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Segmentation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-xs py-1.5 px-4 text-center">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
              IxMaOperations
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-mono text-[10px] hidden sm:inline">
              High-Consequence AI Engineering
            </span>
          </div>

          {/* Funnel Switcher Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Enterprise Solutions
            </span>
            <Link
              href="/tools"
              className="px-2.5 py-0.5 rounded-md text-[10px] font-mono text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span>Solopreneur Micro-Sprints ($499)</span>
              <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Enterprise Navigation */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:border-emerald-400 transition-colors">
              <Cpu className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block leading-none">
                IxMaOperations
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Industrial Edge Systems
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`transition-colors hover:text-white ${
                    isActive ? "text-emerald-400 font-semibold" : ""
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* CTA Button */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="default"
              onClick={() => setFeasibilityModalOpen(true)}
              className="gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              Book Technical Feasibility
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">{children}</main>

      {/* Enterprise Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-slate-400 text-xs">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="font-bold text-white font-mono text-sm">IxMaOperations Inc.</div>
            <p className="text-slate-500">
              Deterministic Industrial Computer Vision & Edge TensorRT Automation.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-[11px]">
            <Link href="/" className="hover:text-slate-200">Enterprise Track</Link>
            <Link href="/tools" className="hover:text-slate-200 text-cyan-400">Solopreneur Track</Link>
            <Link href="/audit" className="hover:text-slate-200">Discovery Audit</Link>
            <Link href="/case-studies" className="hover:text-slate-200">Case Studies</Link>
          </div>
        </div>
      </footer>

      {/* Global Feasibility Modal for Enterprise */}
      <FeasibilityModal />
    </div>
  );
}
