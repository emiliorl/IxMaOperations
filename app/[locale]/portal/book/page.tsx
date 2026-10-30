import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Scheduler, type SchedulerContext } from "@/components/book/Scheduler";
import { BackLink } from "@/components/portal/BackLink";
import { requireUser } from "@/lib/portal/auth";
import { resolveBookingContext } from "@/lib/portal/booking-context";
import { resolveTopic } from "@/lib/portal/booking-topic";
import { listProjects } from "@/lib/portal/queries";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Booking from inside the portal. The same scheduler as the public /book page, but here
 * the person is already signed in, so: the portal's own header and footer stay around it,
 * their name, email, office and time zone are filled in, and the call can say which team and
 * which problem it is about. Every portal "book" link comes here; the public page is for
 * people without an account.
 *
 * Opened with ?project=slug (and optionally &ticket=, &problem=, &area=, &mode=, &day=).
 * Without a project it asks which one (or goes straight to it when there is only one).
 */
export default async function PortalBookPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ project?: string; ticket?: string; area?: string; problem?: string; mode?: string; day?: string }>;
}) {
  const { locale } = await props.params;
  const { project, ticket, area, problem, mode, day } = await props.searchParams;
  setRequestLocale(locale);
  const [t, tp] = await Promise.all([getTranslations("Book"), getTranslations("Portal")]);
  const { supabase } = await requireUser(locale);

  const carried = { ...(ticket ? { ticket } : {}), ...(area ? { area } : {}), ...(problem ? { problem } : {}), ...(mode ? { mode } : {}), ...(day ? { day } : {}) };

  // No project chosen: the only one, or a short list to pick from.
  if (!project) {
    const projects = await listProjects(supabase);
    if (projects.length === 0) notFound();
    if (projects.length === 1) redirect({ href: { pathname: "/portal/book", query: { project: projects[0].slug, ...carried } }, locale });
    return (
      <div className="py-10 md:py-14">
        <div className="container mx-auto px-6 max-w-3xl space-y-6">
          <Link href="/portal" className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
            ← {tp("backToProjects")}
          </Link>
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold text-white tracking-tight">{t("pickProjectTitle")}</h1>
            <p className="text-sm text-zinc-400">{t("pickProjectHelp")}</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={{ pathname: "/portal/book", query: { project: p.slug, ...carried } }}
                className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-5 text-sm font-medium text-zinc-100 transition-all hover:border-zinc-700 hover:text-white"
              >
                {p.organization && <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-zinc-500">{p.organization}</span>}
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // A project (or ticket) this person can't open is just not found, like everywhere else in the portal.
  const found = await resolveBookingContext({ projectSlug: project, ticketId: ticket });
  if (!found) notFound();

  // What the call starts out being about: what the link asked for, else the ticket's own team and problem.
  const topic = resolveTopic({
    areas: found.areas,
    problems: found.problems,
    areaId: area || found.ticketTopic?.areaId,
    problemId: problem || found.ticketTopic?.problemId,
  });
  const cameFromProblem = Boolean(problem && topic.problemId === problem);
  const backHref = found.ticketId
    ? `/portal/tickets/${found.ticketId}`
    : cameFromProblem
      ? `/portal/projects/${found.projectSlug}/problems/${topic.problemId}`
      : `/portal/projects/${found.projectSlug}${topic.areaId ? `?dept=${topic.areaId}` : ""}`;

  const context: SchedulerContext = {
    projectSlug: found.projectSlug,
    projectName: found.projectName,
    ticketId: found.ticketId,
    ticketNumber: found.ticketNumber,
    officeAddress: found.officeAddress,
    name: found.name,
    email: found.email,
    timeZone: found.timeZone,
    backHref,
    areas: found.areas,
    problems: found.problems,
    areaId: topic.areaId,
    problemId: topic.problemId,
  };

  return (
    <div className="py-8 md:py-10">
      <div className="container mx-auto px-6 max-w-5xl space-y-5">
        <BackLink fallbackHref={backHref} className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
          {found.projectName}
        </BackLink>
        <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">{t("title")}</h1>
          <p className="max-w-md text-sm text-zinc-400 leading-relaxed hidden sm:block">{t("portalDescription")}</p>
        </header>
        <Scheduler context={context} initialMode={mode === "in_person" ? "in_person" : "online"} initialDay={day && DAY.test(day) ? day : null} />
      </div>
    </div>
  );
}
