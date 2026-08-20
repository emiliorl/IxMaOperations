"use client";

import React from "react";
import { AlprOcrSandbox } from "@/components/sandboxes/AlprOcrSandbox";
import { DefectQcSandbox } from "@/components/sandboxes/DefectQcSandbox";
import { InvoiceParserSandbox } from "@/components/sandboxes/InvoiceParserSandbox";
import { ScraperTerminalSandbox } from "@/components/sandboxes/ScraperTerminalSandbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Camera, ShieldAlert, FileText, Terminal } from "lucide-react";

export default function DedicatedSandboxPage() {
  return (
    <div className="py-12 container mx-auto px-4 max-w-6xl space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="cyan" className="text-[10px] font-mono">
          Full Interactive Laboratory
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          AI Systems Laboratory
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Execute real-time inference across our edge vision models, defect segmentation heatmaps, and streaming Playwright scrapers.
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
    </div>
  );
}
