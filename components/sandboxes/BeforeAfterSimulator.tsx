"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  FileVideo,
  Users,
  FolderCheck,
  Receipt,
  Inbox,
  CheckCircle2,
  XCircle,
  Play,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Database,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  category: string;
  icon: LucideIcon;
  tagline: string;
  before: {
    title: string;
    metrics: { time: string; effort: string };
    painPoints: string[];
  };
  after: {
    title: string;
    metrics: { time: string; effort: string };
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

/**
 * Before/after scenarios — one per offer in lib/services.ts (slugs match).
 * Recopied from the v1 enterprise simulator: same tabs + simulate mechanic,
 * content fully rewritten for solo-operator/creator offers — no leftover
 * industrial jargon (Task 9.4 / PROJECT_BLUEPRINT.md Section 5).
 */
const SCENARIOS: Scenario[] = [
  {
    id: "content-engine",
    title: "1-Click Content Engine",
    category: "Content",
    icon: FileVideo,
    tagline: "One raw video in, a batch of platform-ready posts out.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "10-12 hrs/week", effort: "Transcribe, rewrite, reformat by hand" },
      painPoints: [
        "Transcribing a raw video or recording by hand before you can do anything else with it.",
        "Rewriting the same idea five different ways for X, LinkedIn, Instagram, and your newsletter.",
        "Posting falls behind because reformatting takes longer than making the original content.",
      ],
    },
    after: {
      title: "Automated",
      metrics: { time: "Same-day turnaround", effort: "Review and post" },
      advantages: [
        "One video is transcribed and broken into key ideas automatically.",
        "Each idea becomes a platform-ready draft — thread, carousel outline, caption, newsletter blurb.",
        "You review a batch of drafts instead of writing every version from scratch.",
      ],
    },
    simulator: {
      promptLabel: "Select a sample raw video",
      sampleInputs: [
        "12-min talking-head video — \"3 mistakes new freelancers make\"",
        "Screen-recorded product walkthrough (8 min)",
        "Podcast episode clip (22 min)",
      ],
      actionLabel: "Generate Post Batch",
      defaultOutput: {
        status: "DRAFTS READY",
        latency: "Same day",
        confidence: "5 platforms covered",
        extractedData: {
          "Source": "12-min talking-head video",
          "X Thread": "7-tweet thread drafted",
          "LinkedIn Post": "1 long-form post drafted",
          "IG Carousel": "6-slide outline drafted",
          "Newsletter Blurb": "1 paragraph drafted",
        },
        auditLogs: [
          "[Step 1] Video transcribed",
          "[Step 2] Key ideas identified (3 found)",
          "[Step 3] Drafts generated for each platform",
          "[Step 4] Batch delivered for review",
        ],
      },
    },
    miniCta: {
      text: "Posting less than you'd like because reformatting eats the week?",
      actionLabel: "Book a Call",
    },
  },
  {
    id: "lead-intelligence",
    title: "Automated Lead Intelligence",
    category: "Sales",
    icon: Users,
    tagline: "A list of prospects in, enriched leads with a drafted opener out.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "8-15 hrs/week", effort: "Visit, copy, write by hand" },
      painPoints: [
        "Visiting each prospect's profile one at a time to find the details worth mentioning.",
        "Copying names, roles, and company details into a spreadsheet by hand.",
        "Writing a cold email from scratch for every single lead.",
      ],
    },
    after: {
      title: "Automated",
      metrics: { time: "Minutes for a full list", effort: "Review and send" },
      advantages: [
        "You hand over a list of target profiles or a search criteria.",
        "Each one is visited and the relevant details are pulled automatically.",
        "A personalized opening line is drafted for outreach — you just review and send.",
      ],
    },
    simulator: {
      promptLabel: "Select a sample prospect list",
      sampleInputs: [
        "50 marketing agency owners (LinkedIn search export)",
        "120 Shopify store owners in the same niche",
        "30 warm referrals from a past client list",
      ],
      actionLabel: "Enrich Lead List",
      defaultOutput: {
        status: "LIST ENRICHED",
        latency: "Ready in minutes",
        confidence: "50 of 50 leads enriched",
        extractedData: {
          "Lead": "Jordan M. — Founder, Marketing Agency",
          "Company Size": "8-15 employees",
          "Recent Activity": "Posted about hiring a VA last week",
          "Drafted Opener": "\"Saw you're growing the team — curious if...\"",
        },
        auditLogs: [
          "[Step 1] Profile list received (50 leads)",
          "[Step 2] Each profile visited and enriched",
          "[Step 3] Context pulled — company, role, recent activity",
          "[Step 4] Opening line drafted per lead",
        ],
      },
    },
    miniCta: {
      text: "Still copy-pasting prospect data into a spreadsheet?",
      actionLabel: "Book a Call",
    },
  },
  {
    id: "client-onboarding",
    title: "Zero-Touch Client Onboarding",
    category: "Operations",
    icon: FolderCheck,
    tagline: "A client pays, their whole project setup happens without you touching it.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "6-10 hrs/week", effort: "Emails, folders, boards by hand" },
      painPoints: [
        "Emailing back and forth to collect assets before work can even start.",
        "Creating a Drive folder and a project board by hand, one client at a time.",
        "Sending the first invoice manually and hoping nothing was missed.",
      ],
    },
    after: {
      title: "Automated",
      metrics: { time: "Instant", effort: "Start the work" },
      advantages: [
        "A project folder and task board are created automatically the moment a client pays or signs.",
        "A welcome email goes out with next steps and any forms they need to fill in.",
        "You start already organized — no manual setup per client.",
      ],
    },
    simulator: {
      promptLabel: "Select a trigger event",
      sampleInputs: [
        "New client signs a proposal",
        "Deposit invoice paid via Stripe",
        "Contract countersigned in DocuSign",
      ],
      actionLabel: "Run Onboarding Flow",
      defaultOutput: {
        status: "CLIENT ONBOARDED",
        latency: "Instant",
        confidence: "3 of 3 steps completed",
        extractedData: {
          "Client": "Riverstone Consulting",
          "Drive Folder": "Created — \"Riverstone Consulting / 2026\"",
          "Project Board": "Created with starter task list",
          "Welcome Email": "Sent with intake form link",
        },
        auditLogs: [
          "[Step 1] Payment/signature event received",
          "[Step 2] Project folder and board created",
          "[Step 3] Welcome email sent with next steps",
        ],
      },
    },
    miniCta: {
      text: "Setting up every new client by hand, one email at a time?",
      actionLabel: "Book a Call",
    },
  },
  {
    id: "visual-asset-vault",
    title: "AI Visual Asset Vault",
    category: "Finance",
    icon: Receipt,
    tagline: "A shoebox of receipts and screenshots becomes a searchable expense log.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "5-8 hrs/week", effort: "Retype every receipt by hand" },
      painPoints: [
        "Renaming and sorting receipt photos and screenshots one at a time.",
        "Retyping vendor, amount, and date into a spreadsheet for every purchase.",
        "No way to search past expenses without scrolling through months of rows.",
      ],
    },
    after: {
      title: "Automated",
      metrics: { time: "Seconds per receipt", effort: "Upload and search" },
      advantages: [
        "You upload a photo or screenshot of a receipt or invoice.",
        "It's automatically cleaned up, read, and logged — vendor, amount, date, category.",
        "Everything becomes searchable: ask for \"all software expenses in June\" and get an answer.",
      ],
    },
    simulator: {
      promptLabel: "Select a sample receipt",
      sampleInputs: [
        "Coffee shop receipt (photo)",
        "Software subscription email receipt (screenshot)",
        "Freelance contractor invoice (PDF)",
      ],
      actionLabel: "Extract Line Items",
      defaultOutput: {
        status: "LOGGED & SEARCHABLE",
        latency: "Seconds",
        confidence: "4 fields extracted",
        extractedData: {
          "Vendor": "Notion Labs, Inc.",
          "Amount": "$10.00",
          "Date": "Aug 14, 2026",
          "Category": "Software",
        },
        auditLogs: [
          "[Step 1] Image received and cleaned up",
          "[Step 2] Text read from image",
          "[Step 3] Vendor, amount, date, category extracted",
          "[Step 4] Logged and indexed for search",
        ],
      },
    },
    miniCta: {
      text: "Still retyping receipts into a spreadsheet by hand?",
      actionLabel: "Book a Call",
    },
  },
  {
    id: "inbox-copilot",
    title: "AI Inbox Copilot",
    category: "Support",
    icon: Inbox,
    tagline: "A cluttered inbox becomes a triaged view with the real leads surfaced.",
    before: {
      title: "The Old Manual Way",
      metrics: { time: "5-10 hrs/week", effort: "Read and sort everything by hand" },
      painPoints: [
        "Sifting through email, DMs, and comments to find what actually matters.",
        "Answering the same handful of FAQs over and over, every day.",
        "Real leads get buried in the noise and sometimes missed entirely.",
      ],
    },
    after: {
      title: "Automated",
      metrics: { time: "Real-time", effort: "Check one daily digest" },
      advantages: [
        "Your inbox, DMs, and comments feed into one place.",
        "Messages are automatically sorted — spam, FAQ, or real lead.",
        "Common questions get an instant, on-brand auto-reply; a daily digest flags what needs you.",
      ],
    },
    simulator: {
      promptLabel: "Select a sample inbound message",
      sampleInputs: [
        "\"Do you offer payment plans?\" (Instagram DM)",
        "\"Can we hop on a call this week?\" (Email)",
        "Spam comment on a recent post",
      ],
      actionLabel: "Triage Message",
      defaultOutput: {
        status: "TRIAGED",
        latency: "Real-time",
        confidence: "Classified: Real Lead",
        extractedData: {
          "Channel": "Email",
          "Classification": "Real Lead — wants a call",
          "Action Taken": "Added to daily digest for follow-up",
          "Auto-Reply": "Not sent — flagged for a human reply",
        },
        auditLogs: [
          "[Step 1] Message received across email/DM/comments",
          "[Step 2] Classified — spam, FAQ, or real lead",
          "[Step 3] FAQ auto-replied, or flagged for the daily digest",
        ],
      },
    },
    miniCta: {
      text: "Worried a real lead is buried in your inbox right now?",
      actionLabel: "Book a Call",
    },
  },
];

