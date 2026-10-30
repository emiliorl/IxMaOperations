import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Scheduler, type SchedulerContext } from "@/components/book/Scheduler";
import { resolveBookingContext } from "@/lib/portal/booking-context";
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
export default async function BookPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ project?: string; ticket?: string; mode?: string; day?: string }>;
}) {
  const params = await props.params;
  const { project, ticket, mode, day } = await props.searchParams;
  setRequestLocale(params.locale);
  const t = await getTranslations("Book");

  // Opened from a project or ticket in the portal: the booking is for that project, with the person's own
  // details and their office. Looked up as the signed-in person, so a project they can't open (or nobody
  // signed in) is just the ordinary public page.
  const found = project ? await resolveBookingContext({ projectSlug: project, ticketId: ticket }) : null;
  const context: SchedulerContext | null = found && {
    projectSlug: found.projectSlug,
    projectName: found.projectName,
    ticketId: found.ticketId,
    ticketNumber: found.ticketNumber,
    officeAddress: found.officeAddress,
    name: found.name,
    email: found.email,
    timeZone: found.timeZone,
    backHref: found.ticketId ? `/portal/tickets/${found.ticketId}` : `/portal/projects/${found.projectSlug}`,
  };

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
        <Scheduler context={context} initialMode={mode === "in_person" ? "in_person" : "online"} initialDay={day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null} />
      </div>
    </div>
  );
}
