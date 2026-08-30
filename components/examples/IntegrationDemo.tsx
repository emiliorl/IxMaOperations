"use client";

/**
 * components/examples/IntegrationDemo.tsx
 *
 * Phase 5 of CAPABILITY_DEMOS_PLAN.md — interactive input + live data
 * renderer for the "Backend Integrations" capability card
 * (components/home/ExamplesSection.tsx). A visitor pastes a webhook JSON
 * payload (or picks a Stripe / Shopify / CRM sample), and
 * lib/workflow-engine.ts runs it through four real pipeline steps —
 * ingestion & schema detection, field mapping & normalization, condition-
 * based routing, and downstream dispatch-payload generation — synchronously
 * in the browser, with real `performance.now()` timings per step.
 *
 * The last step generates the literal SQL insert, Slack Block Kit JSON, and
 * Resend email HTML a production integration would send — it does not
 * actually send them. That's called out explicitly in the UI copy so it
 * isn't mistaken for a live dispatch (STANDARDS.md / PROJECT_BLUEPRINT.md
 * Section 8 Rule 2). No server round-trip: everything re-runs on every
 * keystroke, same architecture as the Content and Data QA demos.
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, CheckCircle2, AlertTriangle, AlertCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  runWorkflow,
  SAMPLE_STRIPE_PAYLOAD,
  SAMPLE_SHOPIFY_PAYLOAD,
  SAMPLE_CRM_PAYLOAD,
  type WorkflowRun,
  type WorkflowStep,
  type StepStatus,
  type WebhookSource,
  type RouteTier,
  type DispatchChannel,
} from "@/lib/workflow-engine";

const STEP_LABEL_KEY: Record<WorkflowStep["key"], string> = {
  ingest: "stepIngest",
  normalize: "stepNormalize",
  route: "stepRoute",
  dispatch: "stepDispatch",
};

const SOURCE_LABEL_KEY: Record<WebhookSource, string> = {
  stripe: "sourceStripe",
  shopify: "sourceShopify",
  crm: "sourceCrm",
  unknown: "sourceUnknown",
};

const TIER_LABEL_KEY: Record<RouteTier, string> = {
  enterprise: "tierEnterprise",
  priority: "tierPriority",
  standard: "tierStandard",
};

const DISPATCH_TAB_KEY: Record<DispatchChannel, string> = {
  sql: "tabSql",
  slack: "tabSlack",
  email: "tabEmail",
};

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
  return <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />;
}

function tierBadgeVariant(tier: RouteTier): "active" | "default" | "secondary" {
  if (tier === "enterprise") return "active";
  if (tier === "priority") return "default";
  return "secondary";
}

export function IntegrationDemo() {
  const t = useTranslations("Examples.integration");

  const [text, setText] = React.useState("");
  const [expandedStep, setExpandedStep] = React.useState<WorkflowStep["key"] | null>(null);
  const [copiedChannel, setCopiedChannel] = React.useState<DispatchChannel | null>(null);

  const run: WorkflowRun | null = React.useMemo(() => (text.trim().length > 0 ? runWorkflow(text) : null), [text]);

  const handleCopy = async (channel: DispatchChannel, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedChannel(channel);
      setTimeout(() => setCopiedChannel((prev) => (prev === channel ? null : prev)), 1500);
    } catch {
      // Clipboard API can be unavailable — silently ignore.
    }
  };

  const stepMessage = (step: WorkflowStep, source: WebhookSource): string => {
    if (step.key === "ingest" && step.messageKey === "ingestOk") {
      return t("step.ingestOk", { source: t(SOURCE_LABEL_KEY[source]) });
    }
    return t(`step.${step.messageKey}`, step.messageValues);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("inputPlaceholder")}
          className="min-h-[160px] border-zinc-800 bg-zinc-950 focus-visible:ring-zinc-500 text-xs font-mono"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-500">{t("samplesLabel")}</span>
          <button
            type="button"
            onClick={() => setText(SAMPLE_STRIPE_PAYLOAD)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
          >
            {t("sampleStripe")}
          </button>
          <button
            type="button"
            onClick={() => setText(SAMPLE_SHOPIFY_PAYLOAD)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
          >
            {t("sampleShopify")}
          </button>
          <button
            type="button"
            onClick={() => setText(SAMPLE_CRM_PAYLOAD)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
          >
            {t("sampleCrm")}
          </button>
        </div>
      </div>

      {!run ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 min-h-[160px] flex items-center justify-center p-8 text-center">
          <p className="text-xs text-zinc-600 max-w-md leading-relaxed">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 sm:p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("sourceLabel")}</span>
              <Badge variant={run.source === "unknown" ? "destructive" : "active"}>{t(SOURCE_LABEL_KEY[run.source])}</Badge>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("totalLatency")}</p>
              <p className="text-xs font-mono text-zinc-300 mt-0.5">{run.totalLatencyMs}ms</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{t("sectionSteps")}</h4>
            <ol className="space-y-2">
              {run.steps.map((step, i) => {
                const isExpanded = expandedStep === step.key;
                return (
                  <li key={step.key} className="rounded-md border border-zinc-800 bg-zinc-900/40">
                    <button
                      type="button"
                      onClick={() => setExpandedStep(isExpanded ? null : step.key)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      <span className="text-[10px] font-mono text-zinc-600 shrink-0">{i + 1}</span>
                      <StatusIcon status={step.status} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-200">{t(STEP_LABEL_KEY[step.key])}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{stepMessage(step, run.source)}</p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600 shrink-0">{step.latencyMs}ms</span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 text-zinc-600 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isExpanded && step.detail !== null && (
                      <pre className="text-[11px] font-mono text-zinc-400 bg-zinc-950 border-t border-zinc-800 p-3 overflow-auto max-h-[220px]">
                        {JSON.stringify(step.detail, null, 2)}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {run.valid && run.route && (
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{t("sectionRoute")}</h4>
              <Badge variant={tierBadgeVariant(run.route.tier)}>{t(TIER_LABEL_KEY[run.route.tier])}</Badge>
            </div>
          )}

          {run.valid && run.dispatches.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{t("sectionDispatch")}</h4>
              <Tabs defaultValue="sql">
                <TabsList>
                  {run.dispatches.map((d) => (
                    <TabsTrigger key={d.channel} value={d.channel}>
                      {t(DISPATCH_TAB_KEY[d.channel])}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {run.dispatches.map((d) => (
                  <TabsContent key={d.channel} value={d.channel} className="space-y-3">
                    <pre className="text-[11px] font-mono text-zinc-300 bg-zinc-900/40 border border-zinc-800 rounded-md p-3 overflow-auto max-h-[280px] whitespace-pre-wrap break-words">
                      {d.content}
                    </pre>
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleCopy(d.channel, d.content)}>
                      {copiedChannel === d.channel ? (
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {copiedChannel === d.channel ? t("copied") : t("copyPayload")}
                    </Button>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
