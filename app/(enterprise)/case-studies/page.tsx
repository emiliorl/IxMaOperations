"use client";

import React from "react";
import { ENTERPRISE_CASE_STUDIES } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendingUp, ArrowRight, ShieldCheck, Cpu } from "lucide-react";

export default function CaseStudiesPage() {
  const { setFeasibilityModalOpen } = useAppStore();

  return (
    <div className="py-16 container mx-auto px-4 max-w-6xl space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="outline" className="text-xs font-mono">
          Industrial Case Studies & Field Results
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Field-Tested AI Engineering for High-Consequence Operations
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          Explore how we deployed edge TensorRT models, sub-millimeter AOI defect detectors, and multi-modal customs layout parsers for Tier-1 industrial operators.
        </p>
      </div>

      {/* Case Studies List */}
      <div className="space-y-10">
        {ENTERPRISE_CASE_STUDIES.map((study) => (
          <Card key={study.id} className="border-slate-800 bg-slate-900/80 overflow-hidden shadow-xl">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <Badge variant="default" className="text-[10px] mb-2 font-mono">
                    {study.industry}
                  </Badge>
                  <h2 className="text-2xl font-bold text-white">{study.title}</h2>
                  <div className="text-xs text-slate-400 font-mono mt-1">Client: {study.client}</div>
                </div>

                <Button
                  onClick={() => setFeasibilityModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 self-start md:self-auto"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Discuss Similar Architecture
                </Button>
              </div>

              {/* Challenge & Solution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed">
                <div className="space-y-2 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] font-mono text-red-400 uppercase font-bold">The Challenge</div>
                  <p>{study.challenge}</p>
                </div>
                <div className="space-y-2 p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-[11px] font-mono text-emerald-400 uppercase font-bold">The Engineering Solution</div>
                  <p>{study.solution}</p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div>
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-3">
                  Verified Operational Impact
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {study.metrics.map((m, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-mono">{m.label}</div>
                      <div className="text-lg font-bold text-emerald-400 font-mono mt-1">{m.after}</div>
                      <div className="text-[10px] text-slate-500 line-through">Before: {m.before}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack Tags */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                {study.architecture.map((tech, idx) => (
                  <Badge key={idx} variant="secondary" className="font-mono text-[10px] border-slate-700">
                    <Cpu className="h-3 w-3 mr-1 text-cyan-400" />
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
