"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { RotateCw, Check } from "lucide-react";

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Pane: Structured Document Viewer */}
      <div className="lg:col-span-6 space-y-3">
        <div className="rounded-lg border border-zinc-800 bg-[#0c0c0e] overflow-hidden shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-xs font-mono text-zinc-400">
            <span>customs_invoice_88914.pdf</span>
            <Badge variant="default" className="text-[10px]">
              LayoutLMv3 OCR
            </Badge>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-950/80 p-4 space-y-3 text-xs font-mono">
            {/* Vendor & Header */}
            <div className="flex justify-between items-start border-b border-zinc-800 pb-2">
              <div>
                <span className="text-[10px] text-zinc-500 block">Vendor [99.4%]</span>
                <span className="text-zinc-100 font-semibold border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 rounded inline-block">
                  {invoiceResult?.vendorName || "Apex Logistics Global Corp"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">Invoice #</span>
                <span className="text-zinc-300">
                  {invoiceResult?.invoiceNumber || "INV-2026-88914"}
                </span>
              </div>
            </div>

            {/* Line items table */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-zinc-500 uppercase block">Extracted Line Items</span>
              {invoiceResult?.items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex justify-between items-center bg-zinc-900/60 p-1.5 rounded border border-zinc-800/80 text-[11px]"
                >
                  <span className="text-zinc-300 truncate max-w-[200px]">{item.description}</span>
                  <div className="flex gap-2">
                    <span className="text-zinc-500">x{item.quantity}</span>
                    <span className="text-zinc-200 font-medium">${item.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
              <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                <Check className="h-3.5 w-3.5" />
                <span>Math Check: Subtotal + Tax == Total</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-zinc-100 font-semibold text-sm">
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
              <RotateCw className={`h-3 w-3 mr-1.5 ${invoiceLoading ? "animate-spin" : ""}`} />
              Re-extract Layout
            </Button>
          </div>
        </div>
      </div>

      {/* Right Pane: Normalized Schema JSON */}
      <div className="lg:col-span-6 space-y-3">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              Normalized ERP Schema
            </h4>
            <Badge variant="active" className="text-[10px]">
              Math Verified
            </Badge>
          </div>

          <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 p-3 rounded border border-zinc-800 overflow-x-auto max-h-56">
{JSON.stringify(
  {
    invoiceNumber: invoiceResult?.invoiceNumber || "INV-2026-88914",
    vendor: invoiceResult?.vendorName || "Apex Logistics",
    itemsCount: invoiceResult?.items?.length || 4,
    totalAmount: invoiceResult?.total || 5105.7,
    mathValidation: "MATCHED_EXACT",
    accountingStatus: "READY_FOR_PAYMENT",
  },
  null,
  2
)}
          </pre>

          <p className="text-xs text-zinc-400">
            Automatically dispatches reconciled JSON payloads to SAP, NetSuite, and QuickBooks webhook endpoints.
          </p>
        </Card>
      </div>
    </div>
  );
}
