"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { confirmTwoStepSetup, startTwoStepSetup, type TwoStepState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "./Field";

const ERRORS = { invalid: "twoStepWrong", rate: "twoStepRate", generic: "twoStepGeneric" } as const;

/**
 * Adding an authenticator app: first a button makes the pending app and shows its QR code (and the same thing as text,
 * for a phone that can't scan); then the first code it shows proves the person really has it. Nothing is turned on
 * until that code is confirmed.
 */
export function TwoStepSetup({ locale, first }: { locale: string; first: boolean }) {
  const t = useTranslations("Portal");
  const [started, start, starting] = useActionState<TwoStepState, FormData>(startTwoStepSetup, {});
  const [confirmed, confirm, confirming] = useActionState<TwoStepState, FormData>(confirmTwoStepSetup, {});

  if (!started.setup) {
    return (
      <form action={start} className="space-y-3">
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" size="lg" disabled={starting} className="gap-2">
          {starting && <Loader2 className="h-4 w-4 animate-spin" />}
          {first ? t("twoStepSetupButton") : t("twoStepAddAnother")}
        </Button>
        {started.error && (
          <p role="alert" className="text-xs text-red-400">
            {t(ERRORS[started.error])}
          </p>
        )}
      </form>
    );
  }

  return (
    <form action={confirm} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="factorId" value={started.setup.factorId} />
      <p className="max-w-xl text-sm leading-relaxed text-zinc-300">{t("twoStepScan")}</p>
      <div className="flex flex-wrap items-start gap-5">
        {/* A data: image made by the sign-in service for this one setup; the page's image rules already allow it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={started.setup.qr} alt={t("twoStepScanAlt")} width={176} height={176} className="rounded-md bg-white p-2" />
        <div className="min-w-0 space-y-1.5">
          <p className="text-[11px] leading-relaxed text-zinc-500">{t("twoStepSecret")}</p>
          <code className="block break-all rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-200">{started.setup.secret}</code>
        </div>
      </div>
      <Field index="01" label={t("twoStepCode")} htmlFor="two-step-setup-code" className="max-w-xs">
        <Input
          id="two-step-setup-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 \-]*"
          maxLength={8}
          required
          className="font-mono tracking-[0.3em]"
        />
      </Field>
      {confirmed.error && (
        <p role="alert" className="text-xs text-red-400">
          {t(ERRORS[confirmed.error])}
        </p>
      )}
      <Button type="submit" size="lg" disabled={confirming} className="gap-2">
        {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
        {confirming ? t("twoStepChecking") : t("twoStepConfirm")}
      </Button>
    </form>
  );
}
