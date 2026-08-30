"use client";

/**
 * components/examples/AuditDemo.tsx
 *
 * Phase 4 of CAPABILITY_DEMOS_PLAN.md — interactive input + live data
 * renderer for the "Data Auditing" capability card
 * (components/home/ExamplesSection.tsx). A visitor pastes or uploads a
 * dirty CSV/delimited dataset (or loads the built-in sample), and
 * lib/audit-engine.ts runs real validation — email syntax + disposable-
 * domain + typo-correction, E.164 phone normalization, ISO-8601 date
 * parsing, and exact/fuzzy duplicate detection — synchronously in the
 * browser, rolling the result into a 0–100 health score and a field-level
 * diff table.
 *
 * No server round-trip, no simulated backend — every row shown here is the
 * visitor's own pasted/uploaded data (STANDARDS.md / PROJECT_BLUEPRINT.md
 * Section 8 Rule 2). Same architecture as lib/content-engine.ts: pure and
 * synchronous, re-analyzed on every keystroke.
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Upload, Download, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  auditTable,
  buildSampleDirtyCsv,
  reportToCsv,
  type AuditReport,
  type Severity,
  type IssueMessageKey,
} from "@/lib/audit-engine";

interface FlatIssue {
  rowIndex: number;
  field: string;
  severity: Severity;
  messageKey: IssueMessageKey;
  matchesRow?: number;
  rawValue: string;
  correctedValue: string | null;
}

function flattenIssues(report: AuditReport): FlatIssue[] {
  const flat: FlatIssue[] = [];
  for (const row of report.rows) {
    for (const issue of row.issues) {
      const raw = row.original[issue.field] ?? "";
      const corrected = row.corrected[issue.field] ?? "";
      flat.push({
        rowIndex: row.index,
        field: issue.field,
        severity: issue.severity,
        messageKey: issue.messageKey,
        matchesRow: issue.matchesRow,
        rawValue: raw,
        correctedValue: corrected !== raw ? corrected : null,
      });
    }
  }
  return flat;
}

function healthColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function SeverityBadge({ severity, label }: { severity: Severity; label: string }) {
  if (severity === "error") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" /> {label}
      </Badge>
    );
  }
  if (severity === "warning") {
    return (
      <Badge variant="default" className="gap-1 border-amber-900/60 bg-amber-950/40 text-amber-400">
        <AlertTriangle className="h-3 w-3" /> {label}
      </Badge>
    );
  }
  return (
    <Badge variant="active" className="gap-1">
      <CheckCircle2 className="h-3 w-3" /> {label}
    </Badge>
  );
}

export function AuditDemo() {
  const t = useTranslations("Examples.audit");

  const [text, setText] = React.useState("");
  const [fileError, setFileError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const report: AuditReport = React.useMemo(() => auditTable(text), [text]);
  const flatIssues = React.useMemo(() => flattenIssues(report), [report]);
  const hasData = report.totalRows > 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    try {
      setText(await file.text());
      setFileError(null);
    } catch {
      setFileError(t("fileReadError"));
    }
  };

  const handleDownloadCsv = () => {
    const csv = reportToCsv(report);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleaned-dataset.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const severityLabel = (s: Severity) => (s === "error" ? t("severityError") : s === "warning" ? t("severityWarning") : t("severityFixed"));
  const issueMessage = (key: IssueMessageKey, matchesRow?: number) => t(`issue.${key}`, matchesRow ? { row: matchesRow } : undefined);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("inputPlaceholder")}
          className="min-h-[160px] border-zinc-800 bg-zinc-950 focus-visible:ring-zinc-500 text-xs font-mono"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
            >
              <Upload className="h-3 w-3" /> {t("uploadLabel")}
            </button>
            <button
              type="button"
              onClick={() => setText(buildSampleDirtyCsv(50))}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
            >
              {t("loadSample")}
            </button>
          </div>
          {hasData && (
            <span className="text-[11px] font-mono text-zinc-600">{t("rowsLabel", { count: report.totalRows })}</span>
          )}
        </div>
        {fileError && <p className="text-[11px] text-red-400">{fileError}</p>}
      </div>

      {!hasData ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 min-h-[160px] flex items-center justify-center p-8 text-center">
          <p className="text-xs text-zinc-600 max-w-md leading-relaxed">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0">
                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#27272a" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke={healthColor(report.healthScore)}
                    strokeWidth="3"
                    strokeDasharray={`${(report.healthScore / 100) * 97.4} 97.4`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-mono text-zinc-200">
                  {report.healthScore}%
                </span>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("healthScoreLabel")}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{t("healthScoreHint")}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <div>
                <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statErrors")}</dt>
                <dd className="text-sm font-mono text-red-400 mt-0.5">{report.errorCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statWarnings")}</dt>
                <dd className="text-sm font-mono text-amber-400 mt-0.5">{report.warningCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statFixed")}</dt>
                <dd className="text-sm font-mono text-emerald-400 mt-0.5">{report.fixedCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statDuplicates")}</dt>
                <dd className="text-sm font-mono text-zinc-300 mt-0.5">{report.duplicateCount}</dd>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{t("sectionDiff")}</h4>
            {flatIssues.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">{t("noIssues")}</p>
            ) : (
              <div className="rounded-md border border-zinc-800 overflow-auto max-h-[360px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-900 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">{t("colRow")}</th>
                      <th className="text-left font-medium px-3 py-2">{t("colField")}</th>
                      <th className="text-left font-medium px-3 py-2">{t("colSeverity")}</th>
                      <th className="text-left font-medium px-3 py-2">{t("colRaw")}</th>
                      <th className="text-left font-medium px-3 py-2">{t("colCorrected")}</th>
                      <th className="text-left font-medium px-3 py-2">{t("colMessage")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatIssues.map((issue, i) => (
                      <tr key={i} className="border-t border-zinc-800/80 hover:bg-zinc-900/40">
                        <td className="px-3 py-2 font-mono text-zinc-500">{issue.rowIndex + 1}</td>
                        <td className="px-3 py-2 text-zinc-400">{issue.field}</td>
                        <td className="px-3 py-2">
                          <SeverityBadge severity={issue.severity} label={severityLabel(issue.severity)} />
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-400 max-w-[160px] truncate" title={issue.rawValue}>
                          {issue.rawValue || <span className="italic text-zinc-700">{t("emptyValue")}</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-zinc-200 max-w-[160px] truncate" title={issue.correctedValue ?? ""}>
                          {issue.correctedValue ?? <span className="text-zinc-700">—</span>}
                        </td>
                        <td className="px-3 py-2 text-zinc-500">{issueMessage(issue.messageKey, issue.matchesRow)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <Button type="button" variant="secondary" size="sm" onClick={handleDownloadCsv}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {t("downloadCsv")}
          </Button>
        </div>
      )}
    </div>
  );
}
