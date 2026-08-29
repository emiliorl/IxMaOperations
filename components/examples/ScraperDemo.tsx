"use client";

/**
 * components/examples/ScraperDemo.tsx
 *
 * Phase 1 of CAPABILITY_DEMOS_PLAN.md — interactive input + live data
 * renderer for the "Scraping & Enrichment" capability card
 * (components/home/ExamplesSection.tsx). A visitor types any public URL (or
 * picks a sample), the real POST /api/examples/scrape pipeline runs, and
 * the result renders as a structured summary or the raw JSON payload.
 *
 * No simulated backend — every render here reflects an actual fetch of the
 * visitor's chosen URL through lib/scraper-engine.ts (STANDARDS.md /
 * PROJECT_BLUEPRINT.md Section 8 Rule 2: no faked demo data).
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Search, Copy, Check, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";
import type { ScrapeResult } from "@/lib/scraper-engine";

const SAMPLE_URLS: Array<{ label: string; url: string }> = [
  { label: "Stripe", url: "https://stripe.com" },
  { label: "Linear", url: "https://linear.app" },
  { label: "Vercel", url: "https://vercel.com" },
];

interface ApiSuccess {
  ok: true;
  data: ScrapeResult;
  elapsedMs: number;
}
interface ApiFailure {
  error: string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Minimal JSON syntax highlighter. Escapes HTML first, then wraps tokens
 *  from the *already-escaped* string in color spans — nothing unescaped
 *  ever reaches dangerouslySetInnerHTML. */
function highlightJson(json: string): string {
  const escaped = escapeHtml(json);
  return escaped.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-sky-400"; // number
      if (match.startsWith("&quot;") || match.startsWith('"')) {
        cls = /:\s*$/.test(match) ? "text-violet-400" : "text-emerald-400"; // key vs. string value
      } else if (match === "true" || match === "false") {
        cls = "text-amber-400";
      } else if (match === "null") {
        cls = "text-zinc-500";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="text-xs text-zinc-300 mt-0.5 break-words leading-relaxed">{value}</dd>
    </div>
  );
}

/** Leads come back either as an email or a bare/full social URL — normalize to a clickable href. */
function hrefFor(item: string): string {
  if (item.includes("@") && !item.startsWith("http")) return `mailto:${item}`;
  if (item.startsWith("http")) return item;
  return `https://${item}`;
}

function ChipRow({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-zinc-600 italic">{empty}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <a
          key={item}
          href={hrefFor(item)}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-0.5 text-[11px] font-mono text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors truncate max-w-[220px]"
        >
          {item}
        </a>
      ))}
    </div>
  );
}

