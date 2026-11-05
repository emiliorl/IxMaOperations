"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Mail, Link as LinkIcon, Loader2 } from "lucide-react";
import { createInvite, sendInviteEmailAction, type InviteState, type SendInviteState } from "@/app/[locale]/portal/actions";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Owner-only: options to onboard or invite a person:
 * 1. Send invite email directly to their inbox with a one-time activation link.
 * 2. Generate a one-time link to copy and share manually.
 * No password is ever shown or sent.
 */
export function InviteLink({ locale, userId }: { locale: string; userId: string }) {
  const t = useTranslations("Portal");
  const [linkState, createLinkAction, linkPending] = useActionState<InviteState, FormData>(createInvite, {});
  const [emailState, sendEmailAction, emailPending] = useActionState<SendInviteState, FormData>(sendInviteEmailAction, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex flex-wrap items-center gap-2">
        {/* Send by email button */}
        <form action={sendEmailAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            disabled={emailPending || emailState.ok}
            className={cn(
              buttonVariants({ variant: emailState.ok ? "secondary" : "outline", size: "sm" }),
              "gap-1.5 text-xs font-medium transition-colors"
            )}
          >
            {emailPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" aria-hidden />
                <span>{t("sendingInviteEmail")}</span>
              </>
            ) : emailState.ok ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
                <span className="text-emerald-300">{t("inviteEmailSent")}</span>
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                <span>{t("sendInviteEmail")}</span>
              </>
            )}
          </button>
        </form>

        {/* Generate link button */}
        <form action={createLinkAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            disabled={linkPending}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-xs text-zinc-400 hover:text-zinc-200"
            )}
          >
            {linkPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                <span>{t("inviteMaking")}</span>
              </>
            ) : (
              <>
                <LinkIcon className="h-3.5 w-3.5" aria-hidden />
                <span>{t("inviteLink")}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {emailState.error && (
        <p className="text-[11px] text-amber-400">{t("inviteEmailFailed")}</p>
      )}

      {linkState.error && (
        <p className="text-[11px] text-rose-400">{t("inviteError")}</p>
      )}

      {linkState.link && (
        <div className="max-w-xl space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/70 p-2.5">
          <div className="flex gap-2">
            <input
              readOnly
              value={linkState.link}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={t("inviteLink")}
              className="h-8 flex-1 min-w-0 rounded border border-zinc-800 bg-zinc-900 px-2 font-mono text-[11px] text-zinc-300 focus:border-zinc-700 focus:outline-none"
            />
            <button
              type="button"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
              onClick={async () => {
                await navigator.clipboard.writeText(linkState.link!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400 mr-1" aria-hidden />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-zinc-400 mr-1" aria-hidden />
                  {t("copy")}
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500">{t("inviteHelp")}</p>
        </div>
      )}
    </div>
  );
}
