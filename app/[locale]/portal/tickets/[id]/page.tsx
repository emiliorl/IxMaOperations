import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { updateTicketStatus } from "@/app/[locale]/portal/actions";
import { CommentForm } from "@/components/portal/CommentForm";
import { selectClass } from "@/components/portal/Field";
import { Pill } from "@/components/portal/Pills";
import { PortalBar } from "@/components/portal/PortalBar";
import { buttonVariants } from "@/components/ui/Button";
import { TICKET_STATUSES, safeHttpUrl } from "@/lib/portal/constants";
import { requireUser } from "@/lib/portal/auth";
import { canWriteIn, getProjectAccess, getTicketDetail } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";

// A UUID is the only thing this route accepts; anything else is a 404 before any query runs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TicketPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await props.params;
  setRequestLocale(locale);
  if (!UUID.test(id)) notFound();

  const { supabase, user, name, isAdmin } = await requireUser(locale);
  const ticket = await getTicketDetail(supabase, id);
  if (!ticket) notFound(); // a ticket you can't see looks exactly like one that doesn't exist

  // Whether to OFFER a comment box (a view-only executive can read but not write;
  // the database refuses their comment either way).
  const access = await getProjectAccess(supabase, user.id, ticket.project.id, ticket.project.organizationId);
  const mayComment = canWriteIn(access, isAdmin, ticket.departmentId);

  const t = await getTranslations("Portal");
  const stamp = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const url = safeHttpUrl(ticket.affectedUrl);

  return (
    <>
      <PortalBar name={name} isAdmin={isAdmin} locale={locale} />
      <div className="py-10 md:py-14">
        <div className="container mx-auto px-6 max-w-3xl space-y-8">
          <Link
            href={`/portal/projects/${ticket.project.slug}`}
            className="text-xs text-zinc-500 hover:text-zinc-200 underline underline-offset-4"
          >
            ← {t("backToProject")} · {ticket.project.name}
          </Link>

          <header className="space-y-3">
            <p className="font-mono text-xs text-zinc-500">#{ticket.number}</p>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">{ticket.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Pill kind="ticketStatus" value={ticket.status} label={t(`ticketStatus.${ticket.status}`)} />
              <Pill kind="priority" value={ticket.priority} label={t(`priority.${ticket.priority}`)} />
              <span className="font-mono text-[11px] text-zinc-500">{t(`category.${ticket.category}`)}</span>
            </div>
            <p className="text-xs text-zinc-500">
              {t("openedBy", { name: ticket.createdByName ?? "—", date: stamp.format(Date.parse(ticket.createdAt)) })}
            </p>
          </header>

          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{"// "}</span>
                {t("detailsTitle")}
              </span>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-t border-zinc-800 pt-4">
                <div className="space-y-1">
                  <dt className="font-mono uppercase tracking-wider text-zinc-500">{t("fieldDepartment")}</dt>
                  <dd className="text-zinc-300">{ticket.departmentName ?? t("deptProjectWide")}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="font-mono uppercase tracking-wider text-zinc-500">{t("fieldEnvironment")}</dt>
                  <dd className="text-zinc-300">{t(`environment.${ticket.environment}`)}</dd>
                </div>
                {url && (
                  <div className="space-y-1 min-w-0">
                    <dt className="font-mono uppercase tracking-wider text-zinc-500">{t("affectedPage")}</dt>
                    <dd>
                      <a href={url} target="_blank" rel="noreferrer noopener" className="text-zinc-300 underline underline-offset-4 hover:text-white break-all">
                        {url}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </section>

          {isAdmin && (
            <section className={panel}>
              <div className={band}>
                <span>
                  <span className="text-zinc-600">{"// "}</span>
                  {t("adminControls")}
                </span>
              </div>
              <form action={updateTicketStatus} className="p-5 sm:p-6 flex flex-wrap items-center gap-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="ticketId" value={ticket.id} />
                <label htmlFor="status" className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                  {t("statusLabel")}
                </label>
                <select id="status" name="status" defaultValue={ticket.status} className={cn(selectClass, "w-auto")}>
                  {TICKET_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(`ticketStatus.${status}`)}
                    </option>
                  ))}
                </select>
                <button type="submit" className={buttonVariants({ variant: "secondary" })}>
                  {t("save")}
                </button>
              </form>
            </section>
          )}

          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{"// "}</span>
                {t("conversation")}
              </span>
            </div>
            <div className="p-5 sm:p-6 space-y-6">
              {ticket.comments.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("noComments")}</p>
              ) : (
                <ul className="space-y-5">
                  {ticket.comments.map((comment) => (
                    <li
                      key={comment.id}
                      className={cn("space-y-1.5", comment.internal && "rounded-md border border-dashed border-zinc-700 bg-zinc-950 p-3")}
                    >
                      <p className="font-mono text-[11px] text-zinc-500">
                        <span className="text-zinc-300">{comment.authorName}</span> · {stamp.format(Date.parse(comment.createdAt))}
                        {comment.internal && <span className="ml-2 uppercase tracking-wider text-zinc-400">· {t("internalTag")}</span>}
                      </p>
                      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{comment.message}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-zinc-800 pt-6">
                {mayComment ? (
                  <CommentForm locale={locale} ticketId={ticket.id} isAdmin={isAdmin} />
                ) : (
                  <p className="text-xs text-zinc-500">{t("viewOnlyNote")}</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
