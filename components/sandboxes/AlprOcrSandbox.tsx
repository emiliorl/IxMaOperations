"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { RotateCw } from "lucide-react";

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
              <span className="text-[11px] text-zinc-300 ml-2">stream_cam_01_rtsp.h264</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">142 FPS • LIVE</span>
          </div>

          {/* Canvas Display */}
          <div className="flex-1 relative flex items-center justify-center p-6 bg-[#09090b]">
            <div className="w-full max-w-md h-52 rounded border border-zinc-800 bg-zinc-950/80 relative flex items-center justify-center">
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-50" />

              {/* 1px Crisp Vector Bounding Box */}
              <div className="relative border border-emerald-500 bg-emerald-950/20 px-5 py-2.5 rounded shadow-sm">
                <div className="absolute -top-3 -left-0.5 bg-emerald-500 text-zinc-950 text-[10px] font-bold font-mono px-1 py-0.2 rounded">
                  OCR [{(alprResult ? alprResult.confidence * 100 : 98.4).toFixed(1)}%]
                </div>
                <div className="text-2xl font-bold font-mono tracking-widest text-zinc-100">
                  {alprResult ? alprResult.plateNumber : "6XYZ942"}
                </div>
              </div>
            </div>

            {/* Telemetry Tag */}
            <div className="absolute bottom-3 left-3">
              <Badge variant="default" className="text-[10px]">
                NVIDIA Jetson AGX Orin • {alprResult ? `${alprResult.latencyMs}ms` : "14.2ms"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Sample Selection */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono">Sample:</span>
          <Button
            size="sm"
            variant={activePreset === "sample-truck-1" ? "default" : "secondary"}
            onClick={() => {
              setActivePreset("sample-truck-1");
              setAlprSample("sample-truck-1");
            }}
          >
            Freight Truck
          </Button>
          <Button
            size="sm"
            variant={activePreset === "sample-container-2" ? "default" : "secondary"}
            onClick={() => {
              setActivePreset("sample-container-2");
              setAlprSample("sample-container-2");
            }}
          >
            Container Code (ISO 6346)
          </Button>
          <Button
            size="sm"
            variant={activePreset === "sample-eu-car-3" ? "default" : "secondary"}
            onClick={() => {
              setActivePreset("sample-eu-car-3");
              setAlprSample("sample-eu-car-3");
            }}
          >
            EU Standard
          </Button>
        </div>
      </div>

      {/* Structured Telemetry Panel */}
      <div className="lg:col-span-4 space-y-3">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              Inference Telemetry
            </h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => runInference(activePreset)}
              disabled={alprLoading}
              className="h-7 w-7 p-0 text-zinc-400"
            >
              <RotateCw className={`h-3.5 w-3.5 ${alprLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Extracted String</span>
              <span className="text-sm font-semibold text-zinc-100 mt-0.5 block">
                {alprResult?.plateNumber || "6XYZ942"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Confidence</span>
                <span className="text-xs font-medium text-zinc-200 mt-0.5 block">
                  {alprResult ? `${(alprResult.confidence * 100).toFixed(1)}%` : "98.4%"}
                </span>
              </div>

              <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-500 text-[10px] block">Latency</span>
                <span className="text-xs font-medium text-zinc-200 mt-0.5 block">
                  {alprResult ? `${alprResult.latencyMs}ms` : "14.2ms"}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Standard</span>
              <span className="text-xs text-zinc-300 mt-0.5 block">
                {alprResult?.country || "USA (California / DOT)"}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
