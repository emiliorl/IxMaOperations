"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppStore, ScraperLog } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Play, RotateCw, Download } from "lucide-react";

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

  const [targetUrl, setTargetUrl] = useState("https://ecom-marketplace.com/sensors");
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

  useEffect(() => {
    if (scraperLogs.length === 0) {
      startScrapeStream();
    }
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Terminal Window Frame */}
      <div className="lg:col-span-8 space-y-3">
        <div className="rounded-lg border border-zinc-800 bg-[#09090b] overflow-hidden shadow-sm flex flex-col h-[380px]">
          {/* Header Bar */}
          <div className="bg-zinc-900/90 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="font-mono text-xs text-zinc-300 ml-2">
                playwright_stealth_worker.py
              </span>
            </div>
            <Badge variant={isScraping ? "active" : "default"} className="text-[10px]">
              {isScraping ? "STREAMING (SSE)" : "IDLE"}
            </Badge>
          </div>

          {/* Terminal Log Output */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5 select-text text-zinc-300">
            <div className="text-zinc-500 text-[11px]">
              [IXMA ENGINE] Headless Chromium stealth pool initialized.
            </div>

            {scraperLogs.map((log) => {
              const isSuccess = log.level === "SUCCESS";
              const isWarn = log.level === "WARN";
              const isError = log.level === "ERROR";

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-zinc-600 text-[10px]">{log.timestamp}</span>
                  <span
                    className={`font-semibold ${
                      isSuccess
                        ? "text-emerald-400"
                        : isWarn
                        ? "text-amber-400"
                        : isError
                        ? "text-red-400"
                        : "text-zinc-400"
                    }`}
                  >
                    [{log.level}]
                  </span>
                  <span className="text-zinc-200">{log.message}</span>
                </div>
              );
            })}

            {isScraping && (
              <div className="flex items-center gap-2 text-zinc-400 pt-1">
                <span className="inline-block w-1.5 h-3 bg-zinc-400 animate-pulse" />
                <span>Executing worker tasks...</span>
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Target Input */}
        <div className="flex gap-2">
          <Input
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://target-catalog.com/products"
            className="font-mono text-xs"
          />
          <Button
            onClick={startScrapeStream}
            disabled={isScraping}
            variant="default"
            size="sm"
            className="gap-1.5 shrink-0"
          >
            {isScraping ? (
              <>
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Run Scraper
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Structured Output Card */}
      <div className="lg:col-span-4 space-y-3">
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider font-mono">
              Extraction Summary
            </h4>
            <Badge variant="default" className="text-[10px]">
              Ready
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">Pages Crawled</span>
              <span className="text-base font-semibold text-zinc-100 mt-0.5 block">
                {scraperStats.pagesScraped || 5}
              </span>
            </div>

            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block">SKUs Parsed</span>
              <span className="text-base font-semibold text-zinc-100 mt-0.5 block">
                {scraperStats.itemsExtracted || 42}
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center gap-1.5 text-xs"
            onClick={() => alert("CSV Export: 42 records downloaded.")}
          >
            <Download className="h-3.5 w-3.5" />
            Download Extracted CSV
          </Button>
        </Card>
      </div>
    </div>
  );
}
