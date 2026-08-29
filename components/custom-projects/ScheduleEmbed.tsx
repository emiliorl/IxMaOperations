import React from "react";
import { useTranslations } from "next-intl";

/**
 * Calendly iframe wrapper (Stage 11 Task 11.4). Reads the public booking
 * link from NEXT_PUBLIC_CALENDLY_URL (not secret — it's meant to be shown).
 * If it's ever unset, renders a plain fallback instead of a broken embed.
 * Calendly itself isn't locale-aware from this component — if the booking
 * page needs to be in Spanish too, that's configured on the Calendly side.
 */
export function ScheduleEmbed() {
  const t = useTranslations("ScheduleEmbed");
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

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
        src={calendlyUrl}
        title={t("iframeTitle")}
        className="w-full"
        style={{ minHeight: "700px", border: "none" }}
        loading="lazy"
      />
    </div>
  );
}
