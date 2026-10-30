"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { verifyTwoStep, type TwoStepState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "./Field";

const ERRORS = { invalid: "twoStepWrong", rate: "twoStepRate", generic: "twoStepGeneric" } as const;

/** Sign-in, second step: the 6-digit code from the authenticator app. */
export function TwoStepVerifyForm({ locale }: { locale: string }) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<TwoStepState, FormData>(verifyTwoStep, {});

  return (
    <form action={action} className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        <span className="text-zinc-600">{"// "}</span>
        {t("twoStepTitle")}
      </div>
      <div className="p-5 sm:p-6 space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <Field index="01" label={t("twoStepCode")} htmlFor="two-step-code">
          <Input
            id="two-step-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 \-]*"
            maxLength={8}
            required
            autoFocus
            className="font-mono tracking-[0.3em]"
          />
        </Field>
        {state.error && (
          <p role="alert" className="text-xs text-red-400">
            {t(ERRORS[state.error])}
          </p>
        )}
      </div>
      <div className="border-t border-zinc-800 bg-zinc-900/40 px-5 py-4 sm:px-6">
        <Button type="submit" size="lg" disabled={pending} className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? t("twoStepVerifying") : t("twoStepVerifyButton")}
        </Button>
      </div>
    </form>
  );
}
