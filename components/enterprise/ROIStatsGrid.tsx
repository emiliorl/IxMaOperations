import React from "react";
import { Card, CardContent } from "@/components/ui/Card";

export function ROIStatsGrid() {
  const stats = [
    {
      metric: "99.92%",
      label: "SMT Defect Recall Rate",
      desc: "Sub-millimeter anomaly detection catching bridging and tombstoning before reflow.",
    },
    {
      metric: "12 ms",
      label: "TensorRT Edge Latency",
      desc: "Inference executed at full line speed on NVIDIA Jetson Orin and RTX industrial compute.",
    },
    {
      metric: "-94.7%",
      label: "Logistics Gate Queue Drop",
      desc: "Instant automated ALPR and container OCR gate clearance replacing manual paper logging.",
    },
    {
      metric: "$380,000",
      label: "Annual Operational Recovery",
      desc: "Average documented reduction in labor, rework, and scrap per manufacturing line.",
    },
  ];

  return (
    <section className="py-14 border-b border-zinc-800">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-xl mb-8 space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Documented Operational Benchmarks
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Field-tested metrics across Tier-1 automotive assembly, intermodal freight, and customs clearance pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item, idx) => (
            <Card key={idx} className="p-5 space-y-2">
              <div className="text-2xl sm:text-3xl font-semibold font-mono tracking-tight text-white">
                {item.metric}
              </div>
              <div className="text-xs font-medium text-zinc-200">{item.label}</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
