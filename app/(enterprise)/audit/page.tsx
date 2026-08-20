"use client";

import React from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, ShieldCheck, Clock, FileCheck, ArrowRight, Layers, Cpu } from "lucide-react";

export default function DiscoveryAuditPage() {
  const { setFeasibilityModalOpen } = useAppStore();

  const auditMilestones = [
    {
      week: "Week 1: Days 1–5",
      title: "Edge Hardware Diagnostic & Protocol Inspection",
      desc: "We analyze your IP camera streams (GigE, RTSP, Basler), lighting conditions, Modbus/OPC UA PLC triggers, and compute constraints (NVIDIA Jetson vs. Industrial PC).",
    },
    {
      week: "Week 1: Days 6–7",
      title: "Sample Dataset Profiling & Edge Feasibility Run",
      desc: "Quantize sample test images into FP16 TensorRT engines to measure latency, false-positive baselines, and thermal envelope under line speeds.",
    },
    {
      week: "Week 2: Days 8–12",
      title: "Architecture Blueprint & Prototype Demonstration",
      desc: "Deliver a working proof-of-concept pipeline with an interactive review dashboard and exact hardware bill-of-materials (BOM).",
    },
    {
      week: "Week 2: Days 13–14",
      title: "Executive Synthesis & Fixed-Price Rollout Proposal",
      desc: "Present full ROI analysis, payback period calculation, and fixed-fee implementation timeline with zero ambiguous scope creep.",
    },
  ];

  return (
    <div className="py-16 container mx-auto px-4 max-w-5xl space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="cyan" className="text-xs font-mono">
          Fixed-Price Engagement • $5,000 Total
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          2-Week Paid Discovery & Technical Feasibility Audit
        </h1>
        <p className="text-base text-slate-400 leading-relaxed">
          De-risk your industrial AI deployment before committing to high-ticket factory integration. We validate latency, accuracy, PLC connectivity, and ROI on your actual hardware.
        </p>
        <div className="pt-4">
          <Button
            size="lg"
            variant="default"
            onClick={() => setFeasibilityModalOpen(true)}
            className="gap-2"
          >
            Apply for Discovery Audit Slot
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Audit Timeline Grid */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Audit Execution Timeline</h2>
          <p className="text-xs text-slate-400 mt-1">Four structured phases delivered in 14 calendar days.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {auditMilestones.map((m, idx) => (
            <Card key={idx} className="border-slate-800 bg-slate-900/80 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="default" className="text-[10px]">
                  {m.week}
                </Badge>
                <Clock className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white">{m.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Guaranteed Deliverables */}
      <Card className="border-emerald-500/30 bg-emerald-950/20 p-8 shadow-xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <FileCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Guaranteed Audit Deliverables</h3>
              <p className="text-xs text-emerald-300/80">Every audit outputs production-ready engineering documentation.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Full Hardware BOM (Camera models, Jetson/RTX specs, lenses, ring lights).</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>TensorRT Benchmark Report on your actual defect or OCR images.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>OPC UA / Modbus PLC signal integration diagram & register mapping.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>100% Audit fee credit toward full production deployment contract.</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
