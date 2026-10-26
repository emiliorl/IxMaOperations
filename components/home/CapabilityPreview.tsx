"use client";

/**
 * components/home/CapabilityPreview.tsx
 *
 * Each capability card's media slot on the homepage. Design revamp
 * (Milestone 2): replaces the abstract three-circle "looping dot" sketch with
 * a small, static-looking snapshot of the artifact each pipeline actually
 * produces — a scraper log, an OCR bounding box, a JSON dispatch, and so on.
 *
 * These are illustrative samples, not live output, and the frame says so
 * (`sampleLabel`). The real, working demo for a capability lives at its
 * package detail page (`app/[locale]/packages/[slug]/page.tsx`), reached via
 * the card's link. The sample text below is intentionally literal
 * (log lines, JSON keys, field names) the way it would appear in a terminal,
 * so it is not run through next-intl.
 *
 * STANDARDS.md: zinc palette, 1px hairlines, emerald/amber only as
 * functional status colors, no glows or gradients. Motion is limited to a
 * blinking caret and a thin scan line, and is disabled under
 * `prefers-reduced-motion`.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

interface CapabilityPreviewProps {
  /** `packageSlug` of the capability this card represents. */
  slug: string;
  /** Translated "Sample output" tag shown in the frame's title bar. */
  sampleLabel: string;
  className?: string;
}

const FILENAMES: Record<string, string> = {
  "lead-scraper-enrichment": "scrape_worker.py",
  "invoice-ocr-pipeline": "ocr_extract.py",
  "content-repurposing": "repurpose.py",
  "data-qa-audit": "audit_report.py",
  "api-workflow-integration": "webhook_router.py",
  "custom-vision-model": "detect.onnx",
};

