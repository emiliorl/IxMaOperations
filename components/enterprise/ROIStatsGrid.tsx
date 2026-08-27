import React from "react";
import { Card } from "@/components/ui/Card";

export function ROIStatsGrid() {
  const stats = [
    {
      metric: "98.5%",
      label: "Reduction in Manual Data Entry",
      desc: "Instant parsing of invoices, receipts, and logistics docs straight into your ERP and accounting systems.",
    },
    {
      metric: "10x",
      label: "Faster Data Collection",
      desc: "Automated stealth scrapers crawling competitor pricing and catalog catalogs on daily automated crons.",
    },
    {
      metric: "70%+",
      label: "Support Ticket Deflection",
      desc: "Internal AI knowledge agents resolving routine customer inquiries with verified document citations.",
    },
    {
      metric: "$0",
      label: "Recurring Per-Seat SaaS Taxes",
      desc: "You own 100% of the custom source code and infrastructure with no monthly user licensing fees.",
    },
  ];

  return (
    <section className="py-14 border-b border-zinc-800 bg-zinc-950">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="max-w-xl mb-8 space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Documented Operational Impact
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Measurable benchmarks delivered across automated document workflows, market intelligence, and custom software.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item, idx) => (
            <Card key={idx} className="p-5 space-y-2 bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 transition-all">
              <div className="text-2xl sm:text-3xl font-semibold font-mono tracking-tight text-white">
                {item.metric}
              </div>
              <div className="text-xs font-medium text-zinc-200">{item.label}</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

