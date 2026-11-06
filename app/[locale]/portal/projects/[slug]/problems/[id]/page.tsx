import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock } from "lucide-react";
import { updateMilestoneStatus } from "@/app/[locale]/portal/actions";
import { Link } from "@/i18n/navigation";
import { BackLink } from "@/components/portal/BackLink";
import { FilesPanel } from "@/components/portal/FilesPanel";
import { ProblemEditor } from "@/components/portal/ProblemEditor";
import { LogList } from "@/components/portal/LogList";
import { Markdown } from "@/components/portal/Markdown";
import { Pill } from "@/components/portal/Pills";
import { StatusForm } from "@/components/portal/StatusForm";
import { TicketList } from "@/components/portal/TicketList";
import { buttonVariants } from "@/components/ui/Button";
import { requireUser } from "@/lib/portal/auth";
import { MILESTONE_STATUSES } from "@/lib/portal/constants";
import { sortTickets } from "@/lib/portal/filters";
import { ticketCountsByProblem } from "@/lib/portal/plan";
import {
  canOpenTickets,
  canViewProjectLog,
  canWriteIn,
  getProblem,
  getProjectAccess,
  getProjectEvents,
  getProjectShell,
  getMyTimeZone,
  listSharedFiles,
} from "@/lib/portal/queries";

const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 sm:px-6 py-3.5 text-sm font-semibold text-zinc-100";
const panel = "rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";

