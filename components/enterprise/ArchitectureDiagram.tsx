import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function ArchitectureDiagram() {
  const pipelineSteps = [
    {
      step: "01",
      title: "Edge Ingestion",
      tech: "GigE Vision / RTSP",
      desc: "Industrial 4K Basler/FLIR cameras streaming directly to local edge devices with sub-5ms frame grabbing.",
    },
    {
      step: "02",
      title: "TensorRT Inference",
      tech: "NVIDIA Jetson / RTX",
      desc: "Quantized FP16/INT8 YOLOv8 & PatchCore anomaly models executing deterministic inference locally in 12ms.",
    },
    {
      step: "03",
      title: "PLC Hardware Reject",
      tech: "OPC UA / Modbus TCP",
      desc: "Zero-cloud dependency. High-speed pneumatic reject gates actuated directly via industrial PLC registers.",
    },
    {
      step: "04",
      title: "Observability Sync",
      tech: "PostgreSQL & Webhooks",
      desc: "Aggregated quality analytics, defect heatmaps, and audit logs synced asynchronously to the fleet dashboard.",
    },
  ];

  return (
    <section className="py-16 border-b border-zinc-800">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-xl mb-10 space-y-1.5">
          <Badge variant="default" className="mb-2">
            Edge-First Architecture
          </Badge>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Hybrid Edge & Cloud Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Engineered for 100% offline operational resilience with centralized cloud monitoring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pipelineSteps.map((step, idx) => (
            <Card key={idx} className="p-6 space-y-3 relative group">
              <div className="text-xs font-mono text-zinc-500 font-semibold">
                STEP {step.step}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                <div className="text-[11px] font-mono text-zinc-400 mt-0.5">{step.tech}</div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">{step.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