export function CapabilityPreview({ slug, sampleLabel, className }: CapabilityPreviewProps) {
  const Body = BODIES[slug];

  return (
    <div
      className={cn(
        "flex flex-col rounded-md border border-zinc-800 bg-[#0b0b0e] overflow-hidden aspect-video",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/70 px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
          </span>
          <span className="truncate font-mono text-[10px] text-zinc-500">{FILENAMES[slug]}</span>
        </div>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
          {sampleLabel}
        </span>
      </div>
      <div className="relative flex-1 min-h-0 p-3 font-mono text-[10px] leading-[1.55] text-zinc-400">
        {Body ? <Body /> : null}
      </div>
    </div>
  );
}

const Caret = () => (
  <span className="ml-0.5 inline-block h-[11px] w-[5px] translate-y-[2px] bg-zinc-400 animate-blink motion-safe-anim" />
);

function ScraperPreview() {
  return (
    <div className="space-y-0.5 whitespace-nowrap">
      <div>
        <span className="text-zinc-600">$</span> <span className="text-zinc-200">ixma run scrape --target=docs</span>
      </div>
      <div>
        <span className="text-emerald-400">[200 OK]</span> GET /catalog?page=3 <span className="text-zinc-600">124ms</span>
      </div>
      <div>
        <span className="text-zinc-500">[proxy]</span> rotated 4/12 · retry 0
      </div>
      <div>
        <span className="text-zinc-500">[parse]</span> sku=<span className="text-zinc-200">A-1042</span> stock=<span className="text-zinc-200">38</span>
      </div>
      <div>
        <span className="text-emerald-400">✓</span> <span className="text-zinc-200">148 records</span> → leads.csv
        <Caret />
      </div>
    </div>
  );
}

function OcrPreview() {
  return (
    <div className="grid h-full grid-cols-[1fr_1.1fr] gap-3">
      <div className="relative rounded-sm border border-zinc-800 bg-zinc-950 px-2 py-2">
        <div className="space-y-1.5">
          <div className="h-1 w-2/3 rounded-sm bg-zinc-700" />
          <div className="h-1 w-full rounded-sm bg-zinc-800" />
          <div className="h-1 w-5/6 rounded-sm bg-zinc-800" />
          <div className="h-1 w-full rounded-sm bg-zinc-800" />
        </div>
        <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between rounded-[2px] border border-amber-500 px-1 py-[3px]">
          <span className="absolute -top-[7px] left-[-1px] bg-amber-500 px-1 text-[8px] font-semibold leading-[10px] text-zinc-950">
            total 99.1%
          </span>
          <span className="text-zinc-300">TOTAL</span>
          <span className="text-zinc-100">42.18</span>
        </div>
      </div>
      <div className="space-y-1 self-center whitespace-nowrap">
        <div className="text-zinc-600">{"{"}</div>
        <div className="pl-2">
          <span className="text-zinc-500">&quot;vendor&quot;:</span> <span className="text-zinc-200">&quot;Grano&quot;</span>
        </div>
        <div className="pl-2">
          <span className="text-zinc-500">&quot;date&quot;:</span> <span className="text-zinc-200">&quot;2026-08-14&quot;</span>
        </div>
        <div className="pl-2">
          <span className="text-zinc-500">&quot;total&quot;:</span> <span className="text-amber-400">42.18</span>
        </div>
        <div className="text-zinc-600">{"}"}</div>
      </div>
    </div>
  );
}

function ContentPreview() {
  return (
    <div className="grid h-full grid-cols-[1fr_auto_1.2fr] items-center gap-2">
      <div className="space-y-1.5 rounded-sm border border-dashed border-zinc-700 px-2 py-2">
        <div className="text-[8px] uppercase tracking-wider text-zinc-600">transcript.txt</div>
        <div className="h-1 w-full rounded-sm bg-zinc-800" />
        <div className="h-1 w-5/6 rounded-sm bg-zinc-800" />
        <div className="h-1 w-full rounded-sm bg-zinc-800" />
        <div className="h-1 w-2/3 rounded-sm bg-zinc-800" />
        <div className="text-zinc-600">42 min</div>
      </div>
      <span className="text-zinc-600">→</span>
      <div className="space-y-1.5">
        <div className="rounded-sm border border-zinc-700 bg-zinc-900 px-2 py-1">
          <div className="flex justify-between text-[8px] uppercase tracking-wider text-zinc-500">
            <span>thread</span>
            <span>1/6</span>
          </div>
          <div className="mt-1 h-1 w-full rounded-sm bg-zinc-700" />
          <div className="mt-1 h-1 w-3/4 rounded-sm bg-zinc-800" />
        </div>
        <div className="rounded-sm border border-zinc-700 bg-zinc-900 px-2 py-1">
          <div className="flex justify-between text-[8px] uppercase tracking-wider text-zinc-500">
            <span>post</span>
            <span>212 ch</span>
          </div>
          <div className="mt-1 h-1 w-5/6 rounded-sm bg-zinc-700" />
        </div>
      </div>
    </div>
  );
}

function AuditPreview() {
  return (
    <div className="grid h-full grid-cols-[auto_1fr] gap-3">
      <div className="flex flex-col justify-center rounded-sm border border-emerald-900/60 bg-emerald-950/20 px-3">
        <div className="text-xl font-semibold leading-none text-emerald-400">98.4%</div>
        <div className="mt-1 text-[8px] uppercase tracking-wider text-zinc-500">clean</div>
      </div>
      <div className="space-y-1 self-center whitespace-nowrap">
        <div className="text-zinc-600">name</div>
        <div className="text-red-400/90">− &quot;ACME inc.&quot;</div>
        <div className="text-emerald-400">+ &quot;Acme, Inc.&quot;</div>
        <div className="text-zinc-600">date</div>
        <div className="text-red-400/90">− 2024/3/5</div>
        <div className="text-emerald-400">+ 2024-03-05</div>
      </div>
    </div>
  );
}

function IntegrationPreview() {
  return (
    <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="space-y-0.5 whitespace-nowrap rounded-sm border border-zinc-800 bg-zinc-950 px-2 py-1.5">
        <div className="text-[8px] uppercase tracking-wider text-zinc-600">POST /hook</div>
        <div>
          <span className="text-zinc-500">event:</span> <span className="text-zinc-200">order.paid</span>
        </div>
        <div>
          <span className="text-zinc-500">id:</span> <span className="text-zinc-200">4821</span>
        </div>
        <div>
          <span className="text-zinc-500">sku:</span> <span className="text-zinc-200">A-1042</span>
        </div>
      </div>
      <span className="text-zinc-600">→</span>
      <div className="space-y-1.5 whitespace-nowrap">
        <div className="rounded-sm border border-zinc-700 bg-zinc-900 px-2 py-1">
          <span className="text-emerald-400">●</span> INSERT orders
        </div>
        <div className="rounded-sm border border-zinc-700 bg-zinc-900 px-2 py-1">
          <span className="text-emerald-400">●</span> slack #ops
        </div>
      </div>
    </div>
  );
}

function VisionPreview() {
  return (
    <div className="relative h-full overflow-hidden rounded-sm border border-zinc-800 bg-zinc-950">
      <div className="absolute inset-0 blueprint-grid opacity-60" />
      <div className="absolute left-[14%] top-[24%] h-[46%] w-[52%] border border-emerald-500">
        <span className="absolute -top-[11px] -left-px whitespace-nowrap bg-emerald-500 px-1 text-[8px] font-semibold leading-[11px] text-zinc-950">
          defect: scratch 98.4%
        </span>
      </div>
      <div className="absolute right-[10%] top-[52%] h-[26%] w-[16%] border border-amber-500">
        <span className="absolute -top-[11px] -left-px whitespace-nowrap bg-amber-500 px-1 text-[8px] font-semibold leading-[11px] text-zinc-950">
          dent 71%
        </span>
      </div>
      <span className="absolute inset-y-0 w-px bg-zinc-500/50 animate-scan-x motion-safe-anim" />
      <div className="absolute inset-x-0 bottom-0 flex justify-between border-t border-zinc-800 bg-zinc-950/90 px-2 py-0.5 text-[9px] text-zinc-500">
        <span>14ms · onnx</span>
        <span>box [212, 88, 164, 96]</span>
      </div>
    </div>
  );
}

const BODIES: Record<string, () => React.JSX.Element> = {
  "lead-scraper-enrichment": ScraperPreview,
  "invoice-ocr-pipeline": OcrPreview,
  "content-repurposing": ContentPreview,
  "data-qa-audit": AuditPreview,
  "api-workflow-integration": IntegrationPreview,
  "custom-vision-model": VisionPreview,
};
