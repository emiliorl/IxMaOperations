import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SERVICES } from "@/lib/services";
import { FileVideo, Users, FolderCheck, Receipt, Inbox, ArrowRight, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  FileVideo,
  Users,
  FolderCheck,
  Receipt,
  Inbox,
};

/**
 * Homepage services grid — repurposed from components/enterprise/ServicesMatrix.tsx
 * (Task 9.2). Pulls from lib/services.ts, the single source of truth for all
 * 5 offers, instead of a hardcoded list.
 */
export function ServicesGrid() {
  return (
    <section id="services" className="py-16 md:py-24 border-b border-zinc-800 bg-zinc-950/60">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-2xl mb-12 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            What We Automate
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Five practical automations, built around real work
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Each one replaces a specific manual grind. Pick the one that matches yours, see a practical example,
            then get a quote.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service) => {
            const Icon = ICONS[service.icon];
            return (
              <Card key={service.slug} className="flex flex-col justify-between p-6 space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {service.painPoint.hoursPerWeek}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-white leading-snug">{service.name}</h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{service.pitch}</p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                    <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
                      Replaces:
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{service.painPoint.description}</p>
                  </div>
                </div>

                <Link
                  href={`/services/${service.slug}`}
                  className="inline-flex items-center justify-between w-full text-xs px-3 py-2 rounded-md border border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
                >
                  <span>See how it works</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                </Link>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
