"use client";

import React from "react";
import { MICRO_SPRINTS } from "@/lib/mock-data";
import { MicroSprintCard } from "@/components/solopreneur/MicroSprintCard";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Clock, ShieldCheck, Zap, Lock } from "lucide-react";

export default function ToolsCatalogPage() {
  return (
    <div className="py-12 container mx-auto px-4 max-w-6xl space-y-16">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="cyan" className="text-xs font-mono">
          Zero-Touch Asynchronous Fulfillment
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Fixed-Scope AI Engineering Micro-Sprints
        </h1>
        <p className="text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
          We turn pre-tested engineering modules into custom production automations for your business. Delivered in 48 hours without meetings or sales calls.
        </p>

        {/* Guarantees Bar */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-cyan-400" />
            <span>48-Hour Turnaround</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-emerald-400" />
            <span>AES-256 Key Vault</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <span>100% Code Ownership</span>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MICRO_SPRINTS.map((sprint) => (
          <MicroSprintCard key={sprint.slug} sprint={sprint} />
        ))}
      </div>

      {/* FAQ & Explainer */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-2xl p-8 max-w-3xl mx-auto space-y-6">
        <h3 className="text-xl font-bold text-white text-center">
          How 48-Hour Micro-Sprints Work
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300 text-center">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="font-mono text-cyan-400 font-bold text-sm">01. Direct Purchase</div>
            <p className="text-slate-400">Select your micro-sprint and check out via Stripe in 60 seconds.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="font-mono text-emerald-400 font-bold text-sm">02. Async Intake</div>
            <p className="text-slate-400">Paste your Loom walkthrough & enter API credentials into the encrypted vault.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="font-mono text-teal-300 font-bold text-sm">03. 48h Delivery</div>
            <p className="text-slate-400">Receive your verified code repository, documentation, and live demo access.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
