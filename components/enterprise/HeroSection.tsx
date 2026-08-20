"use client";

import React from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Cpu, Terminal, ArrowRight, ShieldCheck, PlayCircle, Layers, CheckCircle2 } from "lucide-react";

export function HeroSection() {
  const { setFeasibilityModalOpen } = useAppStore();

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Background Gradients & Grid */}
      <div className="absolute inset-0 tech-grid-bg opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-xs font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Industrial AI & Edge Vision Engineering • Enterprise Tier
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Deterministic AI Pipelines for{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-200 bg-clip-text text-transparent">
              High-Consequence Operations.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            We architect sub-15ms TensorRT vision models, OPC UA/Modbus PLC edge reject systems, and multi-modal document reconciliation engines that eliminate operational failure points.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              size="lg"
              variant="default"
              onClick={() => setFeasibilityModalOpen(true)}
              className="w-full sm:w-auto gap-2"
            >
              Book Technical Feasibility Call
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Link href="/audit" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                Schedule 2-Week Discovery Audit
              </Button>
            </Link>
          </div>

          {/* Trust Guarantees */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>NVIDIA TensorRT 8.6+</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              <span>OPC UA / Siemens PLC Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Zero-Hallucination Verified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
