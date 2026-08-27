"use client";

import React from "react";
import { HeroSection } from "@/components/enterprise/HeroSection";
import { ROIStatsGrid } from "@/components/enterprise/ROIStatsGrid";
import { BeforeAfterSimulator } from "@/components/sandboxes/BeforeAfterSimulator";
import { ServicesMatrix } from "@/components/enterprise/ServicesMatrix";
import { ArchitectureDiagram } from "@/components/enterprise/ArchitectureDiagram";
import { AlprOcrSandbox } from "@/components/sandboxes/AlprOcrSandbox";
import { DefectQcSandbox } from "@/components/sandboxes/DefectQcSandbox";
import { InvoiceParserSandbox } from "@/components/sandboxes/InvoiceParserSandbox";
import { ScraperTerminalSandbox } from "@/components/sandboxes/ScraperTerminalSandbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { ArrowRight, ShieldCheck, Cpu, Terminal } from "lucide-react";

export default function EnterpriseHomePage() {
  const { setFeasibilityModalOpen } = useAppStore();

  return (
    <div className="space-y-0">
      {/* 1. Value Proposition Hero */}
      <HeroSection />

      {/* 2. Documented Operational Benchmarks */}
      <ROIStatsGrid />

      {/* 3. Interactive Before vs. After Scenario Simulator */}
      <BeforeAfterSimulator />

      {/* 4. Core Offerings & Deliverables Matrix */}
      <ServicesMatrix />

      {/* 5. Deep-Dive Interactive Production Sandboxes */}
      <section id="sandboxes" className="py-16 md:py-24 border-b border-zinc-800 bg-zinc-950">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-xl mb-10 space-y-1.5">
            <Badge variant="default" className="mb-2 text-[11px] font-mono">
              Engineering Lab
            </Badge>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white tracking-tight">
              Live Interactive Production Sandboxes
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Test sub-15ms edge vision models, document extraction parsers, and streaming Playwright workers in real-time.
            </p>
          </div>

          <Tabs defaultValue="invoice" className="w-full space-y-6">
            <TabsList className="p-1 h-auto flex flex-wrap gap-1 bg-zinc-900 border border-zinc-800">
              <TabsTrigger value="invoice" className="text-xs py-1.5 px-3">
                Document Vision & Invoices
              </TabsTrigger>
              <TabsTrigger value="scraper" className="text-xs py-1.5 px-3">
                Playwright Web Scraper
              </TabsTrigger>
              <TabsTrigger value="alpr" className="text-xs py-1.5 px-3">
                ALPR & Logistics OCR
              </TabsTrigger>
              <TabsTrigger value="qc" className="text-xs py-1.5 px-3">
                Defect QC Inspector
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoice">
              <InvoiceParserSandbox />
            </TabsContent>

            <TabsContent value="scraper">
              <ScraperTerminalSandbox />
            </TabsContent>

            <TabsContent value="alpr">
              <AlprOcrSandbox />
            </TabsContent>

            <TabsContent value="qc">
              <DefectQcSandbox />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* 6. Deterministic Architecture Pipeline */}
      <ArchitectureDiagram />

      {/* 7. Bottom Conversion CTA Section */}
      <section className="py-16 md:py-20 border-b border-zinc-800 bg-zinc-950/80">
        <div className="container mx-auto px-6 max-w-4xl text-center space-y-6">
          <Badge variant="default" className="text-[11px] font-mono">
            Zero-Risk Feasibility Assessment
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight">
            Ready to eliminate manual operations in your business?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Schedule a 20-minute feasibility conversation with our lead engineer. We'll analyze your workflow,
            recommend the optimal architecture, and give you an exact timeline and fixed budget.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              variant="default"
              onClick={() => setFeasibilityModalOpen(true)}
              className="w-full sm:w-auto gap-2"
            >
              Book Technical Feasibility Call
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-300" />
              <span>Strict Mutual NDA Protected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-zinc-300" />
              <span>Direct Conversation with Lead Engineer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-zinc-300" />
              <span>Fixed-Price Scope • No Hidden Retainers</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

