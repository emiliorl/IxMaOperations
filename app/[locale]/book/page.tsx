import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Scheduler } from "@/components/book/Scheduler";
import { SectionHeader } from "@/components/ui/SectionHeader";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "Book" });
  return {
    title: `${t("metaTitle")} — IxMaOperations`,
    description: t("description"),
  };
}

/**
 * Native booking page — replaces the Calendly embed (see
 * CLIENT_PORTAL_AND_SCHEDULER_PLAN.md Phase 2). All scheduling rules live
 * server-side; this page is just the shell around the client-side Scheduler.
 */
export default async function BookPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations("Book");

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-6 max-w-5xl">
        <SectionHeader
          as="h1"
          index="00"
          label={t("badge")}
          title={t("title")}
          description={t("description")}
          className="mb-12"
        />
        <Scheduler />
      </div>
    </div>
  );
}
