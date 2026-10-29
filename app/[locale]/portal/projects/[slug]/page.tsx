import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { updateMilestoneStatus } from "@/app/[locale]/portal/actions";
import { AccessPanel } from "@/components/portal/AccessPanel";
import { selectClass } from "@/components/portal/Field";
import { Pill } from "@/components/portal/Pills";
import { PortalBar } from "@/components/portal/PortalBar";
import { buttonVariants } from "@/components/ui/Button";
import { MILESTONE_STATUSES, safeHttpUrl } from "@/lib/portal/constants";
import { requireUser } from "@/lib/portal/auth";
import { milestoneProgress } from "@/lib/portal/progress";
import { canOpenTickets, getProjectAccess, getProjectDetail, listCompanyAccess } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";

export default async function ProjectPage(props: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ dept?: string; access?: string }>;
}) {
  const { locale, slug } = await props.params;
  const { dept, access: accessNotice } = await props.searchParams;
  setRequestLocale(locale);

  const { supabase, user, name, isAdmin } = await requireUser(locale);
  const project = await getProjectDetail(supabase, slug);
  if (!project) notFound(); // a project you can't see looks exactly like one that doesn't exist

  const t = await getTranslations("Portal");
  const access = await getProjectAccess(supabase, user.id, project.id, project.organizationId);
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const dueFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  // `project.departments` is already limited by the database to the folders this
  // person can open, so everything below only ever shows what they were given.
  const folderName = new Map(project.departments.map((d) => [d.id, d.name]));
  const hasEveryFolder = isAdmin || access.allDepartments || access.orgLevel !== null;

  // Filter: no choice yet → the person's own folder when they have exactly one;
  // "all" → everything they can see.
  const defaultFolder = !hasEveryFolder && access.departmentIds.length === 1 ? access.departmentIds[0] : null;
  const filterFolder = dept === "all" ? null : dept && folderName.has(dept) ? dept : dept === undefined ? defaultFolder : null;
  const matches = (departmentId: string | null) => filterFolder === null || departmentId === null || departmentId === filterFolder;

  const progress = milestoneProgress(project.milestones);
  const milestones = project.milestones.filter((m) => matches(m.departmentId));
  const tickets = project.tickets.filter((ticket) => matches(ticket.departmentId));
  const staging = safeHttpUrl(project.stagingUrl);
  const production = safeHttpUrl(project.productionUrl);
  const mayOpenTickets = canOpenTickets(access, isAdmin);
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

  const companyAccess = isAdmin ? await listCompanyAccess(supabase, project.organizationId) : [];

  return (
    <>
      <PortalBar name={name} isAdmin={isAdmin} locale={locale} />
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

          {/* Folders */}
          {project.departments.length > 0 && (
            <nav aria-label={t("foldersLabel")} className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 mr-1">{t("foldersLabel")}</span>
              <Link href={{ pathname: `/portal/projects/${slug}`, query: { dept: "all" } }} className={chip(filterFolder === null)}>
                {t("deptAll")}
              </Link>
              {project.departments.map((d) => (
                <Link
                  key={d.id}
                  href={{ pathname: `/portal/projects/${slug}`, query: { dept: d.id } }}
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
                  <span>{t("progress")}</span>
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
                  {milestones.map((m) => (
                    <li key={m.id} className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill kind="milestone" value={m.status} label={t(`milestoneStatus.${m.status}`)} />
                          <span className="text-sm text-zinc-100">{m.title}</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          {folderLabel(m.departmentId)}
                          {m.dueDate && ` · ${t("due", { date: dueFmt.format(Date.parse(m.dueDate)) })}`}
                        </p>
                        {m.description && <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">{m.description}</p>}
                      </div>
                      {isAdmin && (
                        <form action={updateMilestoneStatus} className="flex items-center gap-2">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="projectSlug" value={slug} />
                          <input type="hidden" name="milestoneId" value={m.id} />
                          <select name="status" defaultValue={m.status} aria-label={t("statusLabel")} className={cn(selectClass, "h-8 w-auto text-xs")}>
                            {MILESTONE_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {t(`milestoneStatus.${status}`)}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className={buttonVariants({ variant: "secondary", size: "sm" })}>
                            {t("save")}
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 02 Tickets */}
          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{"// 02 "}</span>
                {t("ticketsTitle")}
              </span>
              {mayOpenTickets && (
                <Link href={`/portal/projects/${slug}/tickets/new`} className={buttonVariants({ size: "sm" })}>
                  {t("newTicket")}
                </Link>
              )}
            </div>
            {tickets.length === 0 ? (
              <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("noTickets")}</p>
            ) : (
              <ul className="divide-y divide-zinc-800/80">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/portal/tickets/${ticket.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 sm:px-6 py-3.5 hover:bg-zinc-900/60 transition-colors"
                    >
                      <span className="font-mono text-xs text-zinc-500 w-10 shrink-0">#{ticket.number}</span>
                      <span className="flex-1 min-w-[12rem] text-sm text-zinc-100">{ticket.title}</span>
                      <span className="font-mono text-[11px] text-zinc-500">{folderLabel(ticket.departmentId)}</span>
                      <Pill kind="priority" value={ticket.priority} label={t(`priority.${ticket.priority}`)} />
                      <Pill kind="ticketStatus" value={ticket.status} label={t(`ticketStatus.${ticket.status}`)} />
                      <span className="font-mono text-[11px] text-zinc-600 w-24 text-right">{dateFmt.format(Date.parse(ticket.createdAt))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
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
              notice={accessNotice === "saved" || accessNotice === "error" ? accessNotice : null}
            />
          )}
        </div>
      </div>
    </>
  );
}
