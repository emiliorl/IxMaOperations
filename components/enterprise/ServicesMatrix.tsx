"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAppStore } from "@/lib/store";
import {
  FileText,
  Globe,
  Bot,
  RefreshCw,
  Eye,
  LayoutDashboard,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
  Code2,
  Lock,
} from "lucide-react";

interface ServiceItem {
  id: string;
  title: string;
  icon: React.ElementType;
  badge: string;
  roiTag: string;
  description: string;
  clientPain: string;
  deliverables: string[];
  ownershipHighlights: string[];
}

const SERVICES: ServiceItem[] = [
  {
    id: "document-extraction",
    title: "Intelligent Document & Data Extraction",
    icon: FileText,
    badge: "Document Vision",
    roiTag: "Saves 15-25 hrs/week in AP/Ops",
    description:
      "Transform messy invoices, bills of lading, medical forms, and PDF contracts into structured database records automatically.",
    clientPain: "Eliminates manual re-typing and invoice math errors.",
    deliverables: [
      "Custom OCR & LayoutLM parser tuned to your document formats",
      "Automated PO matching & 3-way math validation engine",
      "Direct API sync to SAP, NetSuite, QuickBooks, or SQL database",
      "Human-in-the-loop review UI for ambiguous edge cases",
    ],
    ownershipHighlights: [
      "100% Private Cloud / On-Prem Deploy",
      "Zero Per-Document SaaS Taxes",
      "Full Source Code & Parser IP Handover",
    ],
  },
  {
    id: "web-scraping",
    title: "Web Scraping & Market Intelligence",
    icon: Globe,
    badge: "Playwright Pipelines",
    roiTag: "10x Faster Market Data Feeds",
    description:
      "Reliable, auto-healing web crawlers that extract competitor pricing, catalog updates, real estate records, and B2B directories.",
    clientPain: "Stops relying on fragile browser tools and manual copy-pasting.",
    deliverables: [
      "Headless Playwright stealth cluster with proxy rotation",
      "Cloudflare Turnstile & CAPTCHA bypass integration",
      "Daily automated cron jobs with Postgres database upserts",
      "Slack / Webhook alerts for price drops & inventory changes",
    ],
    ownershipHighlights: [
      "Dedicated Worker Infrastructure",
      "Zero Vendor Data Lock-In",
      "Complete ETL Pipeline Ownership",
    ],
  },
  {
    id: "workflow-automation",
    title: "Custom AI Business Automation & Sync",
    icon: RefreshCw,
    badge: "Ops Pipelines",
    roiTag: "Sub-Second Event Processing",
    description:
      "Connect your fragmented software stack (CRM, ERP, email, billing, Slack) into autonomous, deterministic event workflows.",
    clientPain: "Removes repetitive manual handoffs between siloed apps.",
    deliverables: [
      "Event-driven webhook routing & background task queue",
      "AI email classification & automated ticket triage",
      "Two-way live synchronization between CRM & internal tools",
      "Automated weekly executive reporting & PDF generation",
    ],
    ownershipHighlights: [
      "Serverless / Dockerized Deployment",
      "Zero Per-Seat SaaS Overhead",
      "Direct Database Access & Control",
    ],
  },
  {
    id: "knowledge-agents",
    title: "AI Knowledge Agents & Support Systems",
    icon: Bot,
    badge: "Enterprise RAG",
    roiTag: "70%+ Tier-1 Ticket Deflection",
    description:
      "Deploy secure AI agents trained strictly on your company SOPs, technical manuals, and historical customer interactions.",
    clientPain: "Ends support rep burnout and hours spent searching old docs.",
    deliverables: [
      "Zero-hallucination RAG with pgvector / Pinecone search",
      "Strict paragraph-level source document citations",
      "Zendesk, Intercom, or custom web chat widget integration",
      "Admin analytics panel tracking deflection rates & feedback",
    ],
    ownershipHighlights: [
      "Zero Model Training on Public Data",
      "AES-256 Encrypted Knowledge Vault",
      "100% Proprietary Data Retention",
    ],
  },
  {
    id: "computer-vision",
    title: "Computer Vision & Quality Inspection",
    icon: Eye,
    badge: "Edge TensorRT",
    roiTag: "Sub-15ms Real-Time Inference",
    description:
      "High-speed visual inspection systems for assembly lines, logistics gates, package sorting, and security scanning.",
    clientPain: "Prevents defective parts from shipping and eliminates queue delays.",
    deliverables: [
      "TensorRT-optimized YOLO / segmentation models",
      "GigE camera integration with live FPS telemetry",
      "PLC / Modbus trigger for hardware pneumatic reject gates",
      "Automated image defect logging with S3 cloud backups",
    ],
    ownershipHighlights: [
      "100% Edge Hardware Execution",
      "Air-Gapped Offline Operation Capable",
      "Custom Trained Weight Files Handover",
    ],
  },
  {
    id: "custom-apps",
    title: "Custom Full-Stack Apps & Internal Portals",
    icon: LayoutDashboard,
    badge: "Next.js & Cloud",
    roiTag: "Replaces Fragile Spreadsheets",
    description:
      "Custom, production-grade web applications, client portals, and internal operations dashboards tailored to your exact workflows.",
    clientPain: "Eliminates broken formulas and accidental data deletion in Excel.",
    deliverables: [
      "Modern Next.js 15, React, and Tailwind CSS responsive interface",
      "PostgreSQL database architecture with Prisma/Drizzle ORM",
      "Role-Based Access Control (RBAC) & Single Sign-On (SSO)",
      "Real-time WebSocket data feeds and CSV/PDF export engine",
    ],
    ownershipHighlights: [
      "100% Custom Source Code Handover",
      "Zero Per-User Monthly License Fees",
      "Host Anywhere (Vercel, AWS, GCP, Bare Metal)",
    ],
  },
];

