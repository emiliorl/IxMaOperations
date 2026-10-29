"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { createInvite, type InviteState } from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";

/**
 * Owner-only: makes a one-time link the person can use to sign in and choose
 * their own password. You copy it and send it however you like — nothing is
 * emailed automatically, and no password is ever shown or sent.
 */
export function InviteLink({ locale, userId }: { locale: string; userId: string }) {
  const t = useTranslations("Portal");
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <form action={action}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="userId" value={userId} />
        <button type="submit" disabled={pending} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {pending ? t("inviteMaking") : t("inviteLink")}
        </button>
      </form>
      {state.error && <p className="text-[11px] text-red-400">{t("inviteError")}</p>}
      {state.link && (
        <div className="space-y-1.5 max-w-xl">
          <div className="flex gap-2">
            <input
              readOnly
              value={state.link}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={t("inviteLink")}
              className="h-8 flex-1 min-w-0 rounded-md border border-zinc-800 bg-zinc-950 px-2 font-mono text-[11px] text-zinc-300"
            />
            <button
              type="button"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              onClick={async () => {
                await navigator.clipboard.writeText(state.link!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">{t("inviteHelp")}</p>
        </div>
      )}
    </div>
  );
}
