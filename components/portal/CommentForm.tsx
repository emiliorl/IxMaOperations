"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { addComment, type FormState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

const ERRORS = { invalid: "errorTicketInvalid", denied: "errorDenied", rate: "errorGeneric", unavailable: "errorGeneric", generic: "errorGeneric" } as const;

export function CommentForm({ locale, ticketId, isAdmin }: { locale: string; ticketId: string; isAdmin: boolean }) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<FormState, FormData>(addComment, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <label htmlFor="c-message" className="flex items-baseline gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
        {t("addComment")}
      </label>
      <Textarea id="c-message" name="message" rows={4} required maxLength={5000} />
      {isAdmin && (
        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
          <input type="checkbox" name="internal" className="accent-zinc-300" />
          {t("internalNote")}
        </label>
      )}
      {state.error && (
        <p role="alert" className="text-xs text-red-400">
          {t(ERRORS[state.error])}
        </p>
      )}
      <Button type="submit" disabled={pending} className="gap-2">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
