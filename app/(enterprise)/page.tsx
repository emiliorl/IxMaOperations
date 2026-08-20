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

export default function EnterpriseHomePage() {
  return (
    <div>
      {/* 1. High-Ticket Positioning Hero */}
      <HeroSection />

      {/* 2. Sourced Benchmark Metrics */}
      <ROIStatsGrid />

      {/* 3. Live Interactive Portfolio Sandboxes Showcase */}
      <section className="py-16 border-b border-zinc-800">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-xl mb-10 space-y-1.5">
            <Badge variant="default" className="mb-2">
              Interactive Lab
            </Badge>
            <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Production Sandboxes
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Test sub-15ms edge vision models, defect segmentation overlays, and streaming Playwright workers live.
            </p>
          </div>

          <Tabs defaultValue="alpr" className="w-full space-y-6">
            <TabsList className="p-1 h-auto flex flex-wrap gap-1">
              <TabsTrigger value="alpr" className="text-xs py-1.5 px-3">
                ALPR & Logistics OCR
              </TabsTrigger>
              <TabsTrigger value="qc" className="text-xs py-1.5 px-3">
                Defect QC Inspector
              </TabsTrigger>
              <TabsTrigger value="invoice" className="text-xs py-1.5 px-3">
                Document LayoutLM
              </TabsTrigger>
              <TabsTrigger value="scraper" className="text-xs py-1.5 px-3">
                Playwright Scraper
              </TabsTrigger>
            </TabsList>

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
        </div>
      </section>

      {/* 4. Industrial Architecture Pipeline */}
      <ArchitectureDiagram />
    </div>
  );
}
