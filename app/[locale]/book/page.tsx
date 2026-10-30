import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Scheduler } from "@/components/book/Scheduler";
import { publicAlternates } from "@/lib/site-url";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: "Book" });
  return {
    title: `${t("metaTitle")} — IxMaOperations`,
    description: t("description"),
    alternates: publicAlternates(params.locale, "/book"),
  };
}

/**
 * Native booking page — replaces the Calendly embed (see
 * CLIENT_PORTAL_AND_SCHEDULER_PLAN.md Phase 2). All scheduling rules live
 * server-side; this page is just the shell around the client-side Scheduler.
 *
 * The heading is deliberately compact (title and one line of copy side by side):
 * this page is a tool, and the calendar, times and form should be on screen
 * together without scrolling.
 */
export default async function BookPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  setRequestLocale(params.locale);
  const t = await getTranslations("Book");

  return (
    <div className="py-8 md:py-10">
      <div className="container mx-auto px-6 max-w-5xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              <span className="text-zinc-600">{"// "}</span>
              00 {t("badge")}
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">{t("title")}</h1>
          </div>
          <p className="max-w-md text-sm text-zinc-400 leading-relaxed hidden sm:block">{t("description")}</p>
        </header>
        <Scheduler />
      </div>
    </div>
  );
}
