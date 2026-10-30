import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { removeTwoStepFactor } from "@/app/[locale]/portal/actions";
import { ConfirmButton } from "@/components/portal/ConfirmButton";
import { TwoStepSetup } from "@/components/portal/TwoStepSetup";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";
import { canRemoveFactor, ownerTwoStepRequired } from "@/lib/portal/mfa";
import { cn } from "@/lib/utils";

const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";
/** Two is the sensible number: the phone, and a backup in a password manager. */
const RECOMMENDED_APPS = 2;
const RESULT_TEXT = { on: "twoStepResultOn", removed: "twoStepResultRemoved", keep: "twoStepResultKeep", error: "twoStepResultError" } as const;

/**
 * The owner's two-step verification: whether it is on, the authenticator apps added (and a way to add a backup or
 * remove one), and, while the owner has none, the setup that the portal insists on before showing anything else.
 */
export default async function TwoStepPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { locale } = await props.params;
  const { result } = await props.searchParams;
  setRequestLocale(locale);
  const { supabase, isAdmin, twoStep } = await requireUser(locale, { allowTwoStep: true });
  // Has an app set up but hasn't entered a code in this session: the code comes first.
  if (twoStep === "verify") redirect({ href: "/portal/verify", locale });

  const { data } = await supabase.auth.mfa.listFactors();
  const apps = data?.totp ?? [];
  // Setting it up is for the owner; anyone else only gets here to manage an app they already have.
  if (!isAdmin && apps.length === 0) redirect({ href: "/portal", locale });

  const t = await getTranslations("Portal");
  const ownerRequired = ownerTwoStepRequired(process.env.PORTAL_REQUIRE_OWNER_2FA);
  const removable = canRemoveFactor({ isAdmin, ownerRequired, verifiedFactors: apps.length });
  const added = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const notice = result && result in RESULT_TEXT ? RESULT_TEXT[result as keyof typeof RESULT_TEXT] : null;

  return (
    <div className="py-10 md:py-14">
      <div className="container mx-auto px-6 max-w-2xl space-y-8">
        {apps.length > 0 && (
          <Link href="/portal/settings" className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
            ← {t("settingsTitle")}
          </Link>
        )}
        <SectionHeader as="h1" index="00" label={t("eyebrow")} title={t("twoStepTitle")} description={t("twoStepIntro")} />

        {isAdmin && ownerRequired && apps.length === 0 && (
          <p role="status" className="rounded-md border border-amber-500/40 bg-amber-500/[0.06] px-4 py-3 text-sm leading-relaxed text-amber-200">
            {t("twoStepRequired")}
          </p>
        )}
        {notice && (
          <p role="status" className={cn("text-xs", result === "on" || result === "removed" ? "text-green-500" : "text-red-400")}>
            {t(notice)}
          </p>
        )}

        {apps.length > 0 && (
          <section className={panel}>
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              <span>
                <span className="text-zinc-600">{"// "}</span>
                {t("twoStepAppsTitle")}
              </span>
              <span className="text-emerald-400">{t("twoStepStatusOn")}</span>
            </div>
            <ul className="divide-y divide-zinc-800/80">
              {apps.map((app) => (
                <li key={app.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-100">{app.friendly_name ?? "—"}</p>
                    <p className="text-xs text-zinc-500">{t("twoStepAdded", { date: added.format(Date.parse(app.created_at)) })}</p>
                  </div>
                  {removable && (
                    <form action={removeTwoStepFactor}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="factorId" value={app.id} />
                      <ConfirmButton confirmText={t("twoStepRemoveConfirm")} className="text-xs text-zinc-500 underline underline-offset-4 hover:text-red-400">
                        {t("twoStepRemove")}
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {apps.length < RECOMMENDED_APPS && <p className="border-t border-zinc-800 bg-zinc-900/40 px-5 py-3 text-xs leading-relaxed text-zinc-400">{t("twoStepBackupTip")}</p>}
          </section>
        )}

        {apps.length < RECOMMENDED_APPS && (
          <section className={cn(panel, "p-5 sm:p-6")}>
            <TwoStepSetup locale={locale} first={apps.length === 0} />
          </section>
        )}
      </div>
    </div>
  );
}
