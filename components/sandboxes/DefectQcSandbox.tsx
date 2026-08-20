"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { RotateCw } from "lucide-react";

export function DefectQcSandbox() {
  const { qcSample, setQcSample, qcResult, setQcResult, qcLoading, setQcLoading } =
    useAppStore();

  const [activeSample, setActiveSample] = useState("pcb-board-1");
  const [showHeatmap, setShowHeatmap] = useState(true);

  const runQcInference = async (sampleKey: string) => {
    setQcLoading(true);
    try {
      const res = await fetch("/api/sandbox/qc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: sampleKey }),
      });
      const data = await res.json();
      if (data.success) {
        setQcResult(data.data);
      }
    } catch (e) {
      console.error("Defect QC fetch failed:", e);
    } finally {
      setQcLoading(false);
    }
  };

  useEffect(() => {
    runQcInference(activeSample);
  }, [activeSample]);

  const isFailed = qcResult?.status === "FAIL";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Visualizer Frame */}
      <div className="lg:col-span-8 space-y-3">
        <div className="rounded-lg border border-zinc-800 bg-[#0c0c0e] overflow-hidden shadow-sm aspect-[16/10] flex flex-col">
          {/* Header Bar */}
          <div className="bg-zinc-900/90 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[11px] text-zinc-300 ml-2">patchcore_aoi_optical_inspector.py</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isFailed ? "destructive" : "active"} className="text-[10px]">
                {isFailed ? "REJECT (DEFECT)" : "PASS (NOMINAL)"}
              </Badge>
            </div>
          </div>

          {/* Canvas Display */}
          <div className="flex-1 relative flex items-center justify-center p-6 bg-[#09090b]">
            <div className="w-full max-w-md h-52 rounded border border-zinc-800 bg-zinc-950/80 relative flex items-center justify-center">
              {/* Circuit Board Schematic Grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:1.25rem_1.25rem] opacity-60" />

              <div className="text-center z-10 font-mono text-xs text-zinc-400">
                <div>SMT Board Quad-04</div>
                <div className="text-[10px] text-zinc-600">PatchCore 0.1mm Memory Bank</div>
              </div>

              {/* 1px Solid Anomaly Bounding Box */}
              {isFailed && showHeatmap && (
                <div className="absolute top-[32%] left-[34%] w-24 h-24 border border-red-500 bg-red-950/20 rounded shadow-sm">
                  <div className="absolute -top-2.5 -left-0.5 bg-red-500 text-zinc-950 text-[9px] font-bold font-mono px-1 py-0.2 rounded">
                    Solder Bridge [99.2%]
                  </div>
                </div>
              )}
            </div>

            {/* Telemetry Tag */}
            <div className="absolute bottom-3 left-3">
              <Badge variant="default" className="text-[10px]">
                TensorRT: {qcResult?.latencyMs || "12.4"}ms • Modbus TCP Actuator Connected
              </Badge>
            </div>
          </div>
        </div>

        {/* Sample Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono">Sample:</span>
          <Button
            size="sm"
            variant={activeSample === "pcb-board-1" ? "default" : "secondary"}
            onClick={() => {
              setActiveSample("pcb-board-1");
              setQcSample("pcb-board-1");
            }}
          >
            SMT Solder Bridging
          </Button>
          <Button
            size="sm"
            variant={activeSample === "metal-stamping-2" ? "default" : "secondary"}
            onClick={() => {
              setActiveSample("metal-stamping-2");
              setQcSample("metal-stamping-2");
            }}
          >
            Surface Scratch
          </Button>
          <Button
            size="sm"
            variant={activeSample === "pcb-board-clean" ? "default" : "secondary"}
            onClick={() => {
              setActiveSample("pcb-board-clean");
              setQcSample("pcb-board-clean");
            }}
          >
            Clean Golden Sample
          </Button>
        </div>
      </div>

      {/* Telemetry Card */}
      <div className="lg:col-span-4 space-y-3">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              Inspection Telemetry
            </h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => runQcInference(activeSample)}
              disabled={qcLoading}
              className="h-7 w-7 p-0 text-zinc-400"
            >
              <RotateCw className={`h-3.5 w-3.5 ${qcLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Verdict</span>
              <span className={`text-sm font-semibold mt-0.5 block ${isFailed ? "text-red-400" : "text-emerald-400"}`}>
                {qcResult?.status || "PASS"} ({qcResult?.defectType || "Nominal"})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Confidence</span>
                <span className="text-xs font-medium text-zinc-200 mt-0.5 block">
                  {qcResult ? `${(qcResult.confidence * 100).toFixed(1)}%` : "99.2%"}
                </span>
              </div>

              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Inference</span>
                <span className="text-xs font-medium text-zinc-200 mt-0.5 block">
                  {qcResult?.latencyMs || "12.4"}ms
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">PLC Integration</span>
              <span className="text-xs text-zinc-300 mt-0.5 block">
                Siemens S7-1500 / Modbus Port 502
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
