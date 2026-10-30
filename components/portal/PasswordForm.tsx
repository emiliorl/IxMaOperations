"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { setPassword, type PasswordState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MIN_PASSWORD } from "@/lib/portal/password";
import { Field } from "./Field";

const ERRORS = {
  too_short: "errorPasswordShort",
  mismatch: "errorPasswordMismatch",
  weak: "errorPasswordWeak",
  rate: "errorRate",
  generic: "errorGeneric",
} as const;

export function PasswordForm({ locale }: { locale: string }) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPassword, {});

  return (
    <form action={action} className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        <span className="text-zinc-600">{"// "}</span>
        {t("passwordLabel")}
      </div>
      <div className="p-5 sm:p-6 space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <Field index="01" label={t("newPassword")} help={t("passwordHelp", { n: MIN_PASSWORD })} htmlFor="new-password">
          <Input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} />
        </Field>
        <Field index="02" label={t("confirmPassword")} htmlFor="confirm-password">
          <Input id="confirm-password" name="confirm" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD} />
        </Field>
        {state.error && (
          <p role="alert" className="text-xs text-red-400">
            {t(ERRORS[state.error], { n: MIN_PASSWORD })}
          </p>
        )}
      </div>
      <div className="border-t border-zinc-800 bg-zinc-900/40 px-5 py-4 sm:px-6">
        <Button type="submit" size="lg" disabled={pending} className="w-full gap-2 sm:w-auto">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? t("saving") : t("savePassword")}
        </Button>
      </div>
    </form>
  );
}
