"use client";

import React from "react";
import { MICRO_SPRINTS } from "@/lib/mock-data";
import { MicroSprintCard } from "@/components/solopreneur/MicroSprintCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default function ToolsCatalogPage() {
  return (
    <div className="py-14 container mx-auto px-6 max-w-6xl space-y-16">
      {/* Header */}
      <div className="max-w-2xl space-y-4">
        <Badge variant="default">
          Fixed-Scope Engineering Sprints
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
          Productized AI Micro-Sprints
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
          Pre-tested engineering architectures customized for your workflows. Delivered in 48 hours with full repository ownership and zero ongoing platform lock-in.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {MICRO_SPRINTS.map((sprint) => (
          <MicroSprintCard key={sprint.slug} sprint={sprint} />
        ))}
      </div>

      {/* How it works */}
      <div className="border-t border-zinc-800 pt-12 space-y-6">
        <div className="max-w-xl space-y-1">
          <h3 className="text-lg font-semibold text-white">
            Asynchronous 48-Hour Workflow
          </h3>
          <p className="text-xs text-zinc-400">Zero kickoff calls. Immediate engineering kickoff.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-zinc-300">
          <Card className="p-5 space-y-2">
            <div className="text-zinc-500 font-semibold">01 / DIRECT PURCHASE</div>
            <div className="text-sm font-semibold text-white font-sans">Self-Serve Checkout</div>
            <p className="text-zinc-400 font-sans text-xs">Stripe card checkout with instant order ID generation.</p>
          </Card>
          <Card className="p-5 space-y-2">
            <div className="text-zinc-500 font-semibold">02 / ASYNC INTAKE</div>
            <div className="text-sm font-semibold text-white font-sans">Loom + Encrypted Vault</div>
            <p className="text-zinc-400 font-sans text-xs">Submit video walkthrough and client-side AES-256 encrypted API tokens.</p>
          </Card>
          <Card className="p-5 space-y-2">
            <div className="text-zinc-500 font-semibold">03 / CODE DELIVERY</div>
            <div className="text-sm font-semibold text-white font-sans">48-Hour Handoff</div>
            <p className="text-zinc-400 font-sans text-xs">Receive GitHub repository, Docker container, and documentation.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