export function BeforeAfterSimulator() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SCENARIOS[0].id);
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
        <div className="max-w-2xl mb-10 space-y-2">
          <Badge variant="default" className="mb-1 text-[11px] font-mono">
            Practical Examples
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
            See the Difference: Manual vs. Automated
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
            Click through each offer below to see the manual grind it replaces and a sample of what the
            automated version looks like.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-8">
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
                  <span className="text-[10px] font-mono text-zinc-500">{scenario.category}</span>
                </div>
                <div>
                  <div className="text-xs font-semibold leading-snug">{scenario.title}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mb-6 p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[11px] font-mono uppercase text-zinc-400">{currentScenario.category}</span>
            <div className="text-base sm:text-lg font-semibold text-white">{currentScenario.title}</div>
            <p className="text-xs sm:text-sm text-zinc-400">{currentScenario.tagline}</p>
          </div>
          <Link
            href={`/services/${currentScenario.id}`}
            className={buttonVariants({ size: "sm", variant: "secondary", className: "text-xs shrink-0 self-start sm:self-center" })}
          >
            See Full Offer Details
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-red-950/40 bg-gradient-to-b from-red-950/10 to-zinc-950/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-mono uppercase text-red-300 font-semibold tracking-wider">
                  The Old Manual Way
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80 text-center font-mono">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Time Spent</div>
                <div className="text-xs font-semibold text-red-300">{currentScenario.before.metrics.time}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Effort</div>
                <div className="text-xs font-semibold text-red-300">{currentScenario.before.metrics.effort}</div>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-zinc-400 pt-1">
              {currentScenario.before.painPoints.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-400 font-bold shrink-0">✕</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="border-emerald-950/40 bg-gradient-to-b from-emerald-950/10 to-zinc-950/80 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-mono uppercase text-emerald-300 font-semibold tracking-wider">
                  Automated
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80 text-center font-mono">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Time Spent</div>
                <div className="text-xs font-semibold text-emerald-300">{currentScenario.after.metrics.time}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Effort</div>
                <div className="text-xs font-semibold text-emerald-300">{currentScenario.after.metrics.effort}</div>
              </div>
            </div>

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

        <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-zinc-300" />
                <h3 className="text-sm sm:text-base font-semibold text-white">
                  Try a Sample Run
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pick a sample input and see what the automated output looks like.
              </p>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className={buttonVariants({ className: "gap-2 shrink-0 justify-center" })}
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  {currentScenario.simulator.actionLabel}
                </>
              )}
            </button>
          </div>

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                <span className="text-[11px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-zinc-400" />
                  Sample Output
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

            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 space-y-3 font-mono text-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                  <span className="text-[11px] font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-zinc-400" />
                    What Happened
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Turnaround: <strong className="text-zinc-200">{simulatedData?.latency}</strong>
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-zinc-400 bg-zinc-900/30 p-2.5 rounded border border-zinc-800/30">
                  {simulatedData?.auditLogs.map((log, i) => (
                    <div key={i} className="text-zinc-300">
                      {log}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Result: <strong className="text-emerald-400">{simulatedData?.confidence}</strong></span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-700/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-200">
              <Sparkles className="h-4 w-4 text-white shrink-0" />
              <span>{currentScenario.miniCta.text}</span>
            </div>
            <Link
              href="/contact"
              className={buttonVariants({ size: "sm", variant: "default", className: "w-full sm:w-auto text-xs gap-1.5 shrink-0" })}
            >
              {currentScenario.miniCta.actionLabel}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </section>
  );
}
