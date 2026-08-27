"use client";

import React, { useState } from "react";
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
  CheckCircle2,
  XCircle,
  Play,
  ArrowRight,
  Sparkles,
  Clock,
  TrendingUp,
  AlertCircle,
  Database,
  Send,
  Zap,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  tagline: string;
  before: {
    title: string;
    metrics: { time: string; accuracy: string; labor: string };
    painPoints: string[];
  };
  after: {
    title: string;
    metrics: { time: string; accuracy: string; labor: string };
    advantages: string[];
  };
  simulator: {
    promptLabel: string;
    sampleInputs: string[];
    actionLabel: string;
    defaultOutput: {
      status: string;
      latency: string;
      confidence: string;
      extractedData: Record<string, string | number>;
      auditLogs: string[];
    };
  };
  miniCta: {
    text: string;
    actionLabel: string;
  };
}

const SCENARIOS: Scenario[] = [
  {
    id: "document-ai",
    title: "Document Extraction",
    category: "Finance & Operations",
    icon: FileText,
    tagline: "PDF invoices, receipts, and contracts extracted to ERP with zero manual typing.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "15 min / doc", accuracy: "88-92%", labor: "$28 / hour" },
      painPoints: [
        "Employees manually copying invoice numbers, line items, and tax codes into ERP/QuickBooks.",
        "Frequent data entry typos leading to duplicate payouts and vendor disputes.",
        "Multi-day lag between invoice receipt and balance sheet visibility.",
      ],
    },
    after: {
      title: "Automated with IxMa",
      metrics: { time: "1.4 sec", accuracy: "99.8%", labor: "$0.002 / doc" },
      advantages: [
        "Multi-modal OCR & LayoutLM extracts structured JSON directly from scanned PDFs and photos.",
        "Automatic 3-way line-item matching against POs and automated math verification.",
        "Direct webhook delivery into SAP, NetSuite, QuickBooks, or custom Postgres DB.",
      ],
    },
    simulator: {
      promptLabel: "Select Sample Document Input",
      sampleInputs: [
        "INV-2026-8842_ApexLogistics.pdf ($18,450.00)",
        "Vendor_Receipt_HydraulicValve_042.jpg ($3,120.50)",
        "MasterServiceAgreement_SignOff_v2.pdf",
      ],
      actionLabel: "Extract & Validate Document",
      defaultOutput: {
        status: "PARSED & VERIFIED",
        latency: "410ms",
        confidence: "99.92%",
        extractedData: {
          "Vendor Name": "Apex Logistics Global LLC",
          "Invoice #": "INV-2026-8842",
          "Line Items Count": 8,
          "Subtotal": "$16,926.61",
          "Tax (9.0%)": "$1,523.39",
          "Total Amount": "$18,450.00",
          "ERP Sync Status": "Directly Pushed to Ledger (ID: tx_9941a)",
        },
        auditLogs: [
          "[00ms] Webhook received raw PDF stream (1.2 MB)",
          "[180ms] OCR layout normalization completed",
          "[320ms] Mathematical checksum verified ($16,926.61 + $1,523.39 = $18,450.00)",
          "[410ms] Synced to ERP database via REST API",
        ],
      },
    },
    miniCta: {
      text: "Need this automated document accuracy in your AP & ops workflow?",
      actionLabel: "Book a 20-Min Feasibility Call",
    },
  },
  {
    id: "market-scraper",
    title: "Web Scraping & Intelligence",
    category: "Sales & Strategy",
    icon: Globe,
    tagline: "Reliable Playwright scrapers gathering real-time competitor prices, catalogs, and leads.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "12 hrs / week", accuracy: "Lagged data", labor: "Manual interns" },
      painPoints: [
        "Staff manually clicking 50+ competitor sites daily to copy SKU pricing into Google Sheets.",
        "Fragile browser extensions breaking on Cloudflare CAPTCHAs and site redesigns.",
        "Missed price undercut opportunities and zero automated alerts.",
      ],
    },
    after: {
      title: "Automated with IxMa",
      metrics: { time: "Automated Cron", accuracy: "100% Deterministic", labor: "$0 manual" },
      advantages: [
        "Headless stealth Playwright workers with automated residential proxy rotation.",
        "Auto-healing scrapers resistant to DOM changes and anti-bot challenges.",
        "Daily clean JSON/CSV feeds delivered to your Postgres database and Slack alerts.",
      ],
    },
    simulator: {
      promptLabel: "Select Scraping Target Target",
      sampleInputs: [
        "Competitor Industrial Tool Catalog (2,400 SKUs)",
        "B2B Directory Executive Lead Extraction",
        "E-Commerce Daily Price & Inventory Monitor",
      ],
      actionLabel: "Execute Stealth Scraper Job",
      defaultOutput: {
        status: "RUN COMPLETED",
        latency: "580ms (Simulated Batch)",
        confidence: "100% Verified",
        extractedData: {
          "Target Domain": "supply-direct-distributor.com",
          "Items Extracted": "2,418 SKUs",
          "Price Drops Detected": 14,
          "Out-of-Stock Items": 38,
          "Output Destination": "PostgreSQL `competitor_live_feed` table",
        },
        auditLogs: [
          "[00ms] Rotating residential proxy (US-East pool)",
          "[190ms] Cloudflare Turnstile challenge solved headlessly",
          "[420ms] Pagination auto-crawled: 48 catalog pages",
          "[580ms] Batch upserted to database; Slack price-drop alert triggered",
        ],
      },
    },
    miniCta: {
      text: "Want automated daily pricing feeds or custom scrapers built for your niche?",
      actionLabel: "Explore Scraper Pipelines",
    },
  },
  {
    id: "ops-automation",
    title: "Workflow & App Automation",
    category: "Operations & CRM",
    icon: RefreshCw,
    tagline: "Connect messy spreadsheets, emails, and CRMs into autonomous multi-step pipelines.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "4-6 hrs / day", accuracy: "Human mistakes", labor: "Full-time ops" },
      painPoints: [
        "Leads sitting in inbox unassigned for hours before someone manually adds them to CRM.",
        "Disconnected tools (HubSpot, Stripe, Slack, Jira) requiring copy-paste updates.",
        "End-of-month reporting taking days of spreadsheet formula troubleshooting.",
      ],
    },
    after: {
      title: "Automated with IxMa",
      metrics: { time: "Sub-second", accuracy: "100% Rule-Locked", labor: "Autonomous" },
      advantages: [
        "Event-driven serverless webhooks that trigger instant multi-tool synchronization.",
        "Smart AI classification that parses incoming customer emails and routes tickets.",
        "Automated PDF report generators that email executive summaries every Monday morning.",
      ],
    },
    simulator: {
      promptLabel: "Trigger Workflow Event",
      sampleInputs: [
        "Inbound B2B RFP Email -> Qualify -> Sync HubSpot -> Ping Slack",
        "Stripe New Enterprise Customer -> Provision Seat -> Generate NDA -> Invite Team",
        "Inventory Low Stock Event -> Check Supplier API -> Draft Purchase Order",
      ],
      actionLabel: "Trigger Automated Pipeline",
      defaultOutput: {
        status: "PIPELINE EXECUTED",
        latency: "340ms",
        confidence: "Deterministic",
        extractedData: {
          "Event": "Inbound Lead from Form (ACME Logistics)",
          "Enrichment Score": "Tier 1 Enterprise (Score: 94/100)",
          "CRM Record Created": "HubSpot Deal #4092 ($24k ARR)",
          "Slack Notification": "Pushed to #enterprise-leads with 1-click accept",
          "Auto-Response": "Personalized calendar invite sent in 1.2s",
        },
        auditLogs: [
          "[00ms] Webhook received from contact endpoint",
          "[110ms] Clearbit/Apollo API enrichment returned company size (250+ emp)",
          "[240ms] HubSpot CRM contact & deal card created",
          "[340ms] Slack interactive card posted to sales channel",
        ],
      },
    },
    miniCta: {
      text: "Ready to eliminate manual copy-pasting across your team's software stack?",
      actionLabel: "Schedule Automation Diagnostic",
    },
  },
  {
    id: "support-agent",
    title: "AI Knowledge & Support Agent",
    category: "Customer Experience",
    icon: Bot,
    tagline: "Private internal AI trained on your SOPs, technical manuals, and client tickets.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "4.5 hr 1st reply", accuracy: "Varies by rep", labor: "Overwhelmed team" },
      painPoints: [
        "Support reps digging through outdated Notion docs and PDFs to answer repetitive questions.",
        "Customers waiting hours for simple onboarding guidance and technical specs.",
        "New hire ramp-up taking 3+ months just to learn internal operating procedures.",
      ],
    },
    after: {
      title: "Automated with IxMa",
      metrics: { time: "0.8 sec", accuracy: "Strict Citations", labor: "70% ticket deflection" },
      advantages: [
        "Zero-hallucination RAG architecture strictly anchored to your verified company documents.",
        "Every AI response includes exact file links and paragraph citations.",
        "Autonomous handling of tier-1 support tickets with human handoff for edge cases.",
      ],
    },
    simulator: {
      promptLabel: "Sample Client Inquiry",
      sampleInputs: [
        "'How do I configure OAuth2 SAML integration with Okta for our enterprise tenant?'",
        "'What is the refund policy for annual enterprise agreements under clause 4.2?'",
        "'Where are our standard hazardous material shipping guidelines for Q3 2026?'",
      ],
      actionLabel: "Query Knowledge Engine",
      defaultOutput: {
        status: "ANSWER GENERATED WITH CITATIONS",
        latency: "520ms",
        confidence: "99.4% Document Match",
        extractedData: {
          "Source Document": "Docs/Security/Enterprise_SAML_Okta_Guide_v3.2.pdf",
          "Exact Citation": "Page 14, Section 3.1: Identity Provider Metadata Exchange",
          "Generated Response": "Navigate to Admin > Security > Single Sign-On, upload your Okta XML metadata certificate, and map the ACS URL `https://app.company.com/sso/saml` with SHA-256 fingerprinting.",
          "Resolution Action": "Ticket auto-resolved; client rated 5/5 helpfulness",
        },
        auditLogs: [
          "[00ms] User query embedded via Vector Search",
          "[160ms] Top 3 cosine similarity chunks retrieved from Pinecone/pgvector",
          "[380ms] Deterministic LLM response formulated with strict citation bounds",
          "[520ms] Response validated against safety filter and delivered",
        ],
      },
    },
    miniCta: {
      text: "Want a 24/7 AI agent trained directly on your internal company knowledge?",
      actionLabel: "Book a 20-Min Feasibility Call",
    },
  },
  {
    id: "vision-qc",
    title: "Computer Vision & Quality Check",
    category: "Hardware & Manufacturing",
    icon: Eye,
    tagline: "Real-time edge camera models catching defects, verifying barcodes, and logging audit trails.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "Visual spot-check", accuracy: "91% (fatigue)", labor: "$45k/line/yr" },
      painPoints: [
        "Operators visually inspecting fast-moving items, missing micro-cracks and misprints.",
        "Defective units shipping to clients resulting in expensive chargebacks and returns.",
        "Zero digital video audit trail when a customer files an RMA defect claim.",
      ],
    },
    after: {
      title: "Automated with IxMa",
      metrics: { time: "12 ms / frame", accuracy: "99.92%", labor: "Continuous 24/7" },
      advantages: [
        "NVIDIA Jetson / TensorRT inference running locally on factory floor cameras at 60+ FPS.",
        "Sub-millimeter anomaly detection with bounding box coordinates and defect heatmaps.",
        "Direct PLC trigger (Siemens / Modbus) for pneumatic reject arm sorting.",
      ],
    },
    simulator: {
      promptLabel: "Select Production Camera Feed",
      sampleInputs: [
        "Surface Finish Inspector (Camera 02 - Line B)",
        "Package Barcode & Seal Verifier (High-Speed Conveyor)",
        "Logistics Gate ALPR & Container Code Scanner",
      ],
      actionLabel: "Run Vision Inference",
      defaultOutput: {
        status: "ANOMALY DETECTED -> REJECT TRIGGERED",
        latency: "14ms (NVIDIA TensorRT 8.6)",
        confidence: "98.9% Anomaly Certainty",
        extractedData: {
          "Defect Classification": "Surface Scratch & Micro-Pinhole (0.42mm)",
          "Camera Sensor": "Basler GigE 4K (Frame #10948)",
          "PLC Action": "Signal sent to Pneumatic Actuator Gate #4",
          "Line Speed": "2.4 meters/sec (120 units/min)",
          "Audit Snapshot": "Saved to `s3://manufacturing-qa-audit/2026-08/`",
        },
        auditLogs: [
          "[00ms] Frame grabbed over GigE camera interface",
          "[06ms] YOLOv8s-TensorRT bounding box segmentation completed",
          "[11ms] Defect confidence threshold exceeded (>95%)",
          "[14ms] Modbus TCP pulse sent to Siemens S7-1500 PLC reject gate",
        ],
      },
    },
    miniCta: {
      text: "Need real-time visual inspection on your assembly lines or logistics docks?",
      actionLabel: "Discuss Edge Vision Specs",
    },
  },
  {
    id: "custom-apps",
    title: "Custom Ops Portals & Apps",
    category: "Internal Software",
    icon: LayoutDashboard,
    tagline: "Replace brittle spreadsheets with bespoke Next.js web applications, client portals, and dashboards.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "Spreadsheet chaos", accuracy: "Broken formulas", labor: "Frustrated team" },
      painPoints: [
        "Company running critical operations out of 50-tab Excel sheets with zero access control.",
        "Clients emailing asking for status updates because they have no self-serve portal.",
        "No audit trail of who edited what data, leading to accidental data loss.",
      ],
    },
    after: {
      title: "Automated with IxMa",
      metrics: { time: "Real-Time Cloud", accuracy: "Type-Safe DB", labor: "100% Self-Serve" },
      advantages: [
        "Custom, responsive Next.js & Tailwind web portals tailored to your exact business logic.",
        "Role-based access control (RBAC), SSO authentication, and complete activity audit logging.",
        "Zero recurring per-user SaaS license fees — you own 100% of the source code.",
      ],
    },
    simulator: {
      promptLabel: "Select Portal Blueprint",
      sampleInputs: [
        "B2B Client Order Tracking & Asset Download Portal",
        "Operations Team Task Dispatch & Field Technician Mobile App",
        "Executive Revenue & Fulfillment Live KPI Dashboard",
      ],
      actionLabel: "Launch Portal Simulator",
      defaultOutput: {
        status: "PORTAL SESSION INITIALIZED",
        latency: "280ms",
        confidence: "Production Ready",
        extractedData: {
          "Application": "Enterprise Operations Dispatch Web Portal",
          "Architecture": "Next.js 15, PostgreSQL, Tailwind, REST API",
          "Auth": "Role-Based (Admin, Dispatcher, Field Engineer)",
          "Ownership": "100% Custom Source Code Handover (No SaaS Seat Tax)",
          "Deployment": "Dockerized on AWS ECS / Vercel Edge",
        },
        auditLogs: [
          "[00ms] Initialized database connection pool (Supabase / Postgres)",
          "[110ms] Authenticated user session via JWT & RBAC permission gate",
          "[210ms] Fetched real-time dispatch queue with server-side caching",
          "[280ms] Rendered interactive UI with WebSocket live telemetry",
        ],
      },
    },
    miniCta: {
      text: "Need a custom internal tool or client portal built for your exact workflow?",
      actionLabel: "Book a 20-Min Feasibility Call",
    },
  },
];

