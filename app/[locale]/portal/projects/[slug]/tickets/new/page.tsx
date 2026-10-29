import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PortalBar } from "@/components/portal/PortalBar";
import { TicketForm } from "@/components/portal/TicketForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";
import { getProjectDetail } from "@/lib/portal/queries";

export default async function NewTicketPage(props: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await props.params;
  setRequestLocale(locale);

  const { supabase, user, name, isAdmin } = await requireUser(locale);
  const project = await getProjectDetail(supabase, slug);
  if (!project) notFound();

  const t = await getTranslations("Portal");

  // Someone who belongs to one department may only open tickets for it (the
  // database enforces this too); project-wide members and the owner can pick any.
  const me = project.team.find((member) => member.userId === user.id);
  const lockedDepartment = !isAdmin && me?.departmentId ? me.departmentId : null;
  const departments = lockedDepartment ? project.departments.filter((d) => d.id === lockedDepartment) : project.departments;

  return (
    <>
      <PortalBar name={name} isAdmin={isAdmin} locale={locale} />
      <div className="py-10 md:py-14">
        <div className="container mx-auto px-6 max-w-3xl space-y-8">
          <Link href={`/portal/projects/${slug}`} className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
            ← {t("backToProject")}
          </Link>
          <SectionHeader
            as="h1"
            index="00"
            label={project.name}
            title={t("newTicket")}
            description={t("newTicketDescription")}
          />
          <TicketForm
            locale={locale}
            projectSlug={slug}
            departments={departments}
            milestones={project.milestones.map((m) => ({ id: m.id, title: m.title }))}
            defaultDepartmentId={lockedDepartment ?? ""}
            canPickProjectWide
          />
        </div>
      </div>
    </>
  );
}
