"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppStore, ScraperLog } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Terminal, Play, Square, Download, ShieldAlert, CheckCircle2, RotateCw } from "lucide-react";

export function ScraperTerminalSandbox() {
  const {
    isScraping,
    setIsScraping,
    scraperLogs,
    addScraperLog,
    clearScraperLogs,
    scraperStats,
    setScraperStats,
  } = useAppStore();

  const [targetUrl, setTargetUrl] = useState("https://ecom-marketplace.com/industrial-sensors");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const startScrapeStream = () => {
    clearScraperLogs();
    setIsScraping(true);

    const eventSource = new EventSource(`/api/sandbox/scrape?url=${encodeURIComponent(targetUrl)}`);

    eventSource.addEventListener("log", (event) => {
      try {
        const logData: ScraperLog = JSON.parse(event.data);
        addScraperLog(logData);
      } catch (e) {
        console.error("Log parse error", e);
      }
    });

    eventSource.addEventListener("stats", (event) => {
      try {
        const stats = JSON.parse(event.data);
        setScraperStats(stats);
      } catch (e) {
        console.error("Stats parse error", e);
      }
    });

    eventSource.addEventListener("done", () => {
      setIsScraping(false);
      eventSource.close();
    });

    eventSource.onerror = () => {
      setIsScraping(false);
      eventSource.close();
    };
  };

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scraperLogs]);

  // Initial trigger if empty
  useEffect(() => {
    if (scraperLogs.length === 0) {
      startScrapeStream();
    }
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Terminal Live Stream View */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        <div className="rounded-xl border border-slate-800 bg-[#090d14] overflow-hidden shadow-2xl flex flex-col h-[420px]">
          {/* Terminal Window Header */}
          <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-xs text-slate-400 ml-2">
                stealth-worker@ixma-cluster:~ (Playwright Headless)
              </span>
            </div>
            <Badge
              variant={isScraping ? "default" : "secondary"}
              className="font-mono text-[10px] gap-1"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isScraping ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
              {isScraping ? "LIVE STREAM (SSE)" : "COMPLETED"}
            </Badge>
          </div>

          {/* Terminal Stream Body */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2 select-text">
            <div className="text-slate-500">
              [IXMA CLOUD] Node v20.12.0 • Playwright Stealth Engine v1.44 • Residential Proxy Pool active
            </div>

            {scraperLogs.map((log) => {
              const isSuccess = log.level === "SUCCESS";
              const isWarn = log.level === "WARN";
              const isError = log.level === "ERROR";

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-600 text-[10px]">{log.timestamp}</span>
                  <span
                    className={`font-semibold ${
                      isSuccess
                        ? "text-emerald-400"
                        : isWarn
                        ? "text-amber-400"
                        : isError
                        ? "text-red-400"
                        : "text-cyan-400"
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              );
            })}

            {isScraping && (
              <div className="flex items-center gap-2 text-emerald-400 animate-pulse pt-2">
                <span className="inline-block w-2 h-4 bg-emerald-400" />
                <span>Executing stealth crawl task...</span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* URL Target Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://target-ecommerce.com/catalog"
            className="font-mono text-xs bg-slate-900 border-slate-800"
          />
          <Button
            onClick={startScrapeStream}
            disabled={isScraping}
            variant="default"
            className="gap-2 shrink-0"
          >
            {isScraping ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Execute Stealth Scrape
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Structured Output & Download Card */}
      <div className="lg:col-span-4 flex flex-col space-y-4">
        <Card className="border-slate-800 bg-slate-900/90 shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h4 className="font-bold text-white text-sm">Extraction Summary</h4>
            <Badge variant="cyan" className="text-[10px]">
              Schema Ready
            </Badge>
          </div>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Pages Crawled
                </span>
                <span className="text-xl font-bold text-slate-100 font-mono">
                  {scraperStats.pagesScraped || 5}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  SKUs Extracted
                </span>
                <span className="text-xl font-bold text-emerald-400 font-mono">
                  {scraperStats.itemsExtracted || 42}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Defense Bypass Telemetry
              </span>
              <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Cloudflare Turnstile 100% Solved
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full justify-center gap-2 border-slate-700 hover:bg-slate-800"
              onClick={() => {
                alert("Simulated CSV download: 42 structured SKU records generated.");
              }}
            >
              <Download className="h-4 w-4 text-emerald-400" />
              Download Extracted CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