export function ScraperDemo() {
  const t = useTranslations("Examples.scraper");

  const [urlInput, setUrlInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [result, setResult] = React.useState<ScrapeResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const startRef = React.useRef<number>(0);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startRef.current), 47);
    return () => clearInterval(id);
  }, [loading]);

  const runScrape = React.useCallback(async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUrlInput(trimmed);
    setError(null);
    setResult(null);
    setLoading(true);
    startRef.current = Date.now();
    setElapsedMs(0);

    try {
      const res = await fetch("/api/examples/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
        signal: controller.signal,
      });
      const json = (await res.json()) as ApiSuccess | ApiFailure;
      if (!res.ok || !("ok" in json)) {
        setError((json as ApiFailure).error || t("errorPrefix"));
      } else {
        setResult(json.data);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(t("errorPrefix"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runScrape(urlInput);
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (permissions, insecure context) — silently ignore.
    }
  };

  const rawJson = result ? JSON.stringify(result, null, 2) : "";
  const jsonLdTypes = (result?.jsonLd ?? [])
    .map((entry) => (entry && typeof entry === "object" && "@type" in entry ? String((entry as Record<string, unknown>)["@type"]) : null))
    .filter((v): v is string => Boolean(v));

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={t("inputPlaceholder")}
            className="pl-9 border-zinc-800 bg-zinc-950 focus-visible:ring-zinc-500"
            inputMode="url"
            aria-label={t("inputLabel")}
          />
        </div>
        <Button type="submit" disabled={loading || !urlInput.trim()} className="shrink-0">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("submitLoading")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-zinc-500">{t("samplesLabel")}</span>
        {SAMPLE_URLS.map((sample) => (
          <button
            key={sample.url}
            type="button"
            onClick={() => void runScrape(sample.url)}
            disabled={loading}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors disabled:opacity-50"
          >
            {sample.label}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-950 min-h-[220px]">
        {!loading && !result && !error && (
          <div className="flex items-center justify-center min-h-[220px] p-8 text-center">
            <p className="text-xs text-zinc-600 max-w-sm leading-relaxed">{t("emptyState")}</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[220px] gap-3 p-8">
            <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
            <p className="text-xs font-mono text-zinc-500 truncate max-w-full">{urlInput}</p>
            <p className="text-[11px] font-mono text-zinc-600">
              {t("elapsedLabel")}: {elapsedMs.toLocaleString()} ms
            </p>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center justify-center min-h-[220px] p-8 text-center">
            <p className="text-xs text-red-400 max-w-sm leading-relaxed">
              {t("errorPrefix")}: {error}
            </p>
          </div>
        )}

        {!loading && result && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
              <a
                href={result.resolvedUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-100 truncate max-w-[280px]"
              >
                {result.resolvedUrl}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
              <span className="flex items-center gap-3 shrink-0">
                <Badge variant={result.httpStatus < 400 ? "active" : "destructive"}>
                  {t("statusLabel")} {result.httpStatus}
                </Badge>
                <span>
                  {t("elapsedLabel")}: {elapsedMs.toLocaleString()} ms
                </span>
              </span>
            </div>

            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">{t("tabSummary")}</TabsTrigger>
                <TabsTrigger value="raw">{t("tabRawJson")}</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-3">
                <section className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                    {t("sectionIdentity")}
                  </h4>
                  <div className="flex gap-3">
                    {result.identity.favicon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={result.identity.favicon}
                        alt=""
                        className="h-8 w-8 rounded border border-zinc-800 bg-zinc-950 shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-w-0">
                      <Field label={t("fieldTitle")} value={result.identity.title} />
                      <Field label={t("fieldCanonical")} value={result.identity.canonicalUrl} />
                      <div className="sm:col-span-2">
                        <Field label={t("fieldDescription")} value={result.identity.description} />
                      </div>
                    </dl>
                  </div>
                </section>

                <section className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                    {t("sectionOpenGraph")}
                  </h4>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label={t("fieldSiteName")} value={result.openGraph.siteName} />
                    <Field label={t("fieldType")} value={result.openGraph.type} />
                    <Field label="twitter:card" value={result.openGraph.twitterCard} />
                  </dl>
                  {!result.openGraph.siteName && !result.openGraph.type && !result.openGraph.twitterCard && (
                    <p className="text-xs text-zinc-600 italic">{t("noneDetected")}</p>
                  )}
                </section>

                <section className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                    {t("sectionJsonLd")}
                  </h4>
                  {jsonLdTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {jsonLdTypes.map((type, i) => (
                        <Badge key={`${type}-${i}`} variant="outline">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">{t("noneDetected")}</p>
                  )}
                </section>

                <section className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                    {t("sectionTechnologies")}
                  </h4>
                  {result.technologies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {result.technologies.map((tech) => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600 italic">{t("noneDetected")}</p>
                  )}
                </section>

                <section className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                    {t("sectionLeads")}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                        {t("leadEmails")}
                      </span>
                      <ChipRow items={result.leads.emails} empty={t("noneFound")} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                        {t("leadTwitter")}
                      </span>
                      <ChipRow items={result.leads.twitter} empty={t("noneFound")} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                        {t("leadLinkedin")}
                      </span>
                      <ChipRow items={result.leads.linkedin} empty={t("noneFound")} />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                        {t("leadGithub")}
                      </span>
                      <ChipRow items={result.leads.github} empty={t("noneFound")} />
                    </div>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="raw">
                <div className="relative">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    className="absolute top-2 right-2 z-10"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copied ? t("copied") : t("copyJson")}
                  </Button>
                  <pre className="rounded-md border border-zinc-800 bg-zinc-950 p-4 pt-12 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-[420px] overflow-y-auto">
                    <code
                      className={cn("whitespace-pre")}
                      dangerouslySetInnerHTML={{ __html: highlightJson(rawJson) }}
                    />
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
