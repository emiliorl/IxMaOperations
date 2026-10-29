"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { confirmTicketFixed, type FormState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { errorMessageKey } from "./error-messages";

/**
 * Shown on a ticket the owner marked as fixed. One click: "it works", and the
 * ticket is closed — the person doesn't have to wait for the owner to do it.
 */
export function ConfirmFixedForm({ locale, ticketId }: { locale: string; ticketId: string }) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<FormState, FormData>(confirmTicketFixed, {});

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="ticketId" value={ticketId} />
      <Button type="submit" disabled={pending} className="gap-2">
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("confirmFixedSend")}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-red-400">
          {state.error === "invalid" ? t("stillBrokenStale") : t(errorMessageKey(state.error, "ticket"), { n: 5, size: "4 MB" })}
        </p>
      )}
    </form>
  );
}
