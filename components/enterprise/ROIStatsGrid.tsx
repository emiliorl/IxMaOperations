import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { TrendingUp, Clock, ShieldAlert, DollarSign } from "lucide-react";

export function ROIStatsGrid() {
  const stats = [
    {
      metric: "99.92%",
      label: "SMT Defect Recall Rate",
      desc: "Sub-millimeter anomaly detection catching bridging & tombstoning before reflow.",
      icon: ShieldAlert,
      color: "text-emerald-400",
    },
    {
      metric: "12 ms",
      label: "TensorRT Edge Latency",
      desc: "Inference completed at line speed on NVIDIA Jetson Orin & RTX industrial PCs.",
      icon: Clock,
      color: "text-cyan-400",
    },
    {
      metric: "-94.7%",
      label: "Logistics Gate Queue Drop",
      desc: "Instant automated ALPR + container OCR gate dispatch replacing manual clipboards.",
      icon: TrendingUp,
      color: "text-amber-400",
    },
    {
      metric: "$380k / yr",
      label: "Operational Cost Recovery",
      desc: "Average documented annual labor & scrap reduction per manufacturing line.",
      icon: DollarSign,
      color: "text-emerald-400",
    },
  ];

  return (
    <section className="py-12 border-y border-slate-800 bg-slate-950/60">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Sourced Operational Benchmarks
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Validated across automotive assembly, port logistics terminals, and customs clearance pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card key={idx} className="border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-colors">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-3xl font-black font-mono tracking-tight ${item.color}`}>
                      {item.metric}
                    </span>
                    <Icon className={`h-5 w-5 ${item.color} opacity-80`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">{item.label}</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
