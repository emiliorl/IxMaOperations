"use client";

import React from "react";
import { HeroSection } from "@/components/enterprise/HeroSection";
import { ROIStatsGrid } from "@/components/enterprise/ROIStatsGrid";
import { ArchitectureDiagram } from "@/components/enterprise/ArchitectureDiagram";
import { AlprOcrSandbox } from "@/components/sandboxes/AlprOcrSandbox";
import { DefectQcSandbox } from "@/components/sandboxes/DefectQcSandbox";
import { InvoiceParserSandbox } from "@/components/sandboxes/InvoiceParserSandbox";
import { ScraperTerminalSandbox } from "@/components/sandboxes/ScraperTerminalSandbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Camera, ShieldAlert, FileText, Terminal, Sparkles } from "lucide-react";

export default function EnterpriseHomePage() {
  return (
    <div className="space-y-12">
      {/* 1. High-Ticket Positioning Hero */}
      <HeroSection />

      {/* 2. Sourced Benchmark Metrics */}
      <ROIStatsGrid />

      {/* 3. Live Interactive Portfolio Sandboxes Showcase */}
      <section className="py-16 container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <Badge variant="cyan" className="text-[10px] font-mono mb-1">
            Live Engineering Laboratory
          </Badge>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Interactive Technical Sandboxes
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Test our sub-15ms edge inference, defect segmentation heatmaps, and document vision engines live.
          </p>
        </div>

        <Tabs defaultValue="alpr" className="w-full space-y-6">
          <div className="flex justify-center">
            <TabsList className="bg-slate-900 border-slate-800 p-1.5 h-auto flex-wrap">
              <TabsTrigger value="alpr" className="gap-2 text-xs py-2 px-4">
                <Camera className="h-4 w-4" />
                ALPR & Logistics OCR
              </TabsTrigger>
              <TabsTrigger value="qc" className="gap-2 text-xs py-2 px-4">
                <ShieldAlert className="h-4 w-4" />
                Defect QC Inspector
              </TabsTrigger>
              <TabsTrigger value="invoice" className="gap-2 text-xs py-2 px-4">
                <FileText className="h-4 w-4" />
                Document LayoutLM
              </TabsTrigger>
              <TabsTrigger value="scraper" className="gap-2 text-xs py-2 px-4">
                <Terminal className="h-4 w-4" />
                Live Playwright Scraper
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="alpr">
            <AlprOcrSandbox />
          </TabsContent>

          <TabsContent value="qc">
            <DefectQcSandbox />
          </TabsContent>

          <TabsContent value="invoice">
            <InvoiceParserSandbox />
          </TabsContent>

          <TabsContent value="scraper">
            <ScraperTerminalSandbox />
          </TabsContent>
        </Tabs>
      </section>

      {/* 4. Industrial Architecture Pipeline */}
      <ArchitectureDiagram />
    </div>
  );
}
