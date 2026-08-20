import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Camera, Cpu, Server, Network, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export function ArchitectureDiagram() {
  const pipelineSteps = [
    {
      step: "01",
      title: "Edge Ingestion",
      tech: "GigE Vision / RTSP",
      desc: "Industrial 4K cameras & sensors streaming directly to local edge devices.",
      icon: Camera,
      color: "text-cyan-400",
      badge: "Sub-5ms Frame Grab",
    },
    {
      step: "02",
      title: "TensorRT Inference",
      tech: "NVIDIA Jetson / RTX",
      desc: "Quantized FP16/INT8 YOLOv8 & PatchCore anomaly models executing locally.",
      icon: Cpu,
      color: "text-emerald-400",
      badge: "12ms Latency",
    },
    {
      step: "03",
      title: "PLC Actuation",
      tech: "OPC UA / Modbus TCP",
      desc: "Deterministic hardware reject signals triggered in real-time on factory line.",
      icon: Network,
      color: "text-amber-400",
      badge: "Zero-Cloud Dependency",
    },
    {
      step: "04",
      title: "Cloud Telemetry",
      tech: "Supabase & Webhooks",
      desc: "Aggregated quality analytics, defect heatmaps, and audit logs synced asynchronously.",
      icon: Server,
      color: "text-teal-300",
      badge: "Global Fleet View",
    },
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <Badge variant="cyan" className="text-[10px] mb-2 font-mono">
            Zero-Cloud Single Point of Failure
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Industrial Edge & Cloud Hybrid Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Engineered for 100% offline operational resilience with cloud observability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {pipelineSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Card key={idx} className="border-slate-800 bg-slate-900/90 relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="absolute top-0 right-0 p-3 font-mono text-3xl font-black text-slate-800 select-none group-hover:text-slate-700 transition-colors">
                  {step.step}
                </div>

                <CardContent className="p-6 space-y-4 relative z-10">
                  <div className="h-10 w-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                    <Icon className={`h-5 w-5 ${step.color}`} />
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white">{step.title}</h4>
                    <div className="text-xs font-mono text-cyan-400/90 mt-0.5">{step.tech}</div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{step.desc}</p>
                  </div>

                  <Badge variant="secondary" className="text-[10px] font-mono border-slate-800 bg-slate-950/80">
                    {step.badge}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
