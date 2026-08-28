"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Progress } from "@/components/ui/Progress";
import { CheckCircle2, Clock, Terminal, Download, ShieldCheck, Search, ArrowRight } from "lucide-react";

// useSearchParams() opts a client component out of static rendering unless
// it's wrapped in Suspense — see the default export below.
export default function ClientPortalPage() {
  return (
    <Suspense fallback={null}>
      <ClientPortalContent />
    </Suspense>
  );
}

function ClientPortalContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("orderId") || "ix_ord_demo_2026";
  const [orderQuery, setOrderQuery] = useState(initialOrderId);

  const steps = [
    { label: "Intake Submitted", status: "completed", date: "Aug 20, 16:30" },
    { label: "Environment & Proxy Provisioned", status: "completed", date: "Aug 20, 16:45" },
    { label: "Core Pipeline In Development", status: "active", date: "In Progress" },
    { label: "Automated QA & Benchmark Run", status: "pending", date: "Est. Aug 21" },
    { label: "Final Code & Repo Delivery", status: "pending", date: "Est. Aug 22" },
  ];

  return (
    <div className="py-12 container mx-auto px-4 max-w-4xl space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="text-xs font-mono mb-2">
            Client Asynchronous Dashboard
          </Badge>
          <h1 className="text-3xl font-extrabold text-white">
            Sprint Status & Delivery Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Track real-time development milestones, inspect build logs, and access delivered assets.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            value={orderQuery}
            onChange={(e) => setOrderQuery(e.target.value)}
            placeholder="Order ID (e.g. ix_ord_...)"
            className="font-mono text-xs max-w-[200px]"
          />
          <Button variant="secondary" size="sm" className="gap-1">
            <Search className="h-3.5 w-3.5" />
            Lookup
          </Button>
        </div>
      </div>

      {/* Main Status Overview */}
      <Card className="border-slate-800 bg-slate-900/90 shadow-xl space-y-6 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Active Order</span>
            <span className="font-mono text-base font-bold text-white">{orderQuery}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs font-mono gap-1.5 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              SLA: 31 Hours Remaining
            </Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Milestone Progress</span>
            <span className="text-emerald-400 font-bold">50% Completed</span>
          </div>
          <Progress value={50} />
        </div>

        {/* Step-by-Step Milestones */}
        <div className="space-y-3 pt-2">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Sprint Milestones
          </span>
          <div className="space-y-2">
            {steps.map((step, idx) => {
              const isCompleted = step.status === "completed";
              const isActive = step.status === "active";
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg border text-xs font-mono ${
                    isCompleted
                      ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
                      : isActive
                      ? "bg-cyan-950/30 border-cyan-500/50 text-cyan-200 shadow-sm"
                      : "bg-slate-950/40 border-slate-800/60 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : isActive ? (
                      <Clock className="h-4 w-4 text-cyan-400 animate-spin" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-700" />
                    )}
                    <span className="font-medium text-slate-200">{step.label}</span>
                  </div>

                  <span className="text-[10px] text-slate-400">{step.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Support & Revision Box */}
      <Card className="border-slate-800 bg-slate-950 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Async Engineer Support</h3>
          </div>
          <Badge variant="secondary" className="text-[10px] font-mono">
            &lt; 2hr Response Time
          </Badge>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Need to append additional proxy credentials or refine extraction target selectors? Reply directly to your order confirmation email or submit notes below.
        </p>

        <div className="flex gap-2">
          <Input placeholder="Message to engineer on duty..." className="text-xs" />
          <Button size="sm" variant="secondary" className="shrink-0">
            Send Note
          </Button>
        </div>
      </Card>
    </div>
  );
}
