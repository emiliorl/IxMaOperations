import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Scheduler } from "@/components/book/Scheduler";
import { Link, redirect } from "@/i18n/navigation";
import { resolveBookingContext, signedInEmail } from "@/lib/portal/booking-context";
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
 * Native booking page for people without an account (it replaces the Calendly embed, see
 * CLIENT_PORTAL_AND_SCHEDULER_PLAN.md Phase 2). All scheduling rules live server-side;
 * this page is just the shell around the client-side Scheduler.
 *
 * Clients book from inside the portal instead (app/[locale]/portal/book): same scheduler,
 * but with the portal around it and the booking tied to their project, team and problem.
 * An older link here with ?project= that a signed-in client can open is sent there; and the
 * page tells a guest that clients can sign in, and a signed-in client that the portal has it.
 *
 * The heading is deliberately compact (title and one line of copy side by side):
 * this page is a tool, and the calendar, times and form should be on screen
 * together without scrolling.
 */
export default async function BookPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ project?: string; ticket?: string; area?: string; problem?: string; mode?: string; day?: string }>;
}) {
  const params = await props.params;
  const { project, ticket, area, problem, mode, day } = await props.searchParams;
  setRequestLocale(params.locale);
  const t = await getTranslations("Book");

  const email = await signedInEmail();
  if (email && project) {
    // Only when this person can really open that project: otherwise it is just the public page.
    const found = await resolveBookingContext({ projectSlug: project, ticketId: ticket });
    if (found) {
      const query = { project, ...(ticket ? { ticket } : {}), ...(area ? { area } : {}), ...(problem ? { problem } : {}), ...(mode ? { mode } : {}), ...(day ? { day } : {}) };
      redirect({ href: { pathname: "/portal/book", query }, locale: params.locale });
    }
  }

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
        <p className="mb-4 text-xs text-zinc-500">
          {email ? (
            <>
              {t("signedInHint")}{" "}
              <Link href="/portal/book" className="text-zinc-300 underline underline-offset-4 hover:text-white">
                {t("signedInLink")}
              </Link>
            </>
          ) : (
            <>
              {t("clientHint")}{" "}
              <Link href="/portal/login" className="text-zinc-300 underline underline-offset-4 hover:text-white">
                {t("clientLogin")}
              </Link>
            </>
          )}
        </p>
        <Scheduler initialMode={mode === "in_person" ? "in_person" : "online"} initialDay={day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null} />
      </div>
    </div>
  );
}