export default async function ProblemPage(props: { params: Promise<{ locale: string; slug: string; id: string }> }) {
  const { locale, slug, id } = await props.params;
  setRequestLocale(locale);

  const { supabase, user, isAdmin } = await requireUser(locale);
  // Not a UUID, in a folder you can't open, or not on this project: all look the same.
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const project = await getProjectShell(supabase, slug);
  if (!project) notFound();

  // None of these depend on each other, only on the project.
  const [problem, access, allActivity, t, timeZone, sharedFiles] = await Promise.all([
    getProblem(supabase, project.id, id),
    getProjectAccess(supabase, user.id, project.id, project.organizationId),
    // "Ticket opened" is already visible as a row in the ticket history below, so it's left out here.
    getProjectEvents(supabase, project.id, null, 30, { milestoneId: id, excludeKind: "ticket_opened" }),
    getTranslations("Portal"),
    getMyTimeZone(supabase, user.id),
    listSharedFiles(supabase, project.id, id),
  ]);
  if (!problem) notFound();
  // The activity feed is for leaders (owner, executives, team leads); everyone else sees the tickets above, not the audit trail.
  const activity = canViewProjectLog(access, isAdmin) ? allActivity : [];
  const mayOpen = canOpenTickets(access, isAdmin) && canWriteIn(access, isAdmin, problem.departmentId);

  const folderName = new Map(project.departments.map((d) => [d.id, d.name]));
  const folderLabel = (departmentId: string | null) => (departmentId ? (folderName.get(departmentId) ?? "—") : t("deptProjectWide"));
  const dueFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  const open = ticketCountsByProblem(problem.tickets.map((tk) => ({ milestoneId: id, status: tk.status }))).get(id)?.open ?? 0;

  const hasLinks = problem.resources.length > 0;
  const hasActivity = activity.length > 0;

  const newTicket = { pathname: `/portal/projects/${slug}/tickets/new`, query: { item: id } };

  return (
    <div className="py-10 md:py-14">
      <div className="container mx-auto px-6 max-w-4xl space-y-8">
        <BackLink
          fallbackHref={`/portal/projects/${slug}?dept=${problem.departmentId ?? "all"}`}
          className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4"
        >
          {project.name}
        </BackLink>

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {problem.code && <span className="font-mono text-sm text-zinc-400">{problem.code}</span>}
            {isAdmin ? (
              <StatusForm
                action={updateMilestoneStatus}
                hidden={{ locale, milestoneId: id }}
                current={problem.status}
                currentWaitingFor={problem.waitingFor}
                options={MILESTONE_STATUSES.map((status) => ({ value: status, label: t(`milestoneStatus.${status}`) }))}
                ariaLabel={t("statusLabel")}
              />
            ) : (
              <Pill kind="milestone" value={problem.status} label={t(`milestoneStatus.${problem.status}`)} />
            )}
            <Pill kind="priority" value={problem.priority} label={t(`problemPriority.${problem.priority}`)} />
          </div>
          <h1 className="break-words text-2xl sm:text-4xl font-semibold text-white tracking-tight">{problem.title}</h1>
          {problem.summary && <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">{problem.summary}</p>}
          {problem.status === "waiting" && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-900/60 bg-amber-950/40 p-3.5 text-xs text-amber-200 sm:text-sm">
              <Clock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong className="font-semibold text-amber-200">{t("waitingForLabel")}:</strong>{" "}
                <span className="text-amber-300/90">{problem.waitingFor || t("waitingBannerDefault")}</span>
              </div>
            </div>
          )}
          <p className="text-xs text-zinc-400">
            {folderLabel(problem.departmentId)}
            {problem.delivery && ` · ${t("deliveryLabel")}: ${problem.delivery}`}
            {problem.dueDate && ` · ${t("due", { date: dueFmt.format(Date.parse(problem.dueDate)) })}`}
          </p>
          {(mayOpen || !isAdmin) && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {mayOpen && (
                <Link href={newTicket} className={`${buttonVariants({ size: "lg" })} w-full sm:w-auto`}>
                  {t("openTicketFor")}
                </Link>
              )}
              {/* A call about this problem: the booking opens inside the portal with this team and problem already chosen. */}
              {!isAdmin && (
                <Link
                  href={{ pathname: "/portal/book", query: { project: slug, problem: id } }}
                  className={`${buttonVariants({ variant: "outline", size: "lg" })} w-full sm:w-auto`}
                >
                  {t("talkAboutProblem")}
                </Link>
              )}
            </div>
          )}
        </header>

        {isAdmin && (
          <ProblemEditor
            locale={locale}
            projectSlug={slug}
            milestoneId={id}
            initial={{
              title: problem.title,
              summary: problem.summary ?? "",
              delivery: problem.delivery ?? "",
              priority: problem.priority,
              status: problem.status,
              waitingFor: problem.waitingFor ?? "",
              solution: problem.solution ?? "",
              links: problem.resources.map((link) => `${link.label} | ${link.url}`).join("\n"),
            }}
          />
        )}

        {/* Action plan */}
        <section className={panel}>
          <div className={band}>
            <span>{t("actionPlan")}</span>
          </div>
          <div className="p-5 sm:p-7">
            {problem.solution ? <Markdown>{problem.solution}</Markdown> : <p className="text-sm text-zinc-500">{problem.description ?? t("noActionPlan")}</p>}
          </div>
        </section>

        {/* Links */}
        {hasLinks && (
          <section className={panel}>
            <div className={band}>
              <span>{t("linksTitle")}</span>
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

        {/* Files shared with whoever can open this problem */}
        <FilesPanel files={sharedFiles} folderLabel={folderLabel} admin={isAdmin ? { locale, projectSlug: slug, milestoneId: id } : undefined} />

        {/* Cost — the database only returns it to people allowed to see costs */}
        {problem.cost && (
          <section className={panel}>
            <div className={band}>
              <span>{t("costTitle")}</span>
              <span className="text-xs font-normal text-zinc-400">{t("costHelp")}</span>
            </div>
            <div className="p-5 sm:p-6">
              <Markdown>{problem.cost}</Markdown>
            </div>
          </section>
        )}

        {/* Ticket history */}
        <section className={panel}>
          <div className={band}>
            <span>{t("ticketHistory")}</span>
            <span className="text-xs font-normal text-zinc-400">{t("openTicketsCount", { count: open })}</span>
          </div>
          {problem.tickets.length === 0 ? (
            <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("noProblemTickets")}</p>
          ) : (
            <TicketList tickets={sortTickets(problem.tickets, "activity")} locale={locale} folderLabel={folderLabel} showFolder={false} timeZone={timeZone} />
          )}
        </section>

        {/* Activity */}
        {hasActivity && (
          <section className={panel}>
            <div className={band}>
              <span>{t("logTitle")}</span>
              <Link href={`/portal/projects/${slug}/log`} className="text-xs font-normal text-zinc-400 hover:text-zinc-200 underline underline-offset-4">
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
