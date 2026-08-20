"use client";

import React from "react";
import Link from "next/link";
import { MicroSprint } from "@/lib/mock-data";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MicroCheckoutButton } from "@/components/solopreneur/MicroCheckoutButton";
import { ArrowRight, Check } from "lucide-react";

interface MicroSprintCardProps {
  sprint: MicroSprint;
}

export function MicroSprintCard({ sprint }: MicroSprintCardProps) {
  return (
    <Card className="flex flex-col justify-between shadow-sm relative group p-1">
      <div>
        <CardHeader className="p-5 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400">
              {sprint.timelineHours}-Hour Delivery
            </span>
            {sprint.badge && (
              <Badge variant="default" className="text-[10px]">
                {sprint.badge}
              </Badge>
            )}
          </div>

          <CardTitle className="text-base font-semibold text-white">
            {sprint.title}
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400 leading-relaxed">
            {sprint.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 pt-0 space-y-4">
          <div className="p-3 rounded bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">Fixed Fee</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold font-mono text-white">${sprint.price}</span>
              <span className="text-xs text-zinc-400 font-mono">one-time</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
              Deliverables
            </span>
            <ul className="space-y-1 text-xs text-zinc-300">
              {sprint.deliverables.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
                  <span className="leading-tight text-zinc-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </div>

      <CardFooter className="p-5 pt-0 flex flex-col gap-2">
        <MicroCheckoutButton
          toolSlug={sprint.slug}
          toolTitle={sprint.title}
          priceAmount={sprint.price}
          className="w-full"
        />
        <Link href={`/tools/${sprint.slug}`} className="w-full">
          <Button variant="ghost" size="sm" className="w-full text-xs text-zinc-400 hover:text-zinc-100 gap-1">
            <span>Scope Details</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
