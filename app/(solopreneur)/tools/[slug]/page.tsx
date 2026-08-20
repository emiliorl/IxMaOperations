"use client";

import React from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { MICRO_SPRINTS } from "@/lib/mock-data";
import { MicroCheckoutButton } from "@/components/solopreneur/MicroCheckoutButton";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Clock, CheckCircle2, ShieldCheck, Zap, Cpu, Terminal, FileCode } from "lucide-react";

export default function MicroSprintDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const sprint = MICRO_SPRINTS.find((s) => s.slug === slug);

  if (!sprint) {
    return (
      <div className="py-20 text-center container mx-auto px-4">
        <h1 className="text-2xl font-bold text-white mb-2">Micro-Sprint Not Found</h1>
        <Link href="/tools">
          <Button variant="secondary">Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-12 container mx-auto px-4 max-w-4xl space-y-10">
      {/* Breadcrumb Back Link */}
      <div>
        <Link
          href="/tools"
          className="text-xs font-mono text-slate-400 hover:text-white inline-flex items-center gap-1 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to All Micro-Sprints</span>
        </Link>
      </div>

      {/* Header & Pricing Hero */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="cyan" className="text-xs font-mono">
            {sprint.category}
          </Badge>
          <Badge variant="default" className="text-xs font-mono">
            {sprint.timelineHours}-Hour SLA
          </Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
          {sprint.title}
        </h1>

        <p className="text-base text-slate-400 leading-relaxed">
          {sprint.description}
        </p>

        {/* Pricing Card */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div>
            <span className="text-[11px] font-mono text-slate-400 uppercase block">Fixed-Scope Investment</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-4xl font-black font-mono text-white">${sprint.price}</span>
              <span className="text-xs text-slate-400 font-mono">one-time payment</span>
            </div>
          </div>

          <MicroCheckoutButton
            toolSlug={sprint.slug}
            toolTitle={sprint.title}
            priceAmount={sprint.price}
            className="sm:w-auto w-full"
          />
        </div>
      </div>

      {/* Deliverables & Scope */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            What is Included
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-300">
            {sprint.deliverables.map((d, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 font-mono font-bold">•</span>
                <span className="leading-relaxed">{d}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="h-5 w-5 text-cyan-400" />
            Prerequisites & Tech Stack
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-1">
                What We Need from You:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {sprint.prerequisites.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-mono">→</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[11px] font-mono text-slate-400 uppercase block mb-2">
                Technologies Used:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sprint.techStack.map((tech, idx) => (
                  <Badge key={idx} variant="secondary" className="font-mono text-[10px] border-slate-700">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Sample Output Preview Card */}
      <Card className="border-slate-800 bg-slate-950 p-6 space-y-3 shadow-xl">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Expected Output Format</h3>
        </div>
        <div className="p-4 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
          <div><span className="text-slate-500">Delivery Format:</span> <span className="text-cyan-300">{sprint.sampleOutput.format}</span></div>
          <div><span className="text-slate-500">Benchmark:</span> <span>{sprint.sampleOutput.description}</span></div>
          <div><span className="text-slate-500">Performance:</span> <span className="text-emerald-400">{sprint.sampleOutput.metrics}</span></div>
        </div>
      </Card>
    </div>
  );
}
