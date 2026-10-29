import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { updateMilestoneStatus } from "@/app/[locale]/portal/actions";
import { AccessPanel } from "@/components/portal/AccessPanel";
import { Markdown } from "@/components/portal/Markdown";
import { Pill } from "@/components/portal/Pills";
import { StatusForm } from "@/components/portal/StatusForm";
import { TicketList } from "@/components/portal/TicketList";
import { buttonVariants } from "@/components/ui/Button";
import { MILESTONE_STATUSES, safeHttpUrl } from "@/lib/portal/constants";
import { requireUser } from "@/lib/portal/auth";
import { inFolder, matchesTicketFilter, parseTicketFilter, projectFilterHref, resolveFolderFilter, ticketBucket } from "@/lib/portal/filters";
import { ticketCountsByProblem } from "@/lib/portal/plan";
import { milestoneProgress } from "@/lib/portal/progress";
import {
  canOpenTickets,
  canWriteIn,
  getProjectAccess,
  getProjectDetail,
  listCompanyAccess,
  listProjectCostFlags,
} from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";

export default async function ProjectPage(props: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ dept?: string; access?: string; tickets?: string }>;
}) {
  const { locale, slug } = await props.params;
  const { dept, access: accessNotice, tickets: ticketFilterParam } = await props.searchParams;
  setRequestLocale(locale);

  const { supabase, user, isAdmin } = await requireUser(locale);
  const project = await getProjectDetail(supabase, slug);
  if (!project) notFound(); // a project you can't see looks exactly like one that doesn't exist

  // Only the project is needed to start all of these, so they run together.
  const [t, access, [companyAccess, costUserIds]] = await Promise.all([
    getTranslations("Portal"),
    getProjectAccess(supabase, user.id, project.id, project.organizationId),
    isAdmin
      ? Promise.all([listCompanyAccess(supabase, project.organizationId), listProjectCostFlags(supabase, project.id)])
      : Promise.resolve([[], []] as [Awaited<ReturnType<typeof listCompanyAccess>>, string[]]),
  ]);
  const dueFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  // `project.departments` is already limited by the database to the folders this
  // person can open, so everything below only ever shows what they were given.
  const folderName = new Map(project.departments.map((d) => [d.id, d.name]));
  const hasEveryFolder = isAdmin || access.allDepartments || access.orgLevel !== null;

  // Filter: no choice yet → the person's own folder when they have exactly one;
  // "all" → everything they can see.
  const defaultFolder = !hasEveryFolder && access.departmentIds.length === 1 ? access.departmentIds[0] : null;
  const filterFolder = resolveFolderFilter(dept, new Set(folderName.keys()), defaultFolder);
  // What the links below carry along: the folder only when the person actually chose one.
  const deptParam = dept === "all" || (dept && folderName.has(dept)) ? dept : undefined;

  // The folder view's items (that folder + project-wide). The progress bar is
  // computed from the SAME list, so it always matches the rows beneath it.
  const milestones = project.milestones.filter((m) => inFolder(filterFolder, m.departmentId));
  const progress = milestoneProgress(milestones);
  const folderTickets = project.tickets.filter((ticket) => inFolder(filterFolder, ticket.departmentId));
  const openCount = folderTickets.filter((ticket) => ticketBucket(ticket.status) === "open").length;
  const reviewCount = folderTickets.filter((ticket) => ticketBucket(ticket.status) === "review").length;
  const ticketFilter = parseTicketFilter(ticketFilterParam);
  const tickets = folderTickets.filter((ticket) => matchesTicketFilter(ticket.status, ticketFilter));
  const ticketCounts = ticketCountsByProblem(project.tickets);
  // Only problems that have a code get a label next to their tickets (without one it would just repeat the title).
  const problemLabels = new Map(project.milestones.flatMap((m): [string, string][] => (m.code ? [[m.id, m.code]] : [])));
  const staging = safeHttpUrl(project.stagingUrl);
  const production = safeHttpUrl(project.productionUrl);
  const mayOpenTickets = canOpenTickets(access, isAdmin);
  const canReport = (m: { status: string; departmentId: string | null }) =>
    mayOpenTickets && m.status !== "pending" && canWriteIn(access, isAdmin, m.departmentId);
  const folderLabel = (departmentId: string | null) => (departmentId ? (folderName.get(departmentId) ?? "—") : t("deptProjectWide"));

  const memberFolders = (member: (typeof project.team)[number]) => {
    if (member.allDepartments) return t("allFolders");
    const names = member.departmentIds.map((id) => folderName.get(id)).filter((n): n is string => Boolean(n));
    return names.length > 0 ? names.join(", ") : t("noFolders");
  };

  const chip = (active: boolean) =>
    cn(
      "rounded-md border px-3 py-1.5 text-xs transition-colors",
      active ? "border-zinc-600 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-200"
    );

  return (
    <>
      <div className="py-10 md:py-14">
        <div className="container mx-auto px-6 max-w-5xl space-y-8">
          {/* Heading */}
          <header className="space-y-3">
            {project.organization && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{project.organization}</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">{project.name}</h1>
              <Pill kind="project" value={project.status} label={t(`projectStatus.${project.status}`)} />
            </div>
            {project.description && <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">{project.description}</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {mayOpenTickets && (
                <Link href={`/portal/projects/${slug}/tickets/new`} className={buttonVariants({ size: "sm" })}>
                  {t("openTicket")}
                </Link>
              )}
              <Link href={`/portal/projects/${slug}/log`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                {t("logLink")} →
              </Link>
            </div>
            {(project.officeAddress || staging || production) && (
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-xs pt-1">
                {project.officeAddress && (
                  <div className="flex gap-2">
                    <dt className="font-mono uppercase tracking-wider text-zinc-500">{t("officeLabel")}</dt>
                    <dd className="text-zinc-300">{project.officeLabel ? `${project.officeLabel} — ` : ""}{project.officeAddress}</dd>
                  </div>
                )}
                {staging && (
                  <div className="flex gap-2">
                    <dt className="font-mono uppercase tracking-wider text-zinc-500">{t("stagingLabel")}</dt>
                    <dd>
                      <a href={staging} target="_blank" rel="noreferrer noopener" className="text-zinc-300 underline underline-offset-4 hover:text-white">
                        {new URL(staging).host}
                      </a>
                    </dd>
                  </div>
                )}
                {production && (
                  <div className="flex gap-2">
                    <dt className="font-mono uppercase tracking-wider text-zinc-500">{t("productionLabel")}</dt>
                    <dd>
                      <a href={production} target="_blank" rel="noreferrer noopener" className="text-zinc-300 underline underline-offset-4 hover:text-white">
                        {new URL(production).host}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
            {!mayOpenTickets && <p className="text-xs text-zinc-500 pt-1">{t("viewOnlyNote")}</p>}
            {isAdmin && (accessNotice === "saved" || accessNotice === "error") && (
              <p role="status" className={cn("text-xs pt-1", accessNotice === "saved" ? "text-green-500" : "text-red-400")}>
                {accessNotice === "saved" ? t("accessSaved") : t("accessError")}{" "}
                <a href="#access" className="underline underline-offset-4">{t("accessTitle")} ↓</a>
              </p>
            )}
          </header>

          {/* Overview (never holds costs — those live on each problem and are access-controlled) */}
          {project.overview && (
            <details className={cn(panel, "group")}>
              <summary className={cn(band, "cursor-pointer list-none select-none hover:text-zinc-300")}>
                <span>
                  <span className="text-zinc-600">{"// 00 "}</span>
                  {t("overviewTitle")}
                </span>
                <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="p-5 sm:p-6">
                <Markdown>{project.overview}</Markdown>
              </div>
            </details>
          )}

          {/* Folders */}
          {project.departments.length > 0 && (
            <nav aria-label={t("foldersLabel")} className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 mr-1">{t("foldersLabel")}</span>
              <Link href={projectFilterHref(slug, { dept: "all", tickets: ticketFilter })} className={chip(filterFolder === null)}>
                {t("deptAll")}
              </Link>
              {project.departments.map((d) => (
                <Link
                  key={d.id}
                  href={projectFilterHref(slug, { dept: d.id, tickets: ticketFilter })}
                  className={chip(filterFolder === d.id)}
                >
                  {d.name}
                  {!hasEveryFolder && access.departmentIds.includes(d.id) && <span className="ml-1.5 text-zinc-600">· {t("yourDepartment")}</span>}
                </Link>
              ))}
            </nav>
          )}

          {/* 01 Plan */}
          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{"// 01 "}</span>
                {t("planTitle")}
              </span>
              <span className="normal-case tracking-normal text-zinc-500">
                {t("milestonesDone", { done: progress.done, total: progress.total })}
              </span>
            </div>
            <div className="p-5 sm:p-6 space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                  <span>
                    {t("progress")}
                    {filterFolder && (
                      <span className="ml-2 normal-case tracking-normal text-zinc-600">{t("progressScope", { folder: folderName.get(filterFolder) ?? "—" })}</span>
                    )}
                  </span>
                  <span className="text-zinc-300">{progress.percent}%</span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full bg-zinc-800"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.percent}
                >
                  <div className="h-full rounded-full bg-zinc-300" style={{ width: `${progress.percent}%` }} />
                </div>
              </div>

              {milestones.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("noMilestones")}</p>
              ) : (
                <ul className="divide-y divide-zinc-800/80">
                  {milestones.map((m) => {
                    const counts = ticketCounts.get(m.id) ?? { open: 0, total: 0 };
                    const problemHref = `/portal/projects/${slug}/problems/${m.id}`;
                    return (
                    <li key={m.id} className="py-4 first:pt-0 last:pb-0 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {m.code && <span className="font-mono text-xs text-zinc-400">{m.code}</span>}
                          <Pill kind="milestone" value={m.status} label={t(`milestoneStatus.${m.status}`)} />
                          {m.priority === "high" && <Pill kind="priority" value="high" label={t("problemPriority.high")} />}
                        </div>
                        <Link href={problemHref} className="block text-sm font-medium text-zinc-100 hover:text-white">
                          {m.title}
                        </Link>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          {folderLabel(m.departmentId)}
                          {m.delivery && ` · ${m.delivery}`}
                          {m.dueDate && ` · ${t("due", { date: dueFmt.format(Date.parse(m.dueDate)) })}`}
                        </p>
                        {(m.summary ?? m.description) && (
                          <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">{m.summary ?? m.description}</p>
                        )}
                        {/* The title above opens the item. A pending item hasn't started, so there's nothing to report on yet. */}
                        {(counts.open > 0 || canReport(m)) && (
                          <div className="flex flex-wrap items-center gap-3 pt-1.5">
                            {counts.open > 0 && (
                              <Link
                                href={problemHref}
                                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 font-mono text-[11px] text-amber-300 hover:bg-amber-500/15"
                              >
                                {t("openTicketsCount", { count: counts.open })}
                              </Link>
                            )}
                            {canReport(m) && (
                              <Link
                                href={{ pathname: `/portal/projects/${slug}/tickets/new`, query: { item: m.id } }}
                                className="text-xs text-zinc-400 underline underline-offset-4 hover:text-zinc-100"
                              >
                                {t("reportIssue")} →
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <StatusForm
                          action={updateMilestoneStatus}
                          hidden={{ locale, milestoneId: m.id }}
                          current={m.status}
                          options={MILESTONE_STATUSES.map((status) => ({ value: status, label: t(`milestoneStatus.${status}`) }))}
                          ariaLabel={t("statusLabel")}
                        />
                      )}
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* 02 Tickets — every ticket together; the ones still open come first and are highlighted */}
          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{"// 02 "}</span>
                {t("ticketsTitle")}
                {openCount > 0 && <span className="ml-3 text-amber-400">{t("ticketsOpenCount", { count: openCount })}</span>}
                {reviewCount > 0 && <span className="ml-3 text-emerald-400">{reviewCount} · {t("ticketFilterReview")}</span>}
              </span>
            </div>
            {folderTickets.length > 0 && (
              <nav aria-label={t("ticketsTitle")} className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 px-5 sm:px-6 py-3">
                {(
                  [
                    ["all", t("ticketFilterAll")],
                    ["open", t("ticketFilterOpen")],
                    ["review", t("ticketFilterReview")],
                    ["solved", t("ticketFilterSolved")],
                  ] as const
                ).map(([value, label]) => (
                  <Link
                    key={value}
                    href={projectFilterHref(slug, { dept: deptParam, tickets: value })}
                    className={chip(ticketFilter === value)}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            )}
            {folderTickets.length === 0 ? (
              <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("noTickets")}</p>
            ) : tickets.length === 0 ? (
              <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("noTicketsFilter")}</p>
            ) : (
              <TicketList tickets={tickets} locale={locale} folderLabel={folderLabel} problemCodes={problemLabels} />
            )}
          </section>

          {/* 03 Team */}
          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{"// 03 "}</span>
                {t("teamTitle")}
              </span>
            </div>
            <ul className="divide-y divide-zinc-800/80">
              {project.team.map((member) => (
                <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3">
                  <span className="text-sm text-zinc-100">{member.name}</span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {t(`memberRole.${member.role}`)} · {memberFolders(member)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 04 Access — owner only */}
          {isAdmin && (
            <AccessPanel
              locale={locale}
              projectSlug={slug}
              organizationId={project.organizationId}
              departments={project.departments}
              team={project.team}
              companyAccess={companyAccess}
              costUserIds={costUserIds}
              notice={accessNotice === "saved" || accessNotice === "error" ? accessNotice : null}
            />
          )}
        </div>
      </div>
    </>
  );
}
