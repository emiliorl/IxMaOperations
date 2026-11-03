"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, FileText, Sparkles } from "lucide-react";
import { tokenizePromptLine } from "@/lib/portal/markdown-blocks";
import { cn } from "@/lib/utils";

const FIELD_LABEL_RE = /^(\s*(?:[-•]|\d+\.)?\s*[^:]{2,48}:)(\s+.*)?$/;

function renderPromptLine(line: string, lineIndex: number) {
  if (line.trim() === "") {
    return <div key={lineIndex} className="h-2.5" aria-hidden />;
  }

  const renderTokens = (text: string) =>
    tokenizePromptLine(text).map((token, idx) =>
      token.kind === "placeholder" ? (
        <span
          key={idx}
          className="mx-0.5 inline-block rounded-md border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-200"
        >
          {token.value}
        </span>
      ) : (
        <span key={idx}>{token.value}</span>
      )
    );

  const labelMatch = FIELD_LABEL_RE.exec(line);
  if (labelMatch) {
    return (
      <p key={lineIndex} className="text-sm sm:text-[15px] leading-relaxed text-zinc-200">
        <strong className="font-semibold text-white">{renderTokens(labelMatch[1])}</strong>
        {labelMatch[2] ? renderTokens(labelMatch[2]) : null}
      </p>
    );
  }

  return (
    <p key={lineIndex} className="text-sm sm:text-[15px] leading-relaxed text-zinc-200">
      {renderTokens(line)}
    </p>
  );
}

export function CodeBlock({
  code,
  variant = "prompt",
  badge,
  wrapLines,
}: {
  code: string;
  variant?: "prompt" | "template" | "code";
  badge: string | null;
  wrapLines: boolean;
}) {
  const t = useTranslations("Portal");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "prompt" || variant === "template") {
    const lines = code.split("\n");
    const isTemplate = variant === "template";
    return (
      <div className="my-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-900/90 px-4 py-2.5">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300">
            {isTemplate ? (
              <FileText className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-300/90" aria-hidden />
            )}
            {isTemplate ? t("templateBadge") : t("promptBadge")}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              copied
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "bg-zinc-100 text-zinc-900 shadow-sm hover:bg-white"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                <span>{t("copied")}</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                <span>{t("copy")}</span>
              </>
            )}
          </button>
        </div>
        <div className="space-y-1.5 px-4 py-4 sm:px-5">
          {lines.map((line, idx) => renderPromptLine(line, idx))}
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-900/60 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          {badge ?? "Code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" aria-hidden />
              <span className="text-emerald-400">{t("copied")}</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-zinc-400" aria-hidden />
              <span>{t("copy")}</span>
            </>
          )}
        </button>
      </div>
      <pre
        className={cn(
          "p-3 font-mono text-xs leading-relaxed text-zinc-300",
          wrapLines ? "whitespace-pre-wrap break-words" : "overflow-x-auto"
        )}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
