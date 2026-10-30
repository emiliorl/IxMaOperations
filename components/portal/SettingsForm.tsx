"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { saveSettings, type FormState } from "@/app/[locale]/portal/actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LANGUAGES, LANGUAGE_NAMES, isValidTimeZone, timeZoneLabel, type Language } from "@/lib/portal/preferences";
import { cn } from "@/lib/utils";
import { Field, selectClass } from "./Field";

const band = "border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const check = "flex items-start gap-2.5 text-sm text-zinc-200 cursor-pointer";

/**
 * Your name, language, time zone and which emails you want. Every value is held
 * here while you edit (so saving never snaps a field back to what it was), and the
 * server decides what is valid. A changed language reopens the page in it.
 */
export function SettingsForm({
  locale,
  email,
  initial,
  timeZones,
  showNotifications,
}: {
  locale: string;
  email: string;
  initial: {
    name: string;
    language: Language;
    timeZone: string;
    notifyEmail: boolean;
    notifyFixReady: boolean;
    notifyReplies: boolean;
  };
  timeZones: { value: string; label: string }[];
  /** The owner's alerts are set up elsewhere, so the owner is not offered these. */
  showNotifications: boolean;
}) {
  const t = useTranslations("Portal");
  const router = useRouter();
  const pathname = usePathname();
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});
  const [name, setName] = useState(initial.name);
  const [language, setLanguage] = useState<Language>(initial.language);
  const [timeZone, setTimeZone] = useState(initial.timeZone);
  const [notifyEmail, setNotifyEmail] = useState(initial.notifyEmail);
  const [fixReady, setFixReady] = useState(initial.notifyFixReady);
  const [replies, setReplies] = useState(initial.notifyReplies);
  // Read after the page has loaded: the server does not know the device's time zone.
  const [device, setDevice] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && isValidTimeZone(zone)) setDevice(zone);
  }, []);

  useEffect(() => {
    if (!state.ok) return;
    setSaved(true);
    // A new language takes effect right away; otherwise just re-read the page's data (times, names).
    if (language !== locale) router.replace(pathname, { locale: language });
    else router.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to each new result only
  }, [state]);

  const options = timeZones.some((zone) => zone.value === timeZone) ? timeZones : [{ value: timeZone, label: timeZoneLabel(timeZone) }, ...timeZones];
  const edited = <T,>(setter: (value: T) => void) => (value: T) => {
    setSaved(false);
    setter(value);
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="uiLocale" value={locale} />
      {showNotifications && <input type="hidden" name="notificationsShown" value="1" />}

      <section className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
        <div className={band}>
          <span className="text-zinc-600">{"// 01 "}</span>
          {t("settingsProfile")}
        </div>
        <div className="p-5 sm:p-6 space-y-5">
          <Field index="01" label={t("fieldName")} htmlFor="s-name">
            <Input
              id="s-name"
              name="displayName"
              value={name}
              onChange={(event) => edited(setName)(event.target.value)}
              required
              maxLength={120}
              autoComplete="name"
            />
          </Field>
          <Field index="02" label={t("email")} help={t("settingsEmailFixed")} htmlFor="s-email">
            <Input id="s-email" value={email} readOnly disabled />
          </Field>
          <Field index="03" label={t("fieldLanguage")} help={t("fieldLanguageHelp")} htmlFor="s-language">
            <select
              id="s-language"
              name="language"
              value={language}
              onChange={(event) => edited(setLanguage)(event.target.value as Language)}
              className={selectClass}
            >
              {LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_NAMES[code]}
                </option>
              ))}
            </select>
          </Field>
          <Field index="04" label={t("fieldTimezone")} help={t("fieldTimezoneHelp")} htmlFor="s-timezone">
            <select
              id="s-timezone"
              name="timezone"
              value={timeZone}
              onChange={(event) => edited(setTimeZone)(event.target.value)}
              className={selectClass}
            >
              {options.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>
            {device && device !== timeZone && (
              <button
                type="button"
                // The device's zone may not be one of the common ones: the select adds it so it can show it.
                onClick={() => edited(setTimeZone)(device)}
                className="text-xs text-zinc-400 underline underline-offset-4 hover:text-zinc-100"
              >
                {t("useDeviceTimezone", { zone: timeZoneLabel(device) })}
              </button>
            )}
          </Field>
        </div>
      </section>

      {showNotifications && (
        <section className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
          <div className={band}>
            <span className="text-zinc-600">{"// 02 "}</span>
            {t("settingsNotifications")}
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            <label className={check}>
              <input
                type="checkbox"
                name="notifyEmail"
                checked={notifyEmail}
                onChange={(event) => edited(setNotifyEmail)(event.target.checked)}
                className="mt-0.5 accent-zinc-300"
              />
              <span>
                {t("notifyAll")}
                <span className="block text-[11px] text-zinc-500">{t("notifyAllHelp", { email })}</span>
              </span>
            </label>
            <div className={cn("space-y-3 border-l border-zinc-800 pl-5", !notifyEmail && "opacity-50")}>
              <label className={check}>
                <input
                  type="checkbox"
                  name="notifyFixReady"
                  checked={fixReady}
                  disabled={!notifyEmail}
                  onChange={(event) => edited(setFixReady)(event.target.checked)}
                  className="mt-0.5 accent-zinc-300"
                />
                {t("notifyFixReady")}
              </label>
              <label className={check}>
                <input
                  type="checkbox"
                  name="notifyReplies"
                  checked={replies}
                  disabled={!notifyEmail}
                  onChange={(event) => edited(setReplies)(event.target.checked)}
                  className="mt-0.5 accent-zinc-300"
                />
                {t("notifyReplies")}
              </label>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
        <div className={band}>
          <span className="text-zinc-600">{`// 0${showNotifications ? 3 : 2} `}</span>
          {t("settingsSecurity")}
        </div>
        <div className="p-5 sm:p-6">
          <Link href="/portal/set-password" className="text-sm text-zinc-200 underline underline-offset-4 hover:text-white">
            {t("changePassword")} →
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending} className="w-full gap-2 sm:w-auto">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? t("saving") : t("save")}
        </Button>
        {saved && (
          <p role="status" className="text-xs text-green-500">
            {t("settingsSaved")}
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-xs text-red-400">
            {t(state.error === "invalid" ? "errorTicketInvalid" : "errorGeneric")}
          </p>
        )}
      </div>
    </form>
  );
}
