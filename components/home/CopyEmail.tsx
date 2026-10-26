"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Copyable direct-contact line used in the hero (design revamp, Milestone 4).
 * The address is also a real `mailto:` link, so the copy button is a
 * convenience — it degrades to a plain link if the clipboard API is blocked.
 */
export function CopyEmail({
  email,
  copyLabel,
  copiedLabel,
  className,
}: {
  email: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (insecure context / denied) — the mailto link still works.
    }
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs",
        className
      )}
    >
      <a href={`mailto:${email}`} className="min-w-0 truncate text-zinc-300 hover:text-white transition-colors">
        <span className="text-zinc-600">$ mail </span>
        {email}
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 text-zinc-500 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 rounded"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
      </button>
    </div>
  );
}
