import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "Legal.Privacy" });
  return {
    title: `${t("title")} — IxMaOperations`,
    description: t("intro"),
  };
}

/**
 * Privacy Policy. Also the URL entered on the Google OAuth consent screen
 * (Google Auth Platform → Branding), which is what removes the "Learn why
 * you're not seeing links to ... Privacy Policy" banner and is required for
 * `calendar.freebusy` verification — so the Google section below must stay
 * accurate to what lib/google-calendar.ts actually does (read-only busy
 * times, token used once and never stored) and keep the Limited Use
 * statement. If that behavior changes, change the copy in the same commit.
 */
export default async function PrivacyPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations("Legal");

  return (
    <LegalDocument
      title={t("Privacy.title")}
      intro={t("Privacy.intro")}
      updatedLabel={t("lastUpdatedLabel")}
      updated={t("lastUpdated")}
      sections={t.raw("Privacy.sections") as LegalSection[]}
    />
  );
}