export function BeforeAfterSimulator() {
  const { setFeasibilityModalOpen } = useAppStore();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("document-ai");
  const [selectedInputIndex, setSelectedInputIndex] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulatedData, setSimulatedData] = useState<typeof SCENARIOS[0]["simulator"]["defaultOutput"] | null>(
    SCENARIOS[0].simulator.defaultOutput
  );

  const currentScenario = SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  const handleScenarioChange = (id: string) => {
    setSelectedScenarioId(id);
    setSelectedInputIndex(0);
    const newScenario = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
    setSimulatedData(newScenario.simulator.defaultOutput);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    // Snappy, deterministic simulated latency (350-500ms) for high speed & instant feedback
    setTimeout(() => {
      setSimulatedData({
        ...currentScenario.simulator.defaultOutput,
      });
      setIsSimulating(false);
    }, 450);
  };

  return (
    <section id="simulator" className="py-16 md:py-24 border-b border-zinc-800 bg-zinc-950">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Section Header */}
        <div className="max-w-2xl mb-10 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            Interactive Scenario Simulator
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            See the Difference: Manual Chaos vs. Automated with IxMa
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Click through real-world company workflows below to see how we replace hours of manual data entry,
            brittle tools, and spreadsheet errors with deterministic software.
          </p>
        </div>

        {/* 1. Scenario Tab Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
          {SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            const isActive = scenario.id === selectedScenarioId;
            return (
              <button
                key={scenario.id}
                onClick={() => handleScenarioChange(scenario.id)}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between gap-3 ${
                  isActive
                    ? "bg-zinc-900 border-zinc-500 text-white shadow-sm"
                    : "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`h-4 w-4 ${isActive ? "text-zinc-100" : "text-zinc-400"}`} />
                  <span className="text-[10px] font-mono text-zinc-500">{scenario.category.split(" ")[0]}</span>
                </div>
                <div>
                  <div className="text-xs font-semibold leading-snug">{scenario.title}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Scenario Overview Banner */}
        <div className="mb-6 p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono uppercase text-zinc-400">{currentScenario.category}</span>
            <div className="text-base sm:text-lg font-semibold text-white">{currentScenario.title}</div>
            <p className="text-xs sm:text-sm text-zinc-400">{currentScenario.tagline}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setFeasibilityModalOpen(true)}
            className="text-xs shrink-0 self-start sm:self-center"
          >
            Custom Architecture Request
          </Button>
        </div>

        {/* 2. Before vs. After Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* BEFORE: The Manual Old Way */}
          <Card className="border-red-950/40 bg-gradient-to-b from-red-950/10 to-zinc-950/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-mono uppercase text-red-300 font-semibold tracking-wider">
                  The Old Manual Way
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Manual Process</span>
            </div>

            {/* Pain Point Metrics */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80 text-center font-mono">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Avg Time</div>
                <div className="text-xs font-semibold text-red-300">{currentScenario.before.metrics.time}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Accuracy</div>
                <div className="text-xs font-semibold text-red-300">{currentScenario.before.metrics.accuracy}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Labor Cost</div>
                <div className="text-xs font-semibold text-red-300">{currentScenario.before.metrics.labor}</div>
              </div>
            </div>

            {/* Pain Points List */}
            <ul className="space-y-2 text-xs text-zinc-400 pt-1">
              {currentScenario.before.painPoints.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-400 font-bold shrink-0">✕</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* AFTER: Automated with IxMa */}
          <Card className="border-emerald-950/40 bg-gradient-to-b from-emerald-950/10 to-zinc-950/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-mono uppercase text-emerald-300 font-semibold tracking-wider">
                  Automated with IxMa
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                100% Owned System
              </span>
            </div>

            {/* Advantage Metrics */}
            <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80 text-center font-mono">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Avg Time</div>
                <div className="text-xs font-semibold text-emerald-300">{currentScenario.after.metrics.time}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Accuracy</div>
                <div className="text-xs font-semibold text-emerald-300">{currentScenario.after.metrics.accuracy}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Labor Cost</div>
                <div className="text-xs font-semibold text-emerald-300">{currentScenario.after.metrics.labor}</div>
              </div>
            </div>

            {/* Advantages List */}
            <ul className="space-y-2 text-xs text-zinc-300 pt-1">
              {currentScenario.after.advantages.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* 3. Interactive Live Simulated Execution Box */}
        <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-zinc-300" />
                <h3 className="text-sm sm:text-base font-semibold text-white">
                  Live Simulated Workflow Demo
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Test the automated engine in real-time. Responses run with deterministic speed.
              </p>
            </div>

            <Button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="gap-2 shrink-0 justify-center"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Executing Pipeline...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  {currentScenario.simulator.actionLabel}
                </>
              )}
            </Button>
          </div>

          {/* Sample Input Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono uppercase text-zinc-400">
              {currentScenario.simulator.promptLabel}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {currentScenario.simulator.sampleInputs.map((input, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedInputIndex(idx);
                    handleRunSimulation();
                  }}
                  className={`p-2.5 text-xs text-left rounded-md border font-mono transition-all truncate ${
                    selectedInputIndex === idx
                      ? "bg-zinc-800 border-zinc-600 text-white font-medium shadow-sm"
                      : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  }`}
                  title={input}
                >
                  <div className="truncate">{input}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Output Display & Telemetry Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Structured JSON / Key-Value Extraction */}
            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-[11px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-zinc-400" />
                  Structured Extraction Result
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-semibold">
                  {simulatedData?.status}
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                {simulatedData &&
                  Object.entries(simulatedData.extractedData).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-1.5 rounded bg-zinc-900/40 border border-zinc-800/40 text-[11px]"
                    >
                      <span className="text-zinc-400">{key}:</span>
                      <span className="text-zinc-100 font-medium sm:text-right truncate">{String(value)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Right: Telemetry & Execution Log */}
            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 space-y-3 font-mono text-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                  <span className="text-[11px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-zinc-400" />
                    Execution Telemetry & Audit Logs
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Latency: <strong className="text-zinc-200">{simulatedData?.latency}</strong>
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-zinc-400 bg-zinc-900/30 p-2.5 rounded border border-zinc-800/30">
                  {simulatedData?.auditLogs.map((log, i) => (
                    <div key={i} className="text-zinc-300">
                      <span className="text-zinc-400">{log.split(" ")[0]}</span>{" "}
                      <span>{log.substring(log.indexOf(" ") + 1)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Confidence: <strong className="text-emerald-400">{simulatedData?.confidence}</strong></span>
                <span>Deterministic: <strong>True</strong></span>
              </div>
            </div>
          </div>

          {/* 4. Contextual Mini-CTA directly beneath the output */}
          <div className="p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-200">
              <Sparkles className="h-4 w-4 text-white shrink-0" />
              <span>{currentScenario.miniCta.text}</span>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => setFeasibilityModalOpen(true)}
              className="w-full sm:w-auto text-xs gap-1.5 shrink-0"
            >
              {currentScenario.miniCta.actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
