"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestSchema, type RequestFormValues } from "@/lib/schemas";
import { PACKAGES } from "@/lib/packages";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared brief/request form (Stage 11 Task 11.2) — serves both a picked
 * package ("Request This Package" from /packages/[slug], pre-filled via
 * `initialPackageSlug`) and an open-ended custom brief. Zod-validated
 * client-side (lib/schemas.ts, shared with the server route) and again
 * server-side in app/api/request/route.ts.
 */
export function BriefForm({ initialPackageSlug = "" }: { initialPackageSlug?: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      name: "",
      email: "",
      packageSlug: initialPackageSlug,
      problem: "",
      timeline: "",
      budgetRange: "",
    },
  });

  const onSubmit = async (values: RequestFormValues) => {
    setStatus("submitting");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 flex items-start gap-3">
        <Check className="h-5 w-5 text-zinc-300 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-100">Request sent.</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            I'll reply by email with a price and timeline. If you'd rather talk it through first, book a
            call below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name" error={errors.name?.message}>
          <Input {...register("name")} placeholder="Your name" autoComplete="name" />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input {...register("email")} type="email" placeholder="you@example.com" autoComplete="email" />
        </Field>
      </div>

      <Field label="Which package? (optional)" error={errors.packageSlug?.message}>
        <select
          {...register("packageSlug")}
          className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <option value="">Custom / not listed</option>
          {PACKAGES.map((pkg) => (
            <option key={pkg.slug} value={pkg.slug}>
              {pkg.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="What are you trying to solve?" error={errors.problem?.message}>
        <Textarea
          {...register("problem")}
          placeholder="Describe the problem, the data/systems involved, and what a finished result looks like."
          rows={5}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Timeline" error={errors.timeline?.message}>
          <Input {...register("timeline")} placeholder="e.g. within 2 weeks" />
        </Field>
        <Field label="Budget range (optional)" error={errors.budgetRange?.message}>
          <Input {...register("budgetRange")} placeholder="e.g. $500–$1,000" />
        </Field>
      </div>

      {status === "error" && errorMessage && (
        <p className="text-xs text-red-400">{errorMessage}</p>
      )}

      <Button type="submit" size="lg" disabled={status === "submitting"} className="gap-2">
        {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === "submitting" ? "Sending…" : "Send Request"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">{label}</span>
      {children}
      {error && <span className={cn("block text-xs text-red-400")}>{error}</span>}
    </label>
  );
}
