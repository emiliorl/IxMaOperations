import React from "react";
import { useTranslations } from "next-intl";

/**
 * Calendly iframe wrapper (Stage 11 Task 11.4). Reads the public booking
 * link from NEXT_PUBLIC_CALENDLY_URL (not secret — it's meant to be shown).
 * If it's ever unset, renders a plain fallback instead of a broken embed.
 *
 * Sep 1, 2026 (client-journey review): Calendly ships this page with a
 * white background by default, which clashed against the rest of this
 * dark-only site — and since it's a cross-origin iframe, no CSS here can
 * reach in and restyle it. Calendly's embed supports color overrides as
 * plain URL query params on the booking link itself (still a plain
 * iframe, no JS embed script needed), so `withDarkTheme` appends the Zinc
 * palette this site already uses (`STANDARDS.md`) before it ever renders.
 *
 * Sep 1, 2026 (follow-up): the embed still rendered English text for
 * Spanish-locale visitors. Calendly has **no URL parameter for this** — a
 * booking page's display language is a per-event-type setting made in
 * Calendly's own dashboard ("Change invitee language"; confirmed via
 * Calendly's help docs — there's no runtime override), not something this
 * component can force. So `locale` picks between two *separate* Calendly
 * links — `NEXT_PUBLIC_CALENDLY_URL` and an optional
 * `NEXT_PUBLIC_CALENDLY_URL_ES` pointing at a second event type whose
 * invitee language Emilio has set to Spanish in Calendly. Falls back to
 * the English link when the ES one isn't configured, so this is a no-op
 * until that one-time Calendly-side setup happens.
 */
function withDarkTheme(url: string): string {
  try {
    const themed = new URL(url);
    themed.searchParams.set("background_color", "18181b"); // zinc-900
    themed.searchParams.set("text_color", "e4e4e7"); // zinc-200
    themed.searchParams.set("primary_color", "f4f4f5"); // zinc-100 (matches Button's default variant)
    return themed.toString();
  } catch {
    // Malformed NEXT_PUBLIC_CALENDLY_URL — fall back to it unmodified rather
    // than breaking the embed entirely.
    return url;
  }
}

export function ScheduleEmbed({ locale }: { locale: string }) {
  const t = useTranslations("ScheduleEmbed");
  const calendlyUrl =
    (locale === "es" ? process.env.NEXT_PUBLIC_CALENDLY_URL_ES : undefined) || process.env.NEXT_PUBLIC_CALENDLY_URL;

  if (!calendlyUrl) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-6 text-xs text-zinc-500">
        {t("notConfigured")}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 overflow-hidden">
      <iframe
        src={withDarkTheme(calendlyUrl)}
        title={t("iframeTitle")}
        className="w-full"
        style={{ minHeight: "700px", border: "none" }}
        loading="lazy"
      />
    </div>
  );
}
