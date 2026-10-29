import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocument, type LegalSection } from "@/components/legal/LegalDocument";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "Legal.Terms" });
  return {
    title: `${t("title")} — IxMaOperations`,
    description: t("intro"),
  };
}

/** Terms of Service — the second URL Google's OAuth consent screen asks for. */
export default async function TermsPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations("Legal");

  return (
    <LegalDocument
      title={t("Terms.title")}
      intro={t("Terms.intro")}
      updatedLabel={t("lastUpdatedLabel")}
      updated={t("lastUpdated")}
      sections={t.raw("Terms.sections") as LegalSection[]}
    />
  );
}
