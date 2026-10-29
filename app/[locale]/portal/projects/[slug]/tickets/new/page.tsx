import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { TicketForm } from "@/components/portal/TicketForm";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";
import { canOpenTickets, canWriteIn, getProjectAccess, getProjectDetail, writableDepartments } from "@/lib/portal/queries";

export default async function NewTicketPage(props: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { locale, slug } = await props.params;
  const { item } = await props.searchParams;
  setRequestLocale(locale);

  const { supabase, user, isAdmin } = await requireUser(locale);
  const project = await getProjectDetail(supabase, slug);
  if (!project) notFound();

  // A view-only executive can read everything but not open tickets (the
  // database refuses it too); send them back instead of showing a dead form.
  const access = await getProjectAccess(supabase, user.id, project.id, project.organizationId);
  if (!canOpenTickets(access, isAdmin)) redirect({ href: `/portal/projects/${slug}`, locale });

  const t = await getTranslations("Portal");

  // Only the folders this person may write in. With exactly one, it's pre-selected.
  const folders = writableDepartments(access, isAdmin, project.departments);
  const onlyFolder = folders.length === 1 && !isAdmin && access.orgLevel === null && !access.allDepartments ? folders[0].id : "";

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
        <Link href={`/portal/projects/${slug}`} className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4">
          ← {t("backToProject")}
        </Link>
        <SectionHeader as="h1" index="00" label={project.name} title={t("openTicket")} description={t("newTicketDescription")} />
        <TicketForm
          locale={locale}
          projectSlug={slug}
          folders={folders}
          items={items}
          initialItemId={item ?? ""}
          defaultFolderId={onlyFolder}
        />
      </div>
    </div>
  );
}
