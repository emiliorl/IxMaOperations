import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { updateMilestoneStatus } from "@/app/[locale]/portal/actions";
import { AccessPanel } from "@/components/portal/AccessPanel";
import { FilterSelect } from "@/components/portal/FilterSelect";
import { Highlight } from "@/components/portal/Highlight";
import { Markdown } from "@/components/portal/Markdown";
import { Pill, PriorityDot } from "@/components/portal/Pills";
import { SearchBox } from "@/components/portal/SearchBox";
import { StatusForm } from "@/components/portal/StatusForm";
import { TicketList } from "@/components/portal/TicketList";
import { buttonVariants } from "@/components/ui/Button";
import { MILESTONE_STATUSES, safeHttpUrl } from "@/lib/portal/constants";
import { requireUser } from "@/lib/portal/auth";
import {
  areaSummary,
  inFolder,
  matchesTicketFilter,
  nextPlanSort,
  parsePlanSort,
  parseProjectTab,
  parseSearch,
  parseTicketFilter,
  parseTicketSort,
  planSortParam,
  projectFilterHref,
  resolveFolderFilter,
  searchHit,
  sortProblems,
  sortTickets,
  ticketBucket,
  workspaceStats,
  type PlanSortKey,
  type ProjectTab,
} from "@/lib/portal/filters";
import { isActiveTicket, ticketCountsByProblem } from "@/lib/portal/plan";
import { milestoneBreakdown, milestoneProgress } from "@/lib/portal/progress";
import {
  canOpenTickets,
  canViewProjectLog,
  canWriteIn,
  getProjectAccess,
  getProjectDetail,
  getSearchText,
  listCompanyAccess,
  listCostMilestoneIds,
  listProjectCostFlags,
} from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";
const eyebrow = "font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const REVIEW_LIST_MAX = 3;

