import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { FilterSelect } from "@/components/portal/FilterSelect";
import { LogList } from "@/components/portal/LogList";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";
import { inFolder } from "@/lib/portal/filters";
import { filterEvents, logHref, parseFilter, parseWeek, recentWeeks, summarize, weekRange, type LogFilter } from "@/lib/portal/log";
import { canViewProjectLog, getMyTimeZone, getProjectAccess, getProjectEvents, getProjectShell } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

const EVENT_LIMIT = 500;

export default async function ProjectLogPage(props: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ week?: string; type?: string; area?: string }>;
}) {
  const { locale, slug } = await props.params;
  const { week: weekParam, type, area: areaParam } = await props.searchParams;
  setRequestLocale(locale);

  const { supabase, user, isAdmin } = await requireUser(locale);
  const project = await getProjectShell(supabase, slug);
  if (!project) notFound();

  // The log is for leaders (owner, executives, team leads). Anyone else goes back to the project.
  const access = await getProjectAccess(supabase, user.id, project.id, project.organizationId);
  if (!canViewProjectLog(access, isAdmin)) redirect({ href: `/portal/projects/${slug}`, locale });

  // Weeks and times are the person's own, not the owner's.
  const timeZone = await getMyTimeZone(supabase, user.id);
  const now = Date.now();
  const week = parseWeek(weekParam, now, timeZone);
  const filter = parseFilter(type);
  const areaIds = new Set(project.departments.map((d) => d.id));
  const area = areaParam && areaIds.has(areaParam) ? areaParam : null; // null = every area

  // Row-level security limits the events to the areas this person can open.
  const [t, allEntries] = await Promise.all([
    getTranslations("Portal"),
    getProjectEvents(supabase, project.id, week === "all" ? null : weekRange(week, timeZone), EVENT_LIMIT),
  ]);
  const entries = allEntries.filter((entry) => inFolder(area, entry.departmentId));
  const counts = summarize(entries);
  const shown = filterEvents(entries, filter);

  const folderName = new Map(project.departments.map((d) => [d.id, d.name]));
  const folderLabel = (departmentId: string | null) => (departmentId ? (folderName.get(departmentId) ?? "—") : t("deptProjectWide"));

  const mondayFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const weekOptions = [
    ...recentWeeks(now, timeZone, 6).map((monday, i) => ({
      value: monday,
      label: i === 0 ? t("logThisWeek") : t("logWeekOf", { date: mondayFmt.format(Date.parse(`${monday}T00:00:00Z`)) }),
    })),
    { value: "all", label: t("logAllTime") },
  ];
  // A week picked from an old link that isn't in the list still needs an entry, so the dropdown shows the truth.
  if (!weekOptions.some((option) => option.value === week)) {
    weekOptions.unshift({ value: week, label: t("logWeekOf", { date: mondayFmt.format(Date.parse(`${week}T00:00:00Z`)) }) });
  }
  const areaOptions = [{ value: "all", label: t("deptAll") }, ...project.departments.map((d) => ({ value: d.id, label: d.name }))];

  const here = { week, type: filter, area: area ?? undefined };
  const base = logHref(slug, here);
  const filters: { value: LogFilter; label: string; count?: number }[] = [
    { value: "all", label: t("logFilterAll") },
    { value: "progress", label: t("logFilterProgress"), count: counts.progress },
    { value: "opened", label: t("logFilterOpened"), count: counts.opened },
    { value: "solved", label: t("logFilterSolved"), count: counts.solved },
  ];

  return (
    <div className="py-10 md:py-14">
      <div className="container mx-auto px-6 max-w-5xl space-y-8">
        <Link
          href={{ pathname: `/portal/projects/${slug}`, query: { dept: area ?? "all" } }}
          className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4"
        >
          ← {project.name}
        </Link>
        <SectionHeader as="h1" index="00" label={project.name} title={t("logTitle")} description={t("logDescription")} />

        {/* One toolbar: what kind of change on the left, when and where on the right. */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <nav aria-label={t("logTitle")} className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
            {filters.map((f) => (
              <Link
                key={f.value}
                href={logHref(slug, { ...here, type: f.value })}
                aria-current={filter === f.value ? "true" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs transition-colors",
                  filter === f.value ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-200"
                )}
              >
                {f.label}
                {f.count !== undefined && <span className="ml-1.5 font-mono text-zinc-500">{f.count}</span>}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-4">
            {project.departments.length > 1 && (
              <FilterSelect
                label={t("foldersLabel")}
                pathname={base.pathname}
                param="area"
                value={area ?? "all"}
                options={areaOptions}
                query={base.query}
              />
            )}
            <FilterSelect label={t("logWeekLabel")} pathname={base.pathname} param="week" value={week} options={weekOptions} query={base.query} />
          </div>
        </div>

        <section className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
          {shown.length === 0 ? (
            <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("logEmpty")}</p>
          ) : (
            <LogList entries={shown} locale={locale} timeZone={timeZone} projectSlug={slug} folderLabel={folderLabel} />
          )}
        </section>
        {allEntries.length >= EVENT_LIMIT && <p className="text-xs text-zinc-500">{t("logTruncated", { n: EVENT_LIMIT })}</p>}
      </div>
    </div>
  );
}
