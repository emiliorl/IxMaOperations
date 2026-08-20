"use client";

import React from "react";
import Link from "next/link";
import { MicroSprint } from "@/lib/mock-data";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MicroCheckoutButton } from "@/components/solopreneur/MicroCheckoutButton";
import { CheckCircle2, Clock, Zap, ArrowRight } from "lucide-react";

interface MicroSprintCardProps {
  sprint: MicroSprint;
}

export function MicroSprintCard({ sprint }: MicroSprintCardProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/90 flex flex-col justify-between hover:border-slate-700 transition-all duration-300 shadow-xl relative overflow-hidden group">
      {sprint.badge && (
        <div className="absolute top-3 right-3">
          <Badge variant="cyan" className="text-[10px] font-mono">
            {sprint.badge}
          </Badge>
        </div>
      )}

      <div>
        <CardHeader className="p-6 pb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{sprint.timelineHours}-Hour Turnaround Guaranteed</span>
          </div>
          <CardTitle className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
            {sprint.title}
          </CardTitle>
          <CardDescription className="text-xs text-slate-400 leading-relaxed">
            {sprint.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-4">
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Fixed Price Fee</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-black font-mono text-white">${sprint.price}</span>
              <span className="text-xs text-slate-400 font-mono">one-time</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
              What You Receive:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {sprint.deliverables.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="leading-tight">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </div>

      <CardFooter className="p-6 pt-0 flex flex-col gap-2">
        <MicroCheckoutButton
          toolSlug={sprint.slug}
          toolTitle={sprint.title}
          priceAmount={sprint.price}
          className="w-full"
        />
        <Link href={`/tools/${sprint.slug}`} className="w-full">
          <Button variant="ghost" size="sm" className="w-full text-xs text-slate-400 hover:text-white gap-1">
            <span>View Full Technical Scope & Sample Output</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
