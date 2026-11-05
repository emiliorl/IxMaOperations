"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, FileText, Sparkles } from "lucide-react";
import { tokenizePromptLine } from "@/lib/portal/markdown-blocks";
import { cn } from "@/lib/utils";

const FIELD_LABEL_RE = /^(\s*(?:[-•]|\d+\.)?\s*[^:]{2,48}:)(\s+.*)?$/;
const HEADING_RE = /^\s*#{1,4}\s+(.+)$/;
const SUBHEADING_RE = /^\s*([A-Z]\.\s+[^:]+:)\s*$/;
const BULLET_RE = /^\s*[-*•]\s+(.+)$/;
const NUMBERED_RE = /^\s*(\d+)\.\s+(.+)$/;
const TABLE_ROW_RE = /^\s*\|(.+)\|\s*$/;
const TABLE_DIVIDER_RE = /^\s*\|(?:\s*[-:]+[-| :]*)\|?\s*$/;

function renderPromptLine(line: string, lineIndex: number) {
  if (line.trim() === "") {
    return <div key={lineIndex} className="h-2.5" aria-hidden />;
  }

  const renderTokens = (text: string) =>
    tokenizePromptLine(text).map((token, idx) => {
      if (token.kind === "placeholder") {
        const upper = token.value.toUpperCase();
        let colorClass = "border-amber-500/35 bg-amber-500/10 text-amber-200";
        if (upper.includes("DEFECTO") || upper.includes("ERROR") || upper.includes("CRITICO")) {
          colorClass = "border-rose-500/40 bg-rose-500/15 text-rose-300 font-semibold";
        } else if (upper.includes("VERIFICAR") || upper.includes("ALERTA") || upper.includes("WARNING")) {
          colorClass = "border-amber-500/40 bg-amber-500/15 text-amber-300 font-semibold";
        } else if (upper.includes("INFO") || upper.includes("NOTA")) {
          colorClass = "border-sky-500/40 bg-sky-500/15 text-sky-300 font-semibold";
        }
        return (
          <span
            key={idx}
            className={cn("mx-0.5 inline-block rounded-md border px-1.5 py-0.5 text-xs font-medium", colorClass)}
          >
            {token.value}
          </span>
        );
      }
      return <span key={idx}>{token.value}</span>;
    });

  // 1. Heading inside prompt (e.g. ### CRITERIOS DE CLASIFICACIÓN)
  const headingMatch = HEADING_RE.exec(line);
  if (headingMatch) {
    return (
      <div key={lineIndex} className="mt-4 mb-2 flex items-center gap-2 border-b border-zinc-800/80 pb-1.5 first:mt-1">
        <span className="text-xs font-semibold tracking-wider text-amber-300/90 uppercase">
          {headingMatch[1].trim()}
        </span>
      </div>
    );
  }

  // 2. Sub-headings (e.g. C. Cotas y Cadenas de Medida:)
  const subHeadingMatch = SUBHEADING_RE.exec(line);
  if (subHeadingMatch) {
    return (
      <p key={lineIndex} className="mt-3.5 mb-1 text-xs font-semibold tracking-wide text-zinc-100">
        {subHeadingMatch[1].trim()}
      </p>
    );
  }

  // 3. Table divider (e.g. |---|---|)
  if (TABLE_DIVIDER_RE.test(line)) {
    return <div key={lineIndex} className="my-1 border-t border-zinc-800/60" aria-hidden />;
  }

  // 4. Table row (e.g. | # | Severidad | Elemento / Clase | ...)
  const tableMatch = TABLE_ROW_RE.exec(line);
  if (tableMatch) {
    const rawCells = tableMatch[1].split("|").map((c) => c.trim()).filter((c) => c.length > 0 && !/^[-:]+$/.test(c));
    if (rawCells.length > 0) {
      return (
        <div key={lineIndex} className="my-2 overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2 sm:p-2.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Columnas:
            </span>
            {rawCells.map((col, cIdx) => (
              <span
                key={cIdx}
                className="rounded border border-zinc-800 bg-zinc-900/90 px-2 py-0.5 font-mono text-[11px] text-zinc-300"
              >
                {col}
              </span>
            ))}
          </div>
        </div>
      );
    }
  }

  // 5. Bullet list item (e.g. - Saltos de correlatividad...)
  const bulletMatch = BULLET_RE.exec(line);
  if (bulletMatch) {
    return (
      <div key={lineIndex} className="my-1 flex items-start gap-2.5 pl-1 text-sm sm:text-[15px] leading-relaxed text-zinc-200">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" aria-hidden />
        <div className="min-w-0 flex-1">{renderTokens(bulletMatch[1])}</div>
      </div>
    );
  }

  // 6. Numbered list item (e.g. 1. Resumen Ejecutivo...)
  const numberedMatch = NUMBERED_RE.exec(line);
  if (numberedMatch) {
    return (
      <div key={lineIndex} className="my-1 flex items-start gap-2.5 pl-1 text-sm sm:text-[15px] leading-relaxed text-zinc-200">
        <span className="mt-0.5 min-w-[1.2rem] shrink-0 font-mono text-xs font-semibold text-zinc-400">
          {numberedMatch[1]}.
        </span>
        <div className="min-w-0 flex-1">{renderTokens(numberedMatch[2])}</div>
      </div>
    );
  }

  // 7. Field label (e.g. Disciplina: [Acabados...])
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
