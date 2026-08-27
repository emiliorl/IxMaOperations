"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Send, ShieldCheck } from "lucide-react";

export function FeasibilityModal() {
  const { feasibilityModalOpen, setFeasibilityModalOpen } = useAppStore();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    projectType: "Intelligent Document & Data Extraction",
    budgetRange: "$10,000 - $25,000",
    details: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate lead ingestion
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setFeasibilityModalOpen(false);
  };

  return (
    <Dialog open={feasibilityModalOpen} onOpenChange={setFeasibilityModalOpen}>
      <DialogContent className="max-w-xl border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="default" className="text-[10px] font-mono">
              Custom Engineering Scope
            </Badge>
            <span className="text-xs font-mono text-zinc-500">Strict Engineering NDA Protected</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
            Schedule Technical Feasibility Call
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Review your workflow bottlenecks, architecture options, and timeline directly with our Lead Systems Engineer.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Technical Scoping Request Received</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Our engineering team has received your project parameters. You will receive a technical briefing document and calendar invite within 4 business hours.
            </p>
            <Button onClick={handleReset} variant="default" className="mt-4">
              Return to Platform
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Full Name *</label>
                <Input
                  required
                  placeholder="Alex Morgan"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Work Email *</label>
                <Input
                  required
                  type="email"
                  placeholder="alex.m@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Company / Organization *</label>
                <Input
                  required
                  placeholder="Apex Operations LLC"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-zinc-400">Primary Project Need</label>
                <select
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                >
                  <option>Intelligent Document & Data Extraction</option>
                  <option>Web Scraping & Market Intelligence</option>
                  <option>Custom AI Business Automation & Sync</option>
                  <option>AI Knowledge Agents & Support Systems</option>
                  <option>Computer Vision & Quality Inspection</option>
                  <option>Custom Full-Stack Apps & Internal Portals</option>
                  <option>Other Custom Architecture</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-400">Estimated Project Budget</label>
              <select
                value={formData.budgetRange}
                onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
              >
                <option>$5,000 - $10,000 (Discovery Audit / Fast MVP)</option>
                <option>$10,000 - $25,000 (Production Automation / Scraper / RAG)</option>
                <option>$25,000 - $50,000+ (Full Enterprise Pipeline & App)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-zinc-400">Workflow Bottleneck or Technical Goal</label>
              <Textarea
                rows={3}
                placeholder="e.g. We spend 15 hours/week processing 300 vendor PDFs into NetSuite. We need an automated ingestion pipeline with ERP sync and validation."
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Zero Sales Pressure • Direct Engineer Conversation</span>
              </div>
              <Button type="submit" disabled={loading} variant="default" className="w-full sm:w-auto gap-2">
                {loading ? "Transmitting..." : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Book Feasibility Call
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

