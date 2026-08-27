"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Check, Play } from "lucide-react";

export function HeroSection() {
  const { setFeasibilityModalOpen } = useAppStore();
  const router = useRouter();
  const [activeTrack, setActiveTrack] = useState<"enterprise" | "sprints">("enterprise");

  const handleTrackChange = (track: "enterprise" | "sprints") => {
    setActiveTrack(track);
    if (track === "sprints") {
      router.push("/tools");
    }
  };

  const scrollToSimulator = () => {
    const el = document.getElementById("simulator");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-20 border-b border-zinc-800">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-3xl space-y-6">
          {/* Track Switcher Segmented Control */}
          <div className="inline-flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <button
              onClick={() => handleTrackChange("enterprise")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTrack === "enterprise"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Custom Systems & Automation
            </button>
            <button
              onClick={() => handleTrackChange("sprints")}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTrack === "sprints"
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              48-Hour Micro-Sprints ($499)
            </button>
          </div>

          {/* Crisp White Heading — Clear & Direct Value */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-white leading-[1.1]">
            Custom AI automations, intelligent data pipelines, and internal tools that eliminate manual busywork.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
            We turn repetitive manual workflows, messy documents, and disconnected software into reliable, high-speed
            custom systems built specifically for your company. You own 100% of the code.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Button
              size="lg"
              variant="default"
              onClick={() => setFeasibilityModalOpen(true)}
              className="gap-2 justify-center"
            >
              Book Feasibility Call
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              size="lg"
              variant="secondary"
              onClick={scrollToSimulator}
              className="gap-2 justify-center"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              See Practical Demos
            </Button>

            <Link href="/audit" className="w-full sm:w-auto">
              <Button size="lg" variant="ghost" className="w-full justify-center text-zinc-400 hover:text-zinc-200">
                2-Week Discovery Audit
              </Button>
            </Link>
          </div>

          {/* Minimal Sourced Trust Badges */}
          <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>100% Owned Source Code</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>Zero Per-Seat SaaS Taxes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-zinc-300" />
              <span>Private Cloud & On-Prem Deploy</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