export default async function ProjectPage(props: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ dept?: string; tab?: string; q?: string; access?: string; tickets?: string; sort?: string; mine?: string; psort?: string }>;
}) {
  const { locale, slug } = await props.params;
  const {
    dept,
    tab: tabParam,
    q: searchParam,
    access: accessNotice,
    tickets: ticketFilterParam,
    sort: sortParam,
    mine: mineParam,
    psort: planSortParamRaw,
  } = await props.searchParams;
  setRequestLocale(locale);

  const { supabase, user, isAdmin } = await requireUser(locale);
  const project = await getProjectDetail(supabase, slug);
  if (!project) notFound(); // a project you can't see looks exactly like one that doesn't exist

  // Only the project is needed to start all of these, so they run together.
  const [t, access, costItemIds, [companyAccess, costUserIds]] = await Promise.all([
    getTranslations("Portal"),
    getProjectAccess(supabase, user.id, project.id, project.organizationId),
    listCostMilestoneIds(supabase),
    isAdmin
      ? Promise.all([listCompanyAccess(supabase, project.organizationId), listProjectCostFlags(supabase, project.id)])
      : Promise.resolve([[], []] as [Awaited<ReturnType<typeof listCompanyAccess>>, string[]]),
  ]);
  const dueFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  // `project.departments` is already limited by the database to the areas this
  // person can open, so everything below only ever shows what they were given.
  const areaName = new Map(project.departments.map((d) => [d.id, d.name]));
  const hasEveryArea = isAdmin || access.allDepartments || access.orgLevel !== null;
  const hasSeveralAreas = project.departments.length > 1;
  // Someone with exactly one area has nothing to switch between: they just see theirs.
  const onlyArea = !hasEveryArea && project.departments.length === 1 ? project.departments[0] : null;

  // Nothing chosen yet → the person's own area when they have exactly one; "all" → everything they can see.
  const defaultArea = !hasEveryArea && access.departmentIds.length === 1 ? access.departmentIds[0] : null;
  const filterFolder = resolveFolderFilter(dept, new Set(areaName.keys()), defaultArea);
  // What the links below carry along: the area only when the person actually chose one.
  const deptParam = dept === "all" || (dept && areaName.has(dept)) ? dept : undefined;

  const q = parseSearch(searchParam);
  const requestedTab = parseProjectTab(tabParam);
  const ticketFilter = parseTicketFilter(ticketFilterParam);
  const ticketSort = parseTicketSort(sortParam);
  const mine = mineParam === "1";
  const planSort = parsePlanSort(planSortParamRaw);
  // What the search box and the area dropdown carry along, so clearing a search returns to exactly where the person was.
  const withoutSearch: Record<string, string> = {
    ...(deptParam ? { dept: deptParam } : {}),
    ...(requestedTab ? { tab: requestedTab } : {}),
    ...(ticketFilter !== "all" ? { tickets: ticketFilter } : {}),
    ...(ticketSort !== "activity" ? { sort: ticketSort } : {}),
    ...(mine ? { mine: "1" } : {}),
    ...(planSort ? { psort: planSortParam(planSort)! } : {}),
  };
  // With several areas and nothing chosen yet, the page is the area picker (like the projects page); an area, a tab or a search opens the workspace.
  const showAreas = hasSeveralAreas && filterFolder === null && deptParam === undefined && requestedTab === null && q === "";

  const staging = safeHttpUrl(project.stagingUrl);
  const production = safeHttpUrl(project.productionUrl);
  const mayOpenTickets = canOpenTickets(access, isAdmin);
  const showLog = canViewProjectLog(access, isAdmin);
  // The people asked to check a fix: the owner set it, so the owner isn't asked.
  const reviewTickets = project.tickets.filter(
    (ticket) => ticketBucket(ticket.status) === "review" && inFolder(filterFolder, ticket.departmentId)
  );
  const toReview = isAdmin ? [] : reviewTickets.filter((ticket) => canWriteIn(access, false, ticket.departmentId));

  // Opening a ticket from an area keeps that area.
  const newTicketHref = { pathname: `/portal/projects/${slug}/tickets/new`, query: filterFolder ? { dept: filterFolder } : {} };

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {mayOpenTickets && (
        <Link href={newTicketHref} className={buttonVariants({ size: "sm" })}>
          {t("openTicket")}
        </Link>
      )}
      {showLog && (
        <Link href={`/portal/projects/${slug}/log`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          {t("logLink")} →
        </Link>
      )}
    </div>
  );

  const links = (staging || production || project.officeAddress) && (
    <dl className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
      {project.officeAddress && (
        <div className="flex gap-2">
          <dt className={eyebrow}>{t("officeLabel")}</dt>
          <dd className="text-zinc-300">{project.officeLabel ? `${project.officeLabel} — ` : ""}{project.officeAddress}</dd>
        </div>
      )}
      {[
        [t("stagingLabel"), staging],
        [t("productionLabel"), production],
      ].map(
        ([label, url]) =>
          url && (
            <div key={label} className="flex gap-2">
              <dt className={eyebrow}>{label}</dt>
              <dd>
                <a href={url} target="_blank" rel="noreferrer noopener" className="text-zinc-300 underline underline-offset-4 hover:text-white">
                  {new URL(url).host}
                </a>
              </dd>
            </div>
          )
      )}
    </dl>
  );

  // Fixes waiting for the person to check them
  const reviewBanner = toReview.length > 0 && (
    <section role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/[0.04] p-4 space-y-2.5">
      <p className="text-sm font-semibold text-zinc-100">{t("reviewBanner", { count: toReview.length })}</p>
      <ul className="space-y-1.5">
        {toReview.slice(0, REVIEW_LIST_MAX).map((ticket) => (
          <li key={ticket.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="min-w-0 text-zinc-200">
              <span className="font-mono text-xs text-zinc-500">#{ticket.number}</span> {ticket.title}
            </span>
            <Link href={`/portal/tickets/${ticket.id}`} className="shrink-0 text-xs text-zinc-100 underline underline-offset-4 hover:text-white">
              {t("reviewNow")} →
            </Link>
          </li>
        ))}
      </ul>
      {toReview.length > REVIEW_LIST_MAX && (
        <Link
          href={projectFilterHref(slug, { dept: deptParam ?? "all", tab: "tickets", tickets: "review" })}
          className="inline-block text-xs text-zinc-400 underline underline-offset-4 hover:text-zinc-100"
        >
          {t("reviewMore", { count: toReview.length - REVIEW_LIST_MAX })} →
        </Link>
      )}
    </section>
  );

  // ─── Step 1: pick an area ───────────────────────────────────────────────────────────────────────
  if (showAreas) {
    const everything = areaSummary(null, project.milestones, project.tickets);
    return (
      <div className="py-10 md:py-14">
        <div className="container mx-auto px-6 max-w-5xl space-y-8">
          <header className="space-y-3">
            {project.organization && <p className={eyebrow}>{project.organization}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">{project.name}</h1>
              <Pill kind="project" value={project.status} label={t(`projectStatus.${project.status}`)} />
            </div>
            {project.description && <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">{project.description}</p>}
            {!mayOpenTickets && <p className="text-xs text-zinc-500">{t("viewOnlyNote")}</p>}
          </header>

          {/* Search and the two things people come here to do, together at the top. */}
          <div className="flex flex-wrap items-center gap-3">
            <SearchBox
              pathname={`/portal/projects/${slug}`}
              query={{ dept: "all" }}
              initial=""
              live={false}
              className="w-full sm:max-w-sm sm:flex-1"
            />
            {actions}
          </div>

          {reviewBanner}

          <section aria-labelledby="areas-heading" className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="areas-heading" className={eyebrow}>
                <span className="text-zinc-600">{"// 01 "}</span>
                {t("chooseArea")}
              </h2>
              <Link
                href={projectFilterHref(slug, { dept: "all" })}
                className="text-xs text-zinc-400 underline underline-offset-4 hover:text-zinc-100"
              >
                {t("viewAllAreas", { done: everything.done, total: everything.total })} →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.departments.map((d) => {
                const summary = areaSummary(d.id, project.milestones, project.tickets);
                return (
                  <Link
                    key={d.id}
                    href={projectFilterHref(slug, { dept: d.id })}
                    className="group rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-3 transition-all hover:border-zinc-700 hover:-translate-y-px"
                  >
                    {project.organization && <p className={eyebrow}>{project.organization}</p>}
                    <h3 className="text-base font-semibold text-zinc-100 group-hover:text-white">{d.name}</h3>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-baseline justify-between font-mono text-[11px] text-zinc-500">
                        <span>{t("milestonesDone", { done: summary.done, total: summary.total })}</span>
                        <span className="text-zinc-300">{summary.percent}%</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-zinc-800" aria-hidden>
                        <div className="h-full rounded-full bg-zinc-300" style={{ width: `${summary.percent}%` }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[11px]">
                      <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {summary.open > 0 && <span className="text-amber-400">{t("ticketsOpenCount", { count: summary.open })}</span>}
                        {summary.review > 0 && (
                          <span className="text-emerald-400">
                            {summary.review} · {t("ticketFilterReview")}
                          </span>
                        )}
                        {summary.open === 0 && summary.review === 0 && <span className="text-zinc-600">{t("noOpenTickets")}</span>}
                      </span>
                      <span aria-hidden className="text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-200">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {(project.overview || links) && (
            <details className={cn(panel, "group")}>
              <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300">
                <span>
                  <span className="text-zinc-600">{"// 02 "}</span>
                  {t("detailsTitle")}
                </span>
                <span aria-hidden className="transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="space-y-5 border-t border-zinc-800 p-5 sm:p-6">
                {links}
                {project.overview && <Markdown>{project.overview}</Markdown>}
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  // ─── Step 2: one area's workspace, one part at a time ───────────────────────────────────────────
  // The area view's items (that area + project-wide). The progress bar is
  // computed from the SAME list, so it always matches the rows beneath it.
  const areaMilestones = project.milestones.filter((m) => inFolder(filterFolder, m.departmentId));
  const progress = milestoneProgress(areaMilestones);
  const breakdown = milestoneBreakdown(areaMilestones);
  const areaTickets = project.tickets.filter((ticket) => inFolder(filterFolder, ticket.departmentId));
  const stats = workspaceStats(areaMilestones, areaTickets);
  const ticketCounts = ticketCountsByProblem(project.tickets);
  // Only problems that have a code get a label next to their tickets (without one it would just repeat the title).
  const problemLabels = new Map(project.milestones.flatMap((m): [string, string][] => (m.code ? [[m.id, m.code]] : [])));

  // "Mine" is the person's own tickets; the chip counts follow it, so each number is what the chip shows.
  const shownTickets = mine ? areaTickets.filter((ticket) => ticket.createdById === user.id) : areaTickets;
  const ticketStats = workspaceStats([], shownTickets);
  const tickets = sortTickets(
    shownTickets.filter((ticket) => matchesTicketFilter(ticket.status, ticketFilter)),
    ticketSort
  );

  const hasDetails = Boolean(project.overview || links || project.description || !mayOpenTickets);
  const tab: ProjectTab = requestedTab === "details" && !hasDetails ? "plan" : (requestedTab ?? "plan");

  const canReport = (m: { status: string; departmentId: string | null }) =>
    mayOpenTickets && m.status !== "pending" && canWriteIn(access, isAdmin, m.departmentId);
  const areaLabel = (departmentId: string | null) => (departmentId ? (areaName.get(departmentId) ?? "—") : t("deptProjectWide"));
  const memberAreas = (member: (typeof project.team)[number]) => {
    if (member.allDepartments) return t("allFolders");
    const names = member.departmentIds.map((id) => areaName.get(id)).filter((n): n is string => Boolean(n));
    return names.length > 0 ? names.join(", ") : t("noFolders");
  };

  const tabs: { id: ProjectTab; label: string; count?: number; dot?: boolean }[] = [
    { id: "plan", label: t("planTab"), count: areaMilestones.length },
    { id: "tickets", label: t("ticketsTitle"), count: areaTickets.length, dot: toReview.length > 0 },
    { id: "team", label: isAdmin ? t("accessTitle") : t("teamTitle"), count: isAdmin ? undefined : project.team.length },
    ...(hasDetails ? [{ id: "details" as const, label: t("detailsTitle") }] : []),
  ];

  // Filters other than the one a control changes, so no control undoes another.
  const keep = deptParam ? { dept: deptParam } : {};
  const ticketView = { tickets: ticketFilter, sort: ticketSort, mine };
  const areaOptions = [{ value: "all", label: t("deptAll") }, ...project.departments.map((d) => ({ value: d.id, label: d.name }))];
  const chip = (active: boolean) =>
    cn(
      "rounded-md border px-3 py-1.5 text-xs transition-colors",
      active ? "border-zinc-600 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-200"
    );
  // ─── Searching: ONE results page for the whole project, whichever tab or area the match is in ───
  let searchView: ReactNode = null;
  if (q !== "") {
    const RESULT_LIMIT = 50;
    const updatedFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    const found = await getSearchText(supabase, project.id);
    const bestFirst = <T extends { hit: { score: number } }>(a: T, b: T) => b.hit.score - a.hit.score;
    const problemHits = project.milestones
      .flatMap((m) => {
        const hit = searchHit(q, {
          ids: [m.code],
          title: m.title,
          fields: [m.delivery],
          extras: [
            ...(m.summary ? [{ source: "summary", text: m.summary }] : []),
            ...(m.description ? [{ source: "description", text: m.description }] : []),
            ...(found.problems.get(m.id) ?? []),
          ],
        });
        return hit ? [{ m, hit }] : [];
      })
      .sort(bestFirst);
    const ticketHits = project.tickets
      .flatMap((ticket) => {
        const hit = searchHit(q, {
          ids: [ticket.number],
          title: ticket.title,
          fields: [ticket.createdByName, ticket.milestoneId ? problemLabels.get(ticket.milestoneId) : null],
          extras: found.tickets.get(ticket.id) ?? [],
        });
        return hit ? [{ ticket, hit }] : [];
      })
      .sort(bestFirst);

    // Matches per area, so a result in another area is one click away instead of silently missing.
    const countIn = (areaId: string | null) =>
      problemHits.filter(({ m }) => inFolder(areaId, m.departmentId)).length +
      ticketHits.filter(({ ticket }) => inFolder(areaId, ticket.departmentId)).length;
    const resultProblems = problemHits.filter(({ m }) => inFolder(filterFolder, m.departmentId));
    const resultTickets = ticketHits.filter(({ ticket }) => inFolder(filterFolder, ticket.departmentId));
    const total = resultProblems.length + resultTickets.length;
    const elsewhere = countIn(null) - total;
    const scopeLabel = filterFolder ? (areaName.get(filterFolder) ?? "—") : t("deptAll");

    const sectionHead = cn(eyebrow, "border-b border-zinc-800 bg-zinc-900/60 px-5 sm:px-6 py-3");
    const row = "flex flex-wrap items-start gap-x-4 gap-y-2 px-5 sm:px-6 py-3.5 transition-colors hover:bg-zinc-900/50";
    const exactBadge = (score: number) =>
      score === 4 && <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-emerald-400">{t("searchExact")}</span>;
    const excerpt = (extra: { source: string; snippet: string } | null) =>
      extra && (
        <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
          <span className="text-zinc-500">{t(`searchIn.${extra.source}`)}: </span>
          <Highlight text={extra.snippet} query={q} />
        </span>
      );
    const elsewhereLink = elsewhere > 0 && (
      <Link
        href={projectFilterHref(slug, { dept: "all", q })}
        className="text-xs text-zinc-300 underline underline-offset-4 hover:text-white"
      >
        {t("searchElsewhere", { count: elsewhere })} →
      </Link>
    );

    searchView = (
      <div className="space-y-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p role="status" aria-live="polite" className="text-sm text-zinc-300">
            {t("searchSummary", { count: total, query: q })}
            {hasSeveralAreas && <span className="text-zinc-500"> · {scopeLabel}</span>}
          </p>
          {elsewhereLink}
        </div>

        {hasSeveralAreas && (
          <nav aria-label={t("foldersLabel")} className="flex flex-wrap items-center gap-2">
            {[{ id: null as string | null, name: t("deptAll") }, ...project.departments].map((d) => (
              <Link
                key={d.id ?? "all"}
                href={projectFilterHref(slug, { dept: d.id ?? "all", q })}
                aria-current={filterFolder === d.id ? "true" : undefined}
                className={chip(filterFolder === d.id)}
              >
                {d.name}
                <span className="ml-1.5 font-mono text-zinc-500">{countIn(d.id)}</span>
              </Link>
            ))}
          </nav>
        )}

        {total === 0 && (
          <section className={cn(panel, "space-y-2 p-5 sm:p-6")}>
            <p className="text-sm text-zinc-300">{t("searchNoResults", { query: q })}</p>
            <p className="text-xs text-zinc-500">{t("searchTip")}</p>
          </section>
        )}

        {resultProblems.length > 0 && (
          <section aria-label={t("planTab")} className={panel}>
            <h2 className={sectionHead}>
              {t("planTab")} <span className="ml-1 text-zinc-600">{resultProblems.length}</span>
            </h2>
            <ul className="divide-y divide-zinc-800/80">
              {resultProblems.slice(0, RESULT_LIMIT).map(({ m, hit }) => (
                <li key={m.id}>
                  <Link href={`/portal/projects/${slug}/problems/${m.id}`} className={row}>
                    <span className="w-20 shrink-0 font-mono text-xs text-zinc-300">
                      <Highlight text={m.code ?? "—"} query={q} />
                    </span>
                    <span className="min-w-[12rem] flex-1">
                      <span className="block text-sm font-medium text-zinc-100">
                        <Highlight text={m.title} query={q} />
                        {exactBadge(hit.score)}
                      </span>
                      <span className="block font-mono text-[11px] text-zinc-500">{areaLabel(m.departmentId)}</span>
                      {excerpt(hit.extra)}
                    </span>
                    <span className="flex flex-col items-end gap-1.5">
                      <Pill kind="milestone" value={m.status} label={t(`milestoneStatus.${m.status}`)} />
                      <PriorityDot value={m.priority} label={t(`priority.${m.priority}`)} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {resultProblems.length > RESULT_LIMIT && (
              <p className="border-t border-zinc-800 px-5 sm:px-6 py-3 text-xs text-zinc-500">
                {t("searchMore", { shown: RESULT_LIMIT, total: resultProblems.length })}
              </p>
            )}
          </section>
        )}

        {resultTickets.length > 0 && (
          <section aria-label={t("ticketsTitle")} className={panel}>
            <h2 className={sectionHead}>
              {t("ticketsTitle")} <span className="ml-1 text-zinc-600">{resultTickets.length}</span>
            </h2>
            <ul className="divide-y divide-zinc-800/80">
              {resultTickets.slice(0, RESULT_LIMIT).map(({ ticket, hit }) => (
                <li key={ticket.id}>
                  <Link href={`/portal/tickets/${ticket.id}`} className={cn(row, !isActiveTicket(ticket.status) && "opacity-70 hover:opacity-100")}>
                    <span className="w-20 shrink-0 font-mono text-xs text-zinc-300">
                      #<Highlight text={String(ticket.number)} query={q} />
                    </span>
                    <span className="min-w-[12rem] flex-1">
                      <span className="block text-sm font-medium text-zinc-100">
                        <Highlight text={ticket.title} query={q} />
                        {exactBadge(hit.score)}
                      </span>
                      <span className="block font-mono text-[11px] text-zinc-500">
                        {[areaLabel(ticket.departmentId), ticket.createdByName, updatedFmt.format(Date.parse(ticket.updatedAt))].filter(Boolean).join(" · ")}
                      </span>
                      {excerpt(hit.extra)}
                    </span>
                    <span className="flex flex-col items-end gap-1.5">
                      <Pill kind="ticketStatus" value={ticket.status} label={t(`ticketStatus.${ticket.status}`)} />
                      <Pill kind="priority" value={ticket.priority} label={t(`priority.${ticket.priority}`)} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {resultTickets.length > RESULT_LIMIT && (
              <p className="border-t border-zinc-800 px-5 sm:px-6 py-3 text-xs text-zinc-500">
                {t("searchMore", { shown: RESULT_LIMIT, total: resultTickets.length })}
              </p>
            )}
          </section>
        )}
      </div>
    );
  }

  const problems = sortProblems(areaMilestones, planSort, { areaLabel, openTickets: (id) => ticketCounts.get(id)?.open ?? 0 });
  const sortHead = (key: PlanSortKey, label: string, className?: string) => {
    const active = planSort?.key === key;
    return (
      <th scope="col" aria-sort={active ? (planSort!.desc ? "descending" : "ascending") : undefined} className={cn("px-3 py-3 font-normal", className)}>
        <Link
          href={projectFilterHref(slug, { ...keep, tab: "plan", psort: planSortParam(nextPlanSort(planSort, key)) })}
          aria-label={t("sortBy", { column: label })}
          className={cn("inline-flex items-center gap-1 transition-colors hover:text-zinc-200", active && "text-zinc-100")}
        >
          {label}
          <span aria-hidden className={active ? "text-zinc-300" : "text-zinc-700"}>
            {active ? (planSort!.desc ? "▼" : "▲") : "↕"}
          </span>
        </Link>
      </th>
    );
  };

  return (
    <div className="pt-8 pb-10 md:pt-10 md:pb-14">
      <div className="container mx-auto px-6 max-w-5xl space-y-5">
        {/* Where am I, and the way back to the areas */}
        <header className="space-y-3">
          {hasSeveralAreas ? (
            <nav aria-label={t("areaSwitcher")} className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
              <Link href={`/portal/projects/${slug}`} className="underline underline-offset-4 hover:text-zinc-200">
                ← {t("backToAreas")}
              </Link>
              <span aria-hidden>/</span>
              <span className="text-zinc-300">{filterFolder ? (areaName.get(filterFolder) ?? "—") : t("deptAll")}</span>
            </nav>
          ) : (
            (project.organization || onlyArea) && (
              <p className={eyebrow}>{[project.organization, onlyArea?.name].filter(Boolean).join(" · ")}</p>
            )
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">{project.name}</h1>
              <Pill kind="project" value={project.status} label={t(`projectStatus.${project.status}`)} />
            </div>
            {actions}
          </div>
        </header>

        {/* Find things instead of scrolling for them */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <SearchBox
            pathname={`/portal/projects/${slug}`}
            query={withoutSearch}
            initial={q}
            focusOnMount={q !== ""}
            className="w-full sm:max-w-sm sm:flex-1"
          />
          {hasSeveralAreas && q === "" && (
            <FilterSelect
              label={t("foldersLabel")}
              pathname={`/portal/projects/${slug}`}
              param="dept"
              value={filterFolder ?? "all"}
              options={areaOptions}
              query={withoutSearch}
            />
          )}
        </div>

        {q !== "" ? (
          searchView
        ) : (
          <>
            {/* The numbers that matter, each one a shortcut to the list behind it. */}
            <section aria-label={t("statsLabel")} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  key: "progress",
                  label: t("progress"),
                  value: `${progress.percent}%`,
                  hint: t("milestonesDone", { done: progress.done, total: progress.total }),
                  tone: "",
                  href: projectFilterHref(slug, { ...keep, tab: "plan" }),
                },
                {
                  key: "open",
                  label: t("ticketFilterOpen"),
                  value: String(stats.open),
                  hint: t("statOpenHint"),
                  tone: stats.open > 0 ? "text-amber-400" : "",
                  href: projectFilterHref(slug, { ...keep, tab: "tickets", tickets: "open" }),
                },
                {
                  key: "review",
                  label: t("ticketFilterReview"),
                  value: String(stats.review),
                  hint: t("statReviewHint"),
                  tone: stats.review > 0 ? "text-emerald-400" : "",
                  href: projectFilterHref(slug, { ...keep, tab: "tickets", tickets: "review" }),
                },
                {
                  key: "blocked",
                  label: t("milestoneStatus.blocked"),
                  value: String(stats.blocked),
                  hint: t("statBlockedHint"),
                  tone: stats.blocked > 0 ? "text-red-400" : "",
                  href: projectFilterHref(slug, { ...keep, tab: "plan" }),
                },
              ].map((stat) => (
                <Link
                  key={stat.key}
                  href={stat.href}
                  className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 transition-colors hover:border-zinc-700"
                >
                  <p className={eyebrow}>{stat.label}</p>
                  <p className={cn("mt-1 text-2xl font-semibold tabular-nums text-zinc-100", stat.tone)}>{stat.value}</p>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">{stat.hint}</p>
                </Link>
              ))}
            </section>

            {reviewBanner}

            {/* The parts of the project, one at a time. Stays in view while the list scrolls. */}
            <nav
              aria-label={project.name}
              className="sticky top-14 z-30 -mx-6 flex gap-1 overflow-x-auto border-b border-zinc-800 bg-[#09090b]/90 px-6 backdrop-blur-md"
            >
              {tabs.map((item) => (
                <Link
                  key={item.id}
                  href={projectFilterHref(slug, { ...keep, tab: item.id, ...(item.id === "tickets" ? ticketView : {}), ...(item.id === "plan" ? { psort: planSortParam(planSort) } : {}) })}
                  aria-current={tab === item.id ? "page" : undefined}
                  className={cn(
                    "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors",
                    tab === item.id ? "border-zinc-200 text-zinc-50" : "border-transparent text-zinc-500 hover:text-zinc-200"
                  )}
                >
                  {item.label}
                  {item.count !== undefined && (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">{item.count}</span>
                  )}
                  {item.dot && <span role="img" aria-label={t("ticketFilterReview")} className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                </Link>
              ))}
            </nav>

            {/* Plan */}
            {tab === "plan" && (
              <section className={panel}>
                <div className="space-y-1.5 border-b border-zinc-800 bg-zinc-900/40 p-5">
                  <div className={cn(eyebrow, "flex items-baseline justify-between")}>
                    <span>
                      {t("progress")}
                      {filterFolder && (
                        <span className="ml-2 normal-case tracking-normal text-zinc-600">{t("progressScope", { folder: areaName.get(filterFolder) ?? "—" })}</span>
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
                  {breakdown.length > 0 && (
                    <p aria-label={t("breakdownLabel")} className="flex flex-wrap gap-x-3 gap-y-1 pt-1 font-mono text-[11px] text-zinc-500">
                      {breakdown.map(({ status, count }) => (
                        <span key={status} className={status === "blocked" ? "text-red-400" : undefined}>
                          {count} {t(`milestoneStatus.${status}`)}
                        </span>
                      ))}
                    </p>
                  )}
                </div>

                {areaMilestones.length === 0 ? (
                  <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("noMilestones")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] border-collapse text-left">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                          {sortHead("code", t("colId"), "w-24 pl-5 sm:pl-6")}
                          {sortHead("title", t("colProblem"))}
                          {hasSeveralAreas && sortHead("area", t("fieldDepartment"), "w-32")}
                          {sortHead("status", t("statusLabel"), "w-40")}
                          {sortHead("priority", t("fieldPriority"), "w-28")}
                          {sortHead("tickets", t("ticketsTitle"), "w-36")}
                          {sortHead("due", t("colDue"), "w-28 pr-5 sm:pr-6")}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/80">
                        {problems.map((m) => {
                          const counts = ticketCounts.get(m.id) ?? { open: 0, total: 0 };
                          const problemHref = `/portal/projects/${slug}/problems/${m.id}`;
                          return (
                            <tr key={m.id} className="align-top transition-colors hover:bg-zinc-900/50">
                              <td className="py-3.5 pl-5 sm:pl-6 pr-3">
                                <Link href={problemHref} className="font-mono text-xs font-medium text-zinc-200 underline underline-offset-4 hover:text-white">
                                  {m.code ?? "—"}
                                </Link>
                              </td>
                              <td className="px-3 py-3.5">
                                {/* The title is the link, with a visible cue that it opens the action plan. */}
                                <Link href={problemHref} className="group/plan text-sm font-medium text-zinc-100 hover:text-white">
                                  {m.title}
                                  <span className="ml-2 text-xs font-normal text-zinc-500 transition-colors group-hover/plan:text-zinc-200">{t("viewPlan")} →</span>
                                </Link>
                                {costItemIds.has(m.id) && (
                                  <span className="ml-2 rounded-md border border-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">{t("costTitle")}</span>
                                )}
                                {(m.summary ?? m.description) && (
                                  <p className="mt-1 line-clamp-2 max-w-xl text-xs leading-relaxed text-zinc-500">{m.summary ?? m.description}</p>
                                )}
                              </td>
                              {hasSeveralAreas && <td className="px-3 py-3.5 font-mono text-[11px] text-zinc-400">{areaLabel(m.departmentId)}</td>}
                              <td className="px-3 py-3.5">
                                {isAdmin ? (
                                  <StatusForm
                                    action={updateMilestoneStatus}
                                    hidden={{ locale, milestoneId: m.id }}
                                    current={m.status}
                                    options={MILESTONE_STATUSES.map((status) => ({ value: status, label: t(`milestoneStatus.${status}`) }))}
                                    ariaLabel={t("statusLabel")}
                                  />
                                ) : (
                                  <Pill kind="milestone" value={m.status} label={t(`milestoneStatus.${m.status}`)} />
                                )}
                              </td>
                              <td className="px-3 py-3.5">
                                <PriorityDot value={m.priority} label={t(`priority.${m.priority}`)} />
                              </td>
                              <td className="px-3 py-3.5">
                                {/* A pending item hasn't started, so there's nothing to report on yet. */}
                                <div className="flex flex-col items-start gap-1.5">
                                  {counts.open > 0 ? (
                                    <Link
                                      href={problemHref}
                                      className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] text-amber-300 hover:bg-amber-500/15"
                                    >
                                      {t("ticketsOpenCount", { count: counts.open })}
                                    </Link>
                                  ) : (
                                    <span className="font-mono text-[11px] text-zinc-600">—</span>
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
                              </td>
                              <td className="py-3.5 pl-3 pr-5 sm:pr-6 font-mono text-[11px] text-zinc-400">
                                {m.dueDate ? dueFmt.format(Date.parse(m.dueDate)) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* Tickets — every ticket together; the ones still open come first and are highlighted */}
            {tab === "tickets" && (
              <section className={panel}>
                {areaTickets.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-zinc-800 bg-zinc-900/40 px-5 py-3">
                    <nav aria-label={t("ticketsTitle")} className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          ["all", t("ticketFilterAll"), shownTickets.length],
                          ["open", t("ticketFilterOpen"), ticketStats.open],
                          ["review", t("ticketFilterReview"), ticketStats.review],
                          ["solved", t("ticketFilterSolved"), ticketStats.solved],
                        ] as const
                      ).map(([value, label, count]) => (
                        <Link
                          key={value}
                          href={projectFilterHref(slug, { ...keep, tab: "tickets", ...ticketView, tickets: value })}
                          aria-current={ticketFilter === value ? "true" : undefined}
                          className={chip(ticketFilter === value)}
                        >
                          {label}
                          <span className="ml-1.5 font-mono text-zinc-500">{count}</span>
                        </Link>
                      ))}
                      <span aria-hidden className="mx-1 h-4 w-px bg-zinc-800" />
                      <Link
                        href={projectFilterHref(slug, { ...keep, tab: "tickets", ...ticketView, mine: !mine })}
                        aria-pressed={mine}
                        className={chip(mine)}
                      >
                        {t("ticketsMine")}
                      </Link>
                    </nav>
                    <FilterSelect
                      label={t("sortLabel")}
                      pathname={`/portal/projects/${slug}`}
                      param="sort"
                      value={ticketSort}
                      options={[
                        { value: "activity", label: t("sortActivity") },
                        { value: "priority", label: t("sortPriority") },
                        { value: "newest", label: t("sortNewest") },
                      ]}
                      query={{ ...withoutSearch, tab: "tickets" }}
                    />
                  </div>
                )}
                {areaTickets.length === 0 ? (
                  <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("noTickets")}</p>
                ) : tickets.length === 0 ? (
                  <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("noTicketsFilter")}</p>
                ) : (
                  <TicketList tickets={tickets} locale={locale} folderLabel={areaLabel} problemCodes={problemLabels} showFolder={filterFolder === null} />
                )}
              </section>
            )}

            {/* Team — the owner manages access here, so the read-only list would only repeat it */}
            {tab === "team" &&
              (isAdmin ? (
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
              ) : (
                <section className={panel}>
                  <ul className="divide-y divide-zinc-800/80">
                    {project.team.map((member) => (
                      <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-3">
                        <span className="text-sm text-zinc-100">{member.name}</span>
                        <span className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5",
                              member.role === "lead" ? "border-zinc-600 text-zinc-200" : "border-zinc-800 text-zinc-500"
                            )}
                          >
                            {t(`memberRole.${member.role}`)}
                          </span>
                          {memberAreas(member)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

            {/* Details — never holds costs; those live on each problem and are access-controlled */}
            {tab === "details" && (
              <section className={cn(panel, "space-y-5 p-5 sm:p-6")}>
                {project.description && <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl">{project.description}</p>}
                {links}
                {!mayOpenTickets && <p className="text-xs text-zinc-500">{t("viewOnlyNote")}</p>}
                {project.overview && (
                  <div className="border-t border-zinc-800 pt-5">
                    <Markdown>{project.overview}</Markdown>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
