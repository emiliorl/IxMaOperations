import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { updateTicketStatus } from "@/app/[locale]/portal/actions";
import { AttachmentList } from "@/components/portal/AttachmentList";
import { CommentForm } from "@/components/portal/CommentForm";
import { ConfirmFixedForm } from "@/components/portal/ConfirmFixedForm";
import { Pill } from "@/components/portal/Pills";
import { StatusForm } from "@/components/portal/StatusForm";
import { StillBrokenForm } from "@/components/portal/StillBrokenForm";
import { TICKET_STATUSES, safeHttpUrl } from "@/lib/portal/constants";
import { requireUser } from "@/lib/portal/auth";
import { buttonVariants } from "@/components/ui/Button";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import { formatVisit } from "@/lib/portal/onsite-format";
import { listUpcomingVisits } from "@/lib/portal/onsite";
import { isActiveTicket } from "@/lib/portal/plan";
import { canWriteIn, getMyTimeZone, getProjectAccess, getProjectEvents, getTicketDetail } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";

// A UUID is the only thing this route accepts; anything else is a 404 before any query runs.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TicketPage(props: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ files?: string }>;
}) {
  const { locale, id } = await props.params;
  const { files: filesNotice } = await props.searchParams;
  setRequestLocale(locale);
  if (!UUID.test(id)) notFound();

  const { supabase, user, isAdmin } = await requireUser(locale);
  const ticket = await getTicketDetail(supabase, id);
  if (!ticket) notFound(); // a ticket you can't see looks exactly like one that doesn't exist

  // Whether to OFFER a comment box (a view-only executive can read but not write;
  // the database refuses their comment either way).
  const [access, events, t, timeZone, visits] = await Promise.all([
    getProjectAccess(supabase, user.id, ticket.project.id, ticket.project.organizationId),
    // This ticket's own status history. Everyone who can see the ticket may read this; the project-wide log is for leaders.
    getProjectEvents(supabase, ticket.project.id, null, 100, { ticketId: ticket.id }),
    getTranslations("Portal"),
    getMyTimeZone(supabase, user.id),
    listUpcomingVisits(supabase, ticket.project, isAdmin),
  ]);
  const nextVisit = visits[0] ? formatVisit(visits[0], locale, timeZone, DEFAULT_AVAILABILITY.hostTimezone) : null;
  const mayComment = canWriteIn(access, isAdmin, ticket.departmentId);
  // Oldest first, so it reads as a story: opened → in progress → fixed → still broken → closed.
  const statusChanges = events.filter((event) => event.kind === "ticket_status").reverse();
  const stamp = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone });
  const url = safeHttpUrl(ticket.affectedUrl);

  return (
    <>
      <div className="py-10 md:py-14">
        <div className="container mx-auto px-6 max-w-3xl space-y-8">
          <Link
            href={{
              pathname: `/portal/projects/${ticket.project.slug}`,
              query: { tab: "tickets", ...(ticket.departmentId ? { dept: ticket.departmentId } : { dept: "all" }) },
            }}
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
              {ticket.updatedAt !== ticket.createdAt && ` · ${t("ticketUpdatedOn", { date: stamp.format(Date.parse(ticket.updatedAt)) })}`}
            </p>
            {filesNotice === "failed" && (
              <p role="status" className="text-xs text-amber-400">
                {t("filesUploadFailed")}
              </p>
            )}
          </header>

          {/* A way to reach the owner from here, and when they will be at the office. (The owner doesn't need it on their own tickets.) */}
          {!isAdmin && (
            <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-5 py-3.5">
              <div className="space-y-0.5">
                <p className="text-sm text-zinc-100">{t("talkTitle")}</p>
                {nextVisit && (
                  <p className="text-xs text-zinc-500">
                    {t("talkOnsite", { day: nextVisit.day, hours: nextVisit.hours })} ·{" "}
                    <Link
                      href={{ pathname: `/portal/projects/${ticket.project.slug}`, query: { tab: "onsite" } }}
                      className="text-zinc-300 underline underline-offset-4 hover:text-white"
                    >
                      {t("talkSeeSchedule")}
                    </Link>
                  </p>
                )}
              </div>
              <Link
                href={{ pathname: "/book", query: { project: ticket.project.slug, ticket: ticket.id } }}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("talkBook")}
              </Link>
            </section>
          )}

          {/* The owner says it's fixed → the person can say "still broken" and reopen this same ticket. */}
          {ticket.status === "needs_review" && mayComment && !isAdmin && (
            <section className="rounded-lg border border-amber-500/40 bg-amber-500/[0.04] overflow-hidden">
              <div className="p-5 sm:p-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold text-zinc-100">{t("stillBrokenTitle")}</h2>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">{t("stillBrokenHelp")}</p>
                  </div>
                  <ConfirmFixedForm locale={locale} ticketId={ticket.id} />
                </div>
                <div className="space-y-4 border-t border-amber-500/20 pt-6">
                  <h3 className="text-sm font-semibold text-zinc-100">{t("stillBrokenHeading")}</h3>
                  <StillBrokenForm locale={locale} ticketId={ticket.id} />
                </div>
              </div>
            </section>
          )}

          {statusChanges.length > 0 && (
            <section className={panel}>
              <div className={band}>
                <span>
                  <span className="text-zinc-600">{"// "}</span>
                  {t("ticketTimeline")}
                </span>
              </div>
              <ul className="divide-y divide-zinc-800/80">
                {statusChanges.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 sm:px-6 py-3 text-sm text-zinc-300">
                    <span>
                      {t("historyStatus", {
                        who: event.byOwner ? t("logOwner") : (event.actorName ?? t("logSomeone")),
                        status: t(`ticketStatus.${event.toStatus ?? "open"}`),
                      })}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">{stamp.format(Date.parse(event.createdAt))}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={panel}>
            <div className={band}>
              <span>
                <span className="text-zinc-600">{"// "}</span>
                {t("detailsTitle")}
              </span>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
              <AttachmentList items={ticket.attachments.filter((file) => file.commentId === null)} />
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs border-t border-zinc-800 pt-4">
                {ticket.planItem && (
                  <div className="space-y-1">
                    <dt className="font-mono uppercase tracking-wider text-zinc-500">{t("relatedItem")}</dt>
                    <dd className="text-zinc-300">
                      {ticket.planItemId ? (
                        <Link
                          href={`/portal/projects/${ticket.project.slug}/problems/${ticket.planItemId}`}
                          className="underline underline-offset-4 hover:text-white"
                        >
                          {ticket.planItemCode ? `${ticket.planItemCode} · ` : ""}
                          {ticket.planItem}
                        </Link>
                      ) : (
                        ticket.planItem
                      )}
                    </dd>
                  </div>
                )}
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
              <div className="p-5 sm:p-6 flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">{t("statusLabel")}</span>
                <StatusForm
                  action={updateTicketStatus}
                  hidden={{ locale, ticketId: ticket.id }}
                  current={ticket.status}
                  options={TICKET_STATUSES.map((status) => ({ value: status, label: t(`ticketStatus.${status}`) }))}
                  ariaLabel={t("statusLabel")}
                />
              </div>
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
                      <AttachmentList items={ticket.attachments.filter((file) => file.commentId === comment.id)} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-zinc-800 pt-6">
                {mayComment && !isAdmin && !isActiveTicket(ticket.status) ? (
                  // Closed: no more messages until the person reopens it, which is the same ticket (history stays together).
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-zinc-100">{t("ticketClosedTitle")}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">{t("ticketClosedHelp")}</p>
                    </div>
                    <StillBrokenForm locale={locale} ticketId={ticket.id} closed />
                  </div>
                ) : mayComment ? (
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
