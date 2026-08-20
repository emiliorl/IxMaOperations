"use client";

import React, { useState, useEffect } from "react";
import { useAppStore, AlprResult } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Camera, RefreshCw, Cpu, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export function AlprOcrSandbox() {
  const { alprSample, setAlprSample, alprResult, setAlprResult, alprLoading, setAlprLoading } =
    useAppStore();

  const [activePreset, setActivePreset] = useState("sample-truck-1");

  const runInference = async (sampleKey: string) => {
    setAlprLoading(true);
    try {
      const res = await fetch("/api/sandbox/alpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: sampleKey }),
      });
      const data = await res.json();
      if (data.success) {
        setAlprResult(data.data);
      }
    } catch (e) {
      console.error("ALPR fetch failed:", e);
    } finally {
      setAlprLoading(false);
    }
  };

  useEffect(() => {
    runInference(activePreset);
  }, [activePreset]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Visual Canvas Area */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        <div className="relative rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl aspect-[16/10] flex items-center justify-center">
          {/* Simulated High-Res Camera Frame */}
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-8 text-center">
            {/* Visual Vehicle Graphic Overlay */}
            <div className="w-full max-w-md h-56 rounded-lg border border-slate-700/60 bg-slate-900/90 relative flex flex-col items-center justify-center overflow-hidden shadow-inner">
              {/* Grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

              <div className="text-slate-600 mb-2 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                <Camera className="h-4 w-4 text-emerald-400" />
                Live Basler GigE 4K Stream • RTSP://192.168.1.120/gate-01
              </div>

              {/* License Plate Graphic with Dynamic Bounding Box */}
              <div className="relative border-2 border-dashed border-emerald-400 bg-emerald-950/40 px-6 py-3 rounded shadow-lg shadow-emerald-500/20 transition-all duration-300 transform scale-105">
                <div className="absolute -top-3 -left-3 bg-emerald-500 text-slate-950 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded">
                  CRNN OCR: {alprResult ? (alprResult.confidence * 100).toFixed(1) : "98.4"}%
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-emerald-300 drop-shadow-md">
                  {alprResult ? alprResult.plateNumber : "6XYZ942"}
                </div>
              </div>

              {/* Scanline beam effect */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scanline opacity-60" />
            </div>
          </div>

          {/* Latency & Hardware Badge Overlay */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <Badge variant="default" className="gap-1.5 py-1">
              <Zap className="h-3.5 w-3.5" />
              TensorRT 8.6 • {alprResult ? `${alprResult.latencyMs}ms` : "14.2ms"}
            </Badge>
            <Badge variant="cyan" className="gap-1.5 py-1">
              <Cpu className="h-3.5 w-3.5" />
              NVIDIA Jetson AGX Orin
            </Badge>
          </div>

          <div className="absolute bottom-4 right-4">
            <Badge variant="secondary" className="font-mono text-[11px] bg-slate-900/90 border-slate-700">
              FPS: 142.0 • ISO 6346 / LPR Engine
            </Badge>
          </div>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Test Sample:</span>
          <Button
            size="sm"
            variant={activePreset === "sample-truck-1" ? "default" : "secondary"}
            onClick={() => {
              setActivePreset("sample-truck-1");
              setAlprSample("sample-truck-1");
            }}
          >
            Commercial Freight Truck
          </Button>
          <Button
            size="sm"
            variant={activePreset === "sample-container-2" ? "default" : "secondary"}
            onClick={() => {
              setActivePreset("sample-container-2");
              setAlprSample("sample-container-2");
            }}
          >
            Intermodal Container Code
          </Button>
          <Button
            size="sm"
            variant={activePreset === "sample-eu-car-3" ? "default" : "secondary"}
            onClick={() => {
              setActivePreset("sample-eu-car-3");
              setAlprSample("sample-eu-car-3");
            }}
          >
            EU Standard Plate
          </Button>
        </div>
      </div>

      {/* Structured Inference Output Card */}
      <div className="lg:col-span-4 flex flex-col space-y-4">
        <Card className="border-slate-800 bg-slate-900/90 shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h4 className="font-bold text-white text-sm">Extraction Telemetry</h4>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => runInference(activePreset)}
              disabled={alprLoading}
              className="h-8 px-2 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${alprLoading ? "animate-spin text-emerald-400" : ""}`} />
            </Button>
          </div>

          <CardContent className="p-5 space-y-4">
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Extracted Plate / Code
              </span>
              <span className="text-xl font-bold font-mono text-emerald-300">
                {alprResult?.plateNumber || "6XYZ942"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Confidence
                </span>
                <span className="text-sm font-bold text-slate-200">
                  {alprResult ? `${(alprResult.confidence * 100).toFixed(1)}%` : "98.4%"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Inference Latency
                </span>
                <span className="text-sm font-bold text-cyan-400 font-mono">
                  {alprResult ? `${alprResult.latencyMs} ms` : "14.2 ms"}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Region / Standard
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {alprResult?.country || "USA (California / DOT Standard)"}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-[11px] text-emerald-200/90 leading-relaxed">
                Integrated with <strong>OPC UA gate relays</strong> and <strong>Kafka message bus</strong> for automatic barrier dispatch.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
