import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LogList } from "@/components/portal/LogList";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { requireUser } from "@/lib/portal/auth";
import { filterEvents, parseFilter, parseWeek, recentWeeks, summarize, weekRange, type LogFilter } from "@/lib/portal/log";
import { getProjectDetail, getProjectEvents } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

const EVENT_LIMIT = 500;

const chip = (active: boolean) =>
  cn(
    "rounded-md border px-3 py-1.5 text-xs transition-colors",
    active ? "border-zinc-600 bg-zinc-800 text-zinc-100" : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-200"
  );

export default async function ProjectLogPage(props: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ week?: string; type?: string }>;
}) {
  const { locale, slug } = await props.params;
  const { week: weekParam, type } = await props.searchParams;
  setRequestLocale(locale);

  const { supabase } = await requireUser(locale);
  const project = await getProjectDetail(supabase, slug);
  if (!project) notFound();

  const t = await getTranslations("Portal");
  const timeZone = DEFAULT_AVAILABILITY.hostTimezone;
  const now = Date.now();
  const week = parseWeek(weekParam, now, timeZone);
  const filter = parseFilter(type);

  // Row-level security limits the events to the folders this person can open.
  const entries = await getProjectEvents(supabase, project.id, week === "all" ? null : weekRange(week, timeZone), EVENT_LIMIT);
  const counts = summarize(entries);
  const shown = filterEvents(entries, filter);

  const folderName = new Map(project.departments.map((d) => [d.id, d.name]));
  const folderLabel = (departmentId: string | null) => (departmentId ? (folderName.get(departmentId) ?? "—") : t("deptProjectWide"));

  const mondayFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const weeks = recentWeeks(now, timeZone, 6);
  const weekLabel = (monday: string, index: number) =>
    index === 0 ? t("logThisWeek") : t("logWeekOf", { date: mondayFmt.format(Date.parse(`${monday}T00:00:00Z`)) });
  const href = (nextWeek: string, nextFilter: LogFilter) => ({
    pathname: `/portal/projects/${slug}/log`,
    query: { week: nextWeek, ...(nextFilter === "all" ? {} : { type: nextFilter }) },
  });

  const filters: { value: LogFilter; label: string; count?: number }[] = [
    { value: "all", label: t("logFilterAll") },
    { value: "progress", label: t("logFilterProgress"), count: counts.progress },
    { value: "opened", label: t("logFilterOpened"), count: counts.opened },
    { value: "solved", label: t("logFilterSolved"), count: counts.solved },
  ];

  return (
    <div className="py-10 md:py-14">
      <div className="container mx-auto px-6 max-w-5xl space-y-8">
        <Link href={`/portal/projects/${slug}`} className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
          ← {project.name}
        </Link>
        <SectionHeader as="h1" index="00" label={project.name} title={t("logTitle")} description={t("logDescription")} />

        <div className="space-y-3">
          <nav aria-label={t("logWeekLabel")} className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 mr-1">{t("logWeekLabel")}</span>
            {weeks.map((monday, i) => (
              <Link key={monday} href={href(monday, filter)} className={chip(week === monday)}>
                {weekLabel(monday, i)}
              </Link>
            ))}
            <Link href={href("all", filter)} className={chip(week === "all")}>
              {t("logAllTime")}
            </Link>
          </nav>
          <nav aria-label={t("logTitle")} className="flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <Link key={f.value} href={href(week, f.value)} className={chip(filter === f.value)}>
                {f.label}
                {f.count !== undefined && <span className="ml-1.5 font-mono text-zinc-500">{f.count}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <section className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
          {shown.length === 0 ? (
            <p className="p-5 sm:p-6 text-sm text-zinc-500">{t("logEmpty")}</p>
          ) : (
            <LogList entries={shown} locale={locale} timeZone={timeZone} projectSlug={slug} folderLabel={folderLabel} />
          )}
        </section>
        {entries.length >= EVENT_LIMIT && <p className="text-xs text-zinc-500">{t("logTruncated", { n: EVENT_LIMIT })}</p>}
      </div>
    </div>
  );
}