export function ServicesMatrix() {
  const { setFeasibilityModalOpen } = useAppStore();

  return (
    <section id="services" className="py-16 md:py-24 border-b border-zinc-800 bg-zinc-950/60">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            Core Engineering Offerings
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            What We Build For Your Company
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Every system is custom engineered to your exact operational requirements. You own 100% of the source code,
            infrastructure, and data — with zero ongoing per-seat SaaS tax.
          </p>
        </div>

        {/* 6 Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <Card
                key={service.id}
                className="flex flex-col justify-between p-6 bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 transition-all space-y-5"
              >
                <div className="space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                      {service.roiTag}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-semibold text-white leading-snug">{service.title}</h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{service.description}</p>
                  </div>

                  {/* Deliverables Checklist */}
                  <div className="space-y-2 pt-2 border-t border-zinc-850">
                    <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider">
                      What We Deliver:
                    </div>
                    <ul className="space-y-1.5 text-xs text-zinc-300">
                      {service.deliverables.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Scope & Durability / Ownership Highlights */}
                  <div className="p-2.5 rounded bg-zinc-950/70 border border-zinc-800/80 space-y-1.5">
                    <div className="text-[10px] font-mono uppercase text-zinc-400 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-zinc-400" />
                      Ownership & Scope Boundaries
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {service.ownershipHighlights.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setFeasibilityModalOpen(true)}
                    className="w-full text-xs justify-between"
                  >
                    <span>Request Custom Scope</span>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bottom Banner: Why Custom Beats Off-The-Shelf SaaS */}
        <div className="mt-12 p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2 text-white font-semibold text-sm sm:text-base">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span>Durable Architecture • Zero Recurring Vendor Lock-In</span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Unlike monthly SaaS platforms that charge per user and gate your data, we engineer custom systems that your company
              owns forever. Run them on your AWS/GCP cloud or private servers with full source code access.
            </p>
          </div>
          <Button
            size="lg"
            variant="default"
            onClick={() => setFeasibilityModalOpen(true)}
            className="w-full md:w-auto shrink-0 gap-2 text-xs sm:text-sm"
          >
            <span>Book 20-Min Feasibility Call</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
