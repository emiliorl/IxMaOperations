import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SettingsForm } from "@/components/portal/SettingsForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getPortalSession, requireUser } from "@/lib/portal/auth";
import { parseLanguage, timeZoneChoices, timeZoneLabel } from "@/lib/portal/preferences";
import { verifiedTotpCount } from "@/lib/portal/mfa";
import { getMyPreferences } from "@/lib/portal/queries";

/** Your own settings: name, language, time zone and which emails you want. Only ever about the signed-in person. */
export default async function SettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const { supabase, user, isAdmin } = await requireUser(locale);
  const [t, prefs, session] = await Promise.all([getTranslations("Portal"), getMyPreferences(supabase, user.id), getPortalSession()]);
  // The owner's second step: whether it is on, and the way to manage it.
  const twoStepOn = isAdmin ? verifiedTotpCount((await supabase.auth.mfa.listFactors()).data?.totp) > 0 : false;

  return (
    <div className="py-10 md:py-14">
      <div className="container mx-auto px-6 max-w-2xl space-y-8">
        <Link href="/portal" className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
          ← {t("backToProjects")}
        </Link>
        <SectionHeader as="h1" index="00" label={t("eyebrow")} title={t("settingsTitle")} description={t("settingsDescription")} />
        <SettingsForm
          locale={locale}
          email={session?.email ?? user.email ?? ""}
          initial={{
            name: session?.name ?? "",
            // Until they have chosen one, show the language they are reading now.
            language: prefs.language ?? parseLanguage(locale) ?? "es",
            timeZone: prefs.timeZone,
            notifyEmail: prefs.notifyEmail,
            notifyFixReady: prefs.notifyFixReady,
            notifyReplies: prefs.notifyReplies,
          }}
          timeZones={timeZoneChoices(prefs.timeZone).map((value) => ({ value, label: timeZoneLabel(value) }))}
          showNotifications={!isAdmin}
        />
        {isAdmin && (
          <Link
            href="/portal/two-step"
            className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-5 py-4 transition-colors hover:border-zinc-700"
          >
            <span className="space-y-0.5">
              <span className="block text-sm font-medium text-zinc-100">{t("twoStepTitle")}</span>
              <span className="block text-xs text-zinc-500">{t("settingsTwoStepHelp")}</span>
            </span>
            <span className={twoStepOn ? "font-mono text-[11px] text-emerald-400" : "font-mono text-[11px] text-amber-400"}>
              {twoStepOn ? t("twoStepStatusOn") : t("twoStepStatusOff")}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
