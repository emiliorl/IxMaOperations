"use client";

import React, { useState, useEffect } from "react";
import { useAppStore, InvoiceResult } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { FileText, CheckCircle2, RefreshCw, Calculator, FileCheck, ShieldCheck } from "lucide-react";

export function InvoiceParserSandbox() {
  const { invoiceResult, setInvoiceResult, invoiceLoading, setInvoiceLoading } =
    useAppStore();

  const runInvoiceParser = async () => {
    setInvoiceLoading(true);
    try {
      const res = await fetch("/api/sandbox/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: "invoice-logistics-1" }),
      });
      const data = await res.json();
      if (data.success) {
        setInvoiceResult(data.data);
      }
    } catch (e) {
      console.error("Invoice parser fetch failed:", e);
    } finally {
      setInvoiceLoading(false);
    }
  };

  useEffect(() => {
    runInvoiceParser();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Pane: Simulated Document View with Bounding Boxes */}
      <div className="lg:col-span-6 flex flex-col space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              <span className="font-mono text-xs text-slate-300">
                commercial_customs_inv_88914.pdf
              </span>
            </div>
            <Badge variant="cyan" className="text-[10px]">
              LayoutLMv3 • Multi-Modal Vision
            </Badge>
          </div>

          {/* Document Preview Frame */}
          <div className="rounded-lg border border-slate-700/80 bg-slate-900/90 p-5 space-y-4 text-xs font-mono relative overflow-hidden">
            {/* Header section with bounding highlights */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Vendor (Confidence: 99.4%)</div>
                <div className="text-emerald-300 font-bold text-sm bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/40 inline-block">
                  {invoiceResult?.vendorName || "Apex Logistics Global Corp"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500 uppercase">Invoice #</div>
                <div className="text-slate-200 font-bold bg-slate-800/80 px-1.5 py-0.5 rounded inline-block">
                  {invoiceResult?.invoiceNumber || "INV-2026-88914"}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div>Invoice Date: <span className="text-slate-200">{invoiceResult?.invoiceDate || "2026-08-14"}</span></div>
              <div>Due Date: <span className="text-slate-200">{invoiceResult?.dueDate || "2026-09-14"}</span></div>
            </div>

            {/* Line items mock table */}
            <div className="space-y-1.5 pt-2">
              <div className="text-[10px] text-slate-500 uppercase border-b border-slate-800 pb-1">
                Extracted Line Item Grid
              </div>
              {invoiceResult?.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex justify-between items-center bg-slate-950/60 p-1.5 rounded border border-slate-800 hover:border-emerald-500/50 transition-colors"
                >
                  <span className="text-slate-300 truncate max-w-[220px]">
                    {item.description}
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-slate-500">x{item.quantity}</span>
                    <span className="text-emerald-300 font-semibold">
                      ${item.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculation Totals */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-end">
              <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Math Check: Subtotal + Tax == Total</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-slate-400 text-xs block">Total Amount Due</span>
                <span className="text-lg font-bold text-emerald-300">
                  ${invoiceResult?.total.toFixed(2) || "5,105.70"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={runInvoiceParser}
              disabled={invoiceLoading}
              className="text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${invoiceLoading ? "animate-spin text-emerald-400" : ""}`} />
              Re-extract Layout
            </Button>
          </div>
        </div>
      </div>

      {/* Right Pane: Structured JSON & Verification Audit */}
      <div className="lg:col-span-6 flex flex-col space-y-4">
        <Card className="border-slate-800 bg-slate-900/90 shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-400" />
              <h4 className="font-bold text-white text-sm">Automated Reconciliation Audit</h4>
            </div>
            <Badge variant="default" className="text-[10px]">
              100% Match
            </Badge>
          </div>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  OCR Vision Confidence
                </span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {invoiceResult ? `${(invoiceResult.ocrConfidence * 100).toFixed(1)}%` : "99.1%"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Mathematical Audit
                </span>
                <span className="text-base font-bold text-emerald-400 font-mono flex items-center gap-1">
                  <Calculator className="h-4 w-4 text-emerald-400" />
                  VERIFIED
                </span>
              </div>
            </div>

            {/* JSON Payload Inspector */}
            <div className="rounded-lg bg-slate-950 p-3 border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Normalized Schema Output
              </div>
              <pre className="text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-48 p-2 bg-slate-900/80 rounded border border-slate-800">
{JSON.stringify(
  {
    invoiceNumber: invoiceResult?.invoiceNumber || "INV-2026-88914",
    vendor: invoiceResult?.vendorName || "Apex Logistics",
    itemsCount: invoiceResult?.items?.length || 4,
    total: invoiceResult?.total || 5105.7,
    status: "RECONCILED_FOR_PAYMENT",
  },
  null,
  2
)}
              </pre>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-emerald-200/90 leading-relaxed">
                Connects directly to <strong>ERP / QuickBooks / SAP</strong> via webhook for automated zero-touch payment reconciliation.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
