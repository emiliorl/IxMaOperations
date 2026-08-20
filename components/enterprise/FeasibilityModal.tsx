"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Send, ShieldCheck, Sparkles } from "lucide-react";

export function FeasibilityModal() {
  const { feasibilityModalOpen, setFeasibilityModalOpen } = useAppStore();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    projectType: "Edge Computer Vision & TensorRT",
    budgetRange: "$15,000 - $35,000",
    details: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate lead ingestion
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFeasibilityModalOpen(false);
  };

  return (
    <Dialog open={feasibilityModalOpen} onOpenChange={setFeasibilityModalOpen}>
      <DialogContent className="max-w-xl border-slate-800 bg-slate-950/95 text-slate-100 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="cyan" className="text-[10px]">
              Enterprise Tier
            </Badge>
            <span className="text-xs font-mono text-slate-400">Strict Engineering NDA Protected</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            Schedule Technical Feasibility Call
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Review edge hardware specs, TensorRT benchmarks, and timeline with our Lead AI Systems Architect.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Diagnostic Request Received</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Our engineering team has received your architecture parameters. You will receive a technical briefing document and calendar invite within 4 business hours.
            </p>
            <Button onClick={handleReset} variant="default" className="mt-4">
              Return to Platform
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-400">Full Name *</label>
                <Input
                  required
                  placeholder="Dr. Jordan Vance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-400">Work Email *</label>
                <Input
                  required
                  type="email"
                  placeholder="jordan.vance@industrial.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-400">Company / Facility *</label>
                <Input
                  required
                  placeholder="Omni Manufacturing Corp"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-400">Budget Range</label>
                <select
                  value={formData.budgetRange}
                  onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <option>$5,000 - $15,000 (2-Week Discovery Audit)</option>
                  <option>$15,000 - $35,000 (Edge Vision / RAG MVP)</option>
                  <option>$35,000 - $100,000+ (Full Factory Line Rollout)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-slate-400">Technical Scope / Hardware Targets</label>
              <Textarea
                rows={3}
                placeholder="e.g. 4x Basler GigE cameras at 120 FPS running defect detection on NVIDIA Jetson Orin with Siemens PLC Modbus reject gate."
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Zero Sales Fluff • Direct Engineer Contact</span>
              </div>
              <Button type="submit" disabled={loading} variant="default" className="gap-2">
                {loading ? "Transmitting..." : (
                  <>
                    <Send className="h-4 w-4" />
                    Book Technical Audit
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
