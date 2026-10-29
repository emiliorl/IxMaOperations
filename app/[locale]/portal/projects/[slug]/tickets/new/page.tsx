import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { TicketForm } from "@/components/portal/TicketForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";
import { initialArea } from "@/lib/portal/ticket-form";
import { canOpenTickets, canWriteIn, getProjectAccess, getProjectDetail, writableDepartments } from "@/lib/portal/queries";

export default async function NewTicketPage(props: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ item?: string; dept?: string }>;
}) {
  const { locale, slug } = await props.params;
  const { item, dept } = await props.searchParams;
  setRequestLocale(locale);

  const { supabase, user, isAdmin } = await requireUser(locale);
  const project = await getProjectDetail(supabase, slug);
  if (!project) notFound();

  // A view-only executive can read everything but not open tickets (the
  // database refuses it too); send them back instead of showing a dead form.
  const access = await getProjectAccess(supabase, user.id, project.id, project.organizationId);
  if (!canOpenTickets(access, isAdmin)) redirect({ href: `/portal/projects/${slug}`, locale });

  const t = await getTranslations("Portal");

  // Only the areas this person may write in. With exactly one, it's the one used; otherwise the area they were
  // looking at when they clicked "Open a ticket" (if they may file there).
  const folders = writableDepartments(access, isAdmin, project.departments);
  const startArea = initialArea(folders, dept);

  // The plan items they can report a problem against: project-wide ones, and
  // those in folders they may write in.
  const items = project.milestones
    .filter((m) => canWriteIn(access, isAdmin, m.departmentId))
    .map((m) => ({
      id: m.id,
      title: m.code ? `${m.code} · ${m.title}` : m.title,
      description: m.summary ?? m.description,
      departmentId: m.departmentId,
    }));

  return (
    <div className="py-10 md:py-14">
      <div className="container mx-auto px-6 max-w-3xl space-y-8">
        <Link
          href={{ pathname: `/portal/projects/${slug}`, query: { dept: project.departments.some((d) => d.id === dept) ? dept! : "all" } }}
          className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4"
        >
          ← {t("backToProject")}
        </Link>
        <SectionHeader as="h1" index="00" label={project.name} title={t("openTicket")} description={t("newTicketDescription")} />
        <TicketForm
          locale={locale}
          projectSlug={slug}
          folders={folders}
          items={items}
          initialItemId={item ?? ""}
          defaultFolderId={startArea}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
