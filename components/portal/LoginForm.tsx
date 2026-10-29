"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { signIn, type FormState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { errorMessageKey } from "./error-messages";
import { Field } from "./Field";

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});

  return (
    <form action={action} className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
        <span className="text-zinc-600">{"// "}</span>
        {t("eyebrow")}
      </div>
      <div className="p-5 sm:p-6 space-y-5">
        <input type="hidden" name="locale" value={locale} />
        <Field index="01" label={t("email")} htmlFor="login-email">
          <Input id="login-email" name="email" type="email" autoComplete="username" required />
        </Field>
        <Field index="02" label={t("password")} htmlFor="login-password">
          <Input id="login-password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        {state.error && (
          <p role="alert" className="text-xs text-red-400">
            {t(errorMessageKey(state.error, "login"))}
          </p>
        )}
      </div>
      <div className="border-t border-zinc-800 bg-zinc-900/40 px-5 py-4 sm:px-6">
        <Button type="submit" size="lg" disabled={pending} className="gap-2 w-full sm:w-auto">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? t("signingIn") : t("signIn")}
        </Button>
      </div>
    </form>
  );
}
