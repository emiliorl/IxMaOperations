import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Pill } from "@/components/portal/Pills";
import { PortalBar } from "@/components/portal/PortalBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";
import { listProjects } from "@/lib/portal/queries";

export default async function PortalHomePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const { supabase, name, isAdmin } = await requireUser(locale);
  const projects = await listProjects(supabase);

  // Most people have exactly one project: take them straight to it.
  if (projects.length === 1 && !isAdmin) redirect({ href: `/portal/projects/${projects[0].slug}`, locale });

  const t = await getTranslations("Portal");

  return (
    <>
      <PortalBar name={name} isAdmin={isAdmin} locale={locale} />
      <div className="py-12 md:py-16">
        <div className="container mx-auto px-6 max-w-5xl space-y-8">
          <SectionHeader as="h1" index="00" label={t("eyebrow")} title={t("projectsTitle")} description={t("projectsDescription")} />

          {projects.length === 0 ? (
            <p className="text-sm text-zinc-400 max-w-lg">{t("noProjects")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/portal/projects/${project.slug}`}
                  className="group rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-3 transition-all hover:border-zinc-700 hover:-translate-y-px"
                >
                  {project.organization && (
                    <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">{project.organization}</p>
                  )}
                  <h2 className="text-base font-semibold text-zinc-100 group-hover:text-white">{project.name}</h2>
                  <Pill kind="project" value={project.status} label={t(`projectStatus.${project.status}`)} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
