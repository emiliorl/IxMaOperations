"use client";

import React, { useState } from "react";
import { ApiKeyVault } from "@/components/solopreneur/ApiKeyVault";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Video, FileUp, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Send } from "lucide-react";

interface AsyncIntakeFormProps {
  orderId: string;
  initialSlug?: string;
}

export function AsyncIntakeForm({ orderId, initialSlug }: AsyncIntakeFormProps) {
  const [loomUrl, setLoomUrl] = useState("");
  const [workflowDetails, setWorkflowDetails] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [vaultCompleted, setVaultCompleted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmitAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <Card className="border-emerald-500/30 bg-slate-900/90 text-center p-8 max-w-2xl mx-auto shadow-2xl space-y-6">
        <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <Badge variant="default" className="text-xs font-mono">
            Order #{orderId} Confirmed
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Sprint Intake Received & In Queue
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Our autonomous sprint engine has registered your video walkthrough, vaulted credentials, and scope targets. Your 48-hour delivery countdown has started.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 text-left text-xs font-mono space-y-2 text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="text-emerald-400 font-bold">SPRINT_IN_DEVELOPMENT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Target Delivery:</span>
            <span>Within 48 Hours</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Async Updates:</span>
            <span>{clientEmail || "Email notifications enabled"}</span>
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Button
            onClick={() => window.location.href = `/portal?orderId=${orderId}`}
            variant="default"
            className="gap-2"
          >
            Go to Client Delivery Portal
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Intake Guide Header */}
      <div className="space-y-2 text-center sm:text-left">
        <Badge variant="cyan" className="text-xs font-mono">
          Zero-Touch Asynchronous Intake Engine
        </Badge>
        <h1 className="text-3xl font-extrabold text-white">
          Onboarding & Workspace Provisioning
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Complete the 3 quick sections below. No kickoff call required — our engineers start building immediately.
        </p>
      </div>

      <form onSubmit={handleSubmitAll} className="space-y-8">
        {/* Section 1: Contact & Loom Video Walkthrough */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-xl">
          <CardHeader className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Video className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-base">Section 1: Video Walkthrough & Workflow</CardTitle>
                <CardDescription className="text-xs">
                  Paste a 2-5 minute Loom or YouTube unlisted video showing your manual workflow or target website.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-300">Your Contact Email *</label>
              <Input
                required
                type="email"
                placeholder="founder@company.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-300">Loom / Video URL *</label>
              <Input
                required
                type="url"
                placeholder="https://www.loom.com/share/..."
                value={loomUrl}
                onChange={(e) => setLoomUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-300">Specific Requirements or Edge Cases</label>
              <Textarea
                rows={3}
                placeholder="Mention target fields, expected rate limits, or any custom JSON schema formats you require..."
                value={workflowDetails}
                onChange={(e) => setWorkflowDetails(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Encrypted API Key Vault */}
        <div>
          <ApiKeyVault
            orderId={orderId}
            onVaultSuccess={() => setVaultCompleted(true)}
          />
        </div>

        {/* Section 3: Final Launch Submission */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>48-hour SLA begins upon submitting this form.</span>
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            variant="default"
            className="w-full sm:w-auto gap-2"
          >
            {loading ? "Registering Sprint..." : (
              <>
                <Send className="h-4 w-4" />
                Submit Intake & Launch 48-Hour Sprint
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
