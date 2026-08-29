"use client";

/**
 * components/examples/ContentDemo.tsx
 *
 * Phase 3 of CAPABILITY_DEMOS_PLAN.md — interactive input + live data
 * renderer for the "Content Automation" capability card
 * (components/home/ExamplesSection.tsx). A visitor pastes an article,
 * transcript, or raw notes (or picks a sample), and lib/content-engine.ts
 * runs a real extractive NLP pipeline — sentence splitting, word-frequency
 * scoring, hook/key-point ranking — synchronously in the browser to produce
 * a Twitter/X thread, a LinkedIn post, and a 3-bullet executive TL;DR.
 *
 * This is a real deterministic pipeline, not a generative rewrite — there's
 * no LLM behind it, and nothing here claims otherwise (STANDARDS.md /
 * PROJECT_BLUEPRINT.md Section 8 Rule 2). It restructures and ranks the
 * visitor's own sentences; it doesn't compose new ones. No server round-trip
 * either — analysis re-runs on every keystroke, which is why it stays
 * synchronous/pure rather than a Web Worker like the OCR demo.
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { analyzeContent, type ContentPackage, type TextStats } from "@/lib/content-engine";

const MAX_CHARS = 20_000;

const SAMPLE_LAUNCH = `Most founders think the hardest part of building a startup is writing code. It's not. The hardest part is figuring out what to build before you waste six months on the wrong thing. When we started this company, we spent our first ninety days doing something unusual: we didn't write a single line of production code. Instead, we talked to forty-seven potential customers, one at a time, and asked them a single question. What is the most annoying, repetitive task in your job that you'd pay someone else to handle? The answers surprised us. Nobody said they wanted a fancier dashboard. Nobody asked for more analytics. What they wanted was simple: they wanted the boring, manual busywork to just disappear. That's when we realized something important. The biggest opportunity in software right now isn't building smarter tools. It's building invisible ones. Tools that quietly do the work nobody wants to do, so people can focus on the work that actually matters. So we built exactly that. A system that watches for the repetitive tasks a business does every single day, and automates them without anyone having to write a workflow, configure a script, or learn a new tool. Three months after launch, our early customers were saving an average of eleven hours a week. Eleven hours. That's more than a full workday, given back to actual humans. Here's the mistake most teams make. They build the product they think is impressive, instead of the product that makes someone's Tuesday afternoon less miserable. If you're building something right now, stop and ask yourself one question. Are you solving a real problem, or are you just building something cool? Because customers don't pay for cool. They pay for relief.`;

const SAMPLE_FOCUS = `I used to think multitasking was a skill. Turns out, it's just a nice way of saying you're bad at finishing things. A few years ago I tracked my own work for thirty days, down to the minute. What I found was uncomfortable. I was starting an average of fourteen different tasks a day and finishing maybe four of them. Fourteen starts, four finishes. That's not productivity. That's motion without progress. So I changed one thing. Just one. I stopped opening a new task until the current one was either finished or explicitly paused on purpose, not out of boredom. Within two weeks, my finished-task count nearly tripled. Not because I worked more hours. I actually worked less. The real unlock wasn't time management. It was attention management. Here's what nobody tells you about focus: it's not about willpower. It's about removing the fourteen tiny decisions that pull you away from the one thing that matters. Every notification, every open tab, every quick check of your phone is a tiny vote for distraction. And you're allowed to vote against yourself all day long and still call it a productive day, because you were, technically, busy. Being busy and being effective are not the same thing, and most people never stop to notice the difference. If you want one thing to try this week, it's this. Pick the single task that would matter most if it were the only thing you finished today. Do that first. Everything else can wait.`;

type CopyTarget = "thread" | "linkedin" | "tldr";

function complexityBadgeVariant(complexity: TextStats["complexity"]): "active" | "secondary" | "destructive" {
  if (complexity === "simple") return "active";
  if (complexity === "moderate") return "secondary";
  return "destructive";
}

export function ContentDemo() {
  const t = useTranslations("Examples.content");

  const [text, setText] = React.useState("");
  const [copiedTarget, setCopiedTarget] = React.useState<CopyTarget | null>(null);

  // Pure + synchronous — cheap enough to re-run on every keystroke without a
  // worker or debounce (see file header for why this differs from OcrDemo).
  const pkg: ContentPackage = React.useMemo(() => analyzeContent(text), [text]);

  const handleCopy = async (target: CopyTarget, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget((prev) => (prev === target ? null : prev)), 1500);
    } catch {
      // Clipboard API can be unavailable — silently ignore.
    }
  };

  const hasContent = pkg.hook.length > 0;

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("inputPlaceholder")}
          className="min-h-[160px] border-zinc-800 bg-zinc-950 focus-visible:ring-zinc-500 text-sm"
          maxLength={MAX_CHARS}
        />
        <div className="flex items-center justify-end text-[11px] font-mono text-zinc-600">
          {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()} {t("charactersLabel")}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-zinc-500">{t("samplesLabel")}</span>
        <button
          type="button"
          onClick={() => setText(SAMPLE_LAUNCH)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
        >
          {t("sampleLaunch")}
        </button>
        <button
          type="button"
          onClick={() => setText(SAMPLE_FOCUS)}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
        >
          {t("sampleFocus")}
        </button>
      </div>

      {!hasContent ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 min-h-[160px] flex items-center justify-center p-8 text-center">
          <p className="text-xs text-zinc-600 max-w-sm leading-relaxed">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statWords")}</dt>
              <dd className="text-xs text-zinc-300 mt-0.5 font-mono">{pkg.stats.wordCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statReadingTime")}</dt>
              <dd className="text-xs text-zinc-300 mt-0.5 font-mono">
                {t("readingTimeValue", { minutes: pkg.stats.readingTimeMinutes })}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statComplexity")}</dt>
              <dd className="mt-0.5">
                <Badge variant={complexityBadgeVariant(pkg.stats.complexity)} className="text-[10px]">
                  {t(`complexity${pkg.stats.complexity.charAt(0).toUpperCase()}${pkg.stats.complexity.slice(1)}` as
                    | "complexitySimple"
                    | "complexityModerate"
                    | "complexityComplex")}
                </Badge>
              </dd>
            </div>
          </div>

          {pkg.truncated && <p className="text-[11px] text-amber-400">{t("truncatedNote")}</p>}

          <Tabs defaultValue="thread">
            <TabsList>
              <TabsTrigger value="thread">{t("tabThread")}</TabsTrigger>
              <TabsTrigger value="linkedin">{t("tabLinkedin")}</TabsTrigger>
              <TabsTrigger value="tldr">{t("tabTldr")}</TabsTrigger>
            </TabsList>

            <TabsContent value="thread" className="space-y-3">
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {pkg.twitterThread.map((tweet, i) => (
                  <div key={i} className="relative rounded-md border border-zinc-800 bg-zinc-900/40 p-3 pr-14">
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{tweet}</p>
                    <span className="absolute top-2.5 right-3 text-[10px] font-mono text-zinc-600">{tweet.length}/280</span>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopy("thread", pkg.twitterThread.join("\n\n"))}
              >
                {copiedTarget === "thread" ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copiedTarget === "thread" ? t("copied") : t("copyThread")}
              </Button>
            </TabsContent>

            <TabsContent value="linkedin" className="space-y-3">
              <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4 max-h-[360px] overflow-y-auto">
                <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">{pkg.linkedinPost}</pre>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => handleCopy("linkedin", pkg.linkedinPost)}>
                {copiedTarget === "linkedin" ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copiedTarget === "linkedin" ? t("copied") : t("copyPost")}
              </Button>
            </TabsContent>

            <TabsContent value="tldr" className="space-y-3">
              <ul className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4 space-y-2.5">
                {pkg.tldr.map((point, i) => (
                  <li key={i} className="text-sm text-zinc-200 flex gap-2 leading-relaxed">
                    <span className="text-zinc-600 shrink-0">•</span>
                    {point}
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleCopy("tldr", pkg.tldr.map((p) => `• ${p}`).join("\n"))}
              >
                {copiedTarget === "tldr" ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copiedTarget === "tldr" ? t("copied") : t("copyTldr")}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
