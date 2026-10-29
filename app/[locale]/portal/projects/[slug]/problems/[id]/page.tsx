import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LogList } from "@/components/portal/LogList";
import { Markdown } from "@/components/portal/Markdown";
import { Pill } from "@/components/portal/Pills";
import { TicketList } from "@/components/portal/TicketList";
import { buttonVariants } from "@/components/ui/Button";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { requireUser } from "@/lib/portal/auth";
import { ticketCountsByProblem } from "@/lib/portal/plan";
import {
  canOpenTickets,
  canWriteIn,
  getProblem,
  getProjectAccess,
  getProjectDetail,
  getProjectEvents,
} from "@/lib/portal/queries";

const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";

export default async function ProblemPage(props: { params: Promise<{ locale: string; slug: string; id: string }> }) {
  const { locale, slug, id } = await props.params;
  setRequestLocale(locale);

  const { supabase, user, isAdmin } = await requireUser(locale);
  const project = await getProjectDetail(supabase, slug);
  if (!project) notFound();
  // Not a UUID, in a folder you can't open, or not on this project: all look the same.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const problem = await getProblem(supabase, project.id, id);
  if (!problem) notFound();

  const t = await getTranslations("Portal");
  const access = await getProjectAccess(supabase, user.id, project.id, project.organizationId);
  const mayOpen = canOpenTickets(access, isAdmin) && canWriteIn(access, isAdmin, problem.departmentId);
  const timeZone = DEFAULT_AVAILABILITY.hostTimezone;

  const folderName = new Map(project.departments.map((d) => [d.id, d.name]));
  const folderLabel = (departmentId: string | null) => (departmentId ? (folderName.get(departmentId) ?? "—") : t("deptProjectWide"));
  const dueFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  const open = ticketCountsByProblem(problem.tickets.map((tk) => ({ milestoneId: id, status: tk.status }))).get(id)?.open ?? 0;
  // "Ticket opened" is already visible as a row in the ticket history below, so it's left out here.
  const activity = await getProjectEvents(supabase, project.id, null, 30, { milestoneId: id, excludeKind: "ticket_opened" });

  // Section numbers follow what is actually shown (links, cost and activity are optional).
  const hasLinks = problem.resources.length > 0;
  const hasCost = Boolean(problem.cost);
  const hasActivity = activity.length > 0;
  const n = (position: number) => String(position).padStart(2, "0");
  const linksNo = 2;
  const costNo = linksNo + (hasLinks ? 1 : 0);
  const historyNo = costNo + (hasCost ? 1 : 0);
  const activityNo = historyNo + 1;

  const newTicket = { pathname: `/portal/projects/${slug}/tickets/new`, query: { item: id } };

  return (
    <div className="py-10 md:py-14">
      <div className="container mx-auto px-6 max-w-4xl space-y-8">
        <Link href={`/portal/projects/${slug}`} className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
          ← {project.name}
        </Link>

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {problem.code && <span className="font-mono text-sm text-zinc-400">{problem.code}</span>}
            <Pill kind="milestone" value={problem.status} label={t(`milestoneStatus.${problem.status}`)} />
            <Pill kind="priority" value={problem.priority} label={t(`problemPriority.${problem.priority}`)} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">{problem.title}</h1>
          {problem.summary && <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">{problem.summary}</p>}
          <p className="font-mono text-[11px] text-zinc-500">
            {folderLabel(problem.departmentId)}
            {problem.delivery && ` · ${t("deliveryLabel")}: ${problem.delivery}`}
            {problem.dueDate && ` · ${t("due", { date: dueFmt.format(Date.parse(problem.dueDate)) })}`}
          </p>
          {mayOpen && (
            <div className="pt-1">
              <Link href={newTicket} className={buttonVariants({ size: "lg" })}>
                {t("openTicketFor")}
              </Link>
            </div>
          )}
        </header>

        {/* Action plan */}
        <section className={panel}>
          <div className={band}>
            <span>
              <span className="text-zinc-600">{"// 01 "}</span>
              {t("actionPlan")}
            </span>
          </div>
          <div className="p-5 sm:p-6">
            {problem.solution ? <Markdown>{problem.solution}</Markdown> : <p className="text-sm text-zinc-500">{problem.description ?? t("noActionPlan")}</p>}
          </div>
        </section>

        {/* Links */}
        {hasLinks && (
          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{`// ${n(linksNo)} `}</span>
                {t("linksTitle")}
              </span>
            </div>
            <ul className="divide-y divide-zinc-800/80">
              {problem.resources.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between gap-4 px-5 sm:px-6 py-3 text-sm text-zinc-200 hover:bg-zinc-900/60 hover:text-white"
                  >
                    <span className="min-w-0 truncate">{link.label}</span>
                    <span className="shrink-0 font-mono text-[11px] text-zinc-500">{new URL(link.url).host} ↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Cost — the database only returns it to people allowed to see costs */}
        {problem.cost && (
          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{`// ${n(costNo)} `}</span>
                {t("costTitle")}
              </span>
              <span className="normal-case tracking-normal text-zinc-600">{t("costHelp")}</span>
            </div>
            <div className="p-5 sm:p-6">
              <Markdown>{problem.cost}</Markdown>
            </div>
          </section>
        )}

        {/* Ticket history */}
        <section className={panel}>
          <div className={band}>
            <span>
              <span className="text-zinc-600">{`// ${n(historyNo)} `}</span>
              {t("ticketHistory")}
            </span>
            <span className="normal-case tracking-normal text-zinc-500">{t("openTicketsCount", { count: open })}</span>
          </div>
          {problem.tickets.length === 0 ? (
            <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("noProblemTickets")}</p>
          ) : (
            <TicketList tickets={problem.tickets} locale={locale} folderLabel={folderLabel} showFolder={false} />
          )}
        </section>

        {/* Activity */}
        {hasActivity && (
          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{`// ${n(activityNo)} `}</span>
                {t("logTitle")}
              </span>
              <Link href={`/portal/projects/${slug}/log`} className="normal-case tracking-normal text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
                {t("logLink")} →
              </Link>
            </div>
            <LogList entries={activity} locale={locale} timeZone={timeZone} projectSlug={slug} folderLabel={folderLabel} />
          </section>
        )}
      </div>
    </div>
  );
}
