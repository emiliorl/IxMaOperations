"use client";

import React, { useState, useEffect } from "react";
import { useAppStore, DefectResult } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { ShieldAlert, CheckCircle, RefreshCw, Cpu, Activity, AlertTriangle, Layers } from "lucide-react";

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Visual Canvas Inspector Area */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl aspect-[16/10] flex items-center justify-center p-6">
          {/* Dual Frame Visual Inspection Layer */}
          <div className="w-full h-full rounded-lg border border-slate-800 bg-slate-900/90 relative flex items-center justify-center overflow-hidden">
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

            {/* Simulated Microscopic PCB / Metal Inspection Frame */}
            <div className="relative w-72 sm:w-96 h-48 sm:h-64 rounded-md border border-slate-700 bg-slate-950 flex items-center justify-center shadow-inner overflow-hidden">
              {/* Circuit board traces schematic background */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,#06b6d4_1px,transparent_1px),linear-gradient(-45deg,#06b6d4_1px,transparent_1px)] bg-[size:12px_12px]" />

              <div className="text-center z-10">
                <Layers className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                <div className="text-xs font-mono text-slate-400">
                  SMT Optical Inspection #409-Q
                </div>
                <div className="text-[11px] font-mono text-slate-500">
                  0.1mm Resolution • PatchCore Memory Bank
                </div>
              </div>

              {/* Anomaly Heatmap Overlay (if defective & heatmap enabled) */}
              {isFailed && showHeatmap && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Heatmap blob 1 */}
                  <div className="absolute top-1/3 left-1/3 w-28 h-28 rounded-full bg-red-500/40 blur-xl animate-pulse" />
                  <div className="absolute top-[36%] left-[36%] w-16 h-16 rounded-full border-2 border-red-500 bg-red-600/30 flex items-center justify-center shadow-lg shadow-red-500/50">
                    <span className="text-[9px] font-mono font-bold text-red-200 uppercase bg-red-950/90 px-1 py-0.5 rounded border border-red-500">
                      Solder Bridge
                    </span>
                  </div>
                </div>
              )}

              {/* Laser Measurement Reticle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border border-cyan-500/20 rounded-full" />
                <div className="w-12 h-12 border border-dashed border-cyan-500/40 rounded-full" />
              </div>
            </div>
          </div>

          {/* Status & Latency Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {isFailed ? (
              <Badge variant="destructive" className="gap-1.5 py-1 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                QC REJECT: {qcResult?.defectType || "High Anomaly Score"}
              </Badge>
            ) : (
              <Badge variant="default" className="gap-1.5 py-1 text-xs">
                <CheckCircle className="h-3.5 w-3.5" />
                QC PASS: Nominal Tolerance
              </Badge>
            )}
            <Badge variant="cyan" className="gap-1.5 py-1">
              <Cpu className="h-3.5 w-3.5" />
              TensorRT: {qcResult?.latencyMs || "12.4"}ms
            </Badge>
          </div>

          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="text-xs h-7 bg-slate-900/90 border-slate-700 text-slate-300"
            >
              {showHeatmap ? "Hide Heatmap" : "Show Heatmap"}
            </Button>
          </div>
        </div>

        {/* Sample Selection */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Test Sample:</span>
          <Button
            size="sm"
            variant={activeSample === "pcb-board-1" ? "default" : "secondary"}
            onClick={() => {
              setActiveSample("pcb-board-1");
              setQcSample("pcb-board-1");
            }}
          >
            SMT Solder Bridging (Defective)
          </Button>
          <Button
            size="sm"
            variant={activeSample === "metal-stamping-2" ? "default" : "secondary"}
            onClick={() => {
              setActiveSample("metal-stamping-2");
              setQcSample("metal-stamping-2");
            }}
          >
            Surface Scratch &gt;= 0.25mm
          </Button>
          <Button
            size="sm"
            variant={activeSample === "pcb-board-clean" ? "default" : "secondary"}
            onClick={() => {
              setActiveSample("pcb-board-clean");
              setQcSample("pcb-board-clean");
            }}
          >
            Clean Golden Sample (Nominal)
          </Button>
        </div>
      </div>

      {/* Telemetry Output Card */}
      <div className="lg:col-span-4 flex flex-col space-y-4">
        <Card className="border-slate-800 bg-slate-900/90 shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <h4 className="font-bold text-white text-sm">Industrial Telemetry</h4>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => runQcInference(activeSample)}
              disabled={qcLoading}
              className="h-8 px-2 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${qcLoading ? "animate-spin text-cyan-400" : ""}`} />
            </Button>
          </div>

          <CardContent className="p-5 space-y-4">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Inspection Verdict
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xl font-black font-mono ${
                    isFailed ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {qcResult?.status || "PASS"}
                </span>
                <Badge
                  variant={isFailed ? "destructive" : "default"}
                  className="text-[10px]"
                >
                  {isFailed ? "REJECTED BY ACTUATOR" : "APPROVED FOR PACKAGING"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Confidence
                </span>
                <span className="text-sm font-bold text-slate-200">
                  {qcResult ? `${(qcResult.confidence * 100).toFixed(1)}%` : "99.2%"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Inference Latency
                </span>
                <span className="text-sm font-bold text-cyan-400 font-mono">
                  {qcResult?.latencyMs || "12.4"} ms
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Detected Anomaly Classification
              </span>
              <span className="text-xs text-slate-200 font-medium block">
                {qcResult?.defectType || "Nominal Geometry"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 flex items-start gap-2.5">
              <Cpu className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-cyan-200/90 leading-relaxed">
                Direct integration with <strong>Modbus TCP</strong> & <strong>Allen-Bradley / Siemens PLC</strong> pneumatic reject gates.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
