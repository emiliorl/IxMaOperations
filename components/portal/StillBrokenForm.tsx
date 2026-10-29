"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { reopenTicket, type FormState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { errorMessageKey } from "./error-messages";
import { FileField } from "./FileField";

/**
 * Shown on a ticket the owner marked as fixed ("Needs your review"). If it is
 * still broken the person says what they see and the SAME ticket reopens, so
 * the whole story stays in one place and in the project log.
 */
export function StillBrokenForm({ locale, ticketId }: { locale: string; ticketId: string }) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<FormState, FormData>(reopenTicket, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <label htmlFor="r-message" className="flex items-baseline gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
        {t("stillBrokenNote")}
      </label>
      <Textarea id="r-message" name="message" rows={4} required minLength={3} maxLength={5000} />
      <FileField id="r-files" />
      {state.error && (
        <p role="alert" className="text-xs text-red-400">
          {state.error === "invalid" ? t("stillBrokenStale") : t(errorMessageKey(state.error, "ticket"), { n: 5, size: "4 MB" })}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pending} className="gap-2">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? t("sending") : t("stillBrokenSend")}
      </Button>
    </form>
  );
}
