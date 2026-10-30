import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Pill } from "@/components/portal/Pills";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { requireUser } from "@/lib/portal/auth";
import { safeHttpUrl } from "@/lib/portal/constants";
import { getMyTimeZone } from "@/lib/portal/queries";
import { loadWeek } from "@/lib/portal/week";
import { groupByLocalDay } from "@/lib/portal/week-rules";
import { cn } from "@/lib/utils";

const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";
const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const link = "text-zinc-200 underline underline-offset-4 hover:text-white";

/**
 * The owner's week: the next seven days across every project, on the owner's own clock. Meetings and days at an
 * office on one side; what needs the owner and what is due on the other. Owner only: anyone else goes home.
 */
export default async function WeekPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const { supabase, user, isAdmin } = await requireUser(locale);
  if (!isAdmin) redirect({ href: "/portal", locale });

  const now = Date.now();
  const timeZone = await getMyTimeZone(supabase, user.id);
  const [t, week] = await Promise.all([getTranslations("Portal"), loadWeek(supabase, now, timeZone)]);

  const dayTitle = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  const clock = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone });
  const dateOf = (date: string) => dayTitle.format(Date.parse(`${date}T12:00:00Z`));
  const sentence = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  const days = groupByLocalDay(week.meetings, timeZone);

  return (
    <div className="py-10 md:py-14">
      <div className="container mx-auto px-6 max-w-5xl space-y-8">
        <SectionHeader as="h1" index="00" label={t("eyebrow")} title={t("weekTitle")} description={t("weekDescription")} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="space-y-6">
            {/* Meetings, day by day */}
            <section className={panel}>
              <div className={band}>
                <span>
                  <span className="text-zinc-600">{"// "}</span>
                  {t("weekMeetings")}
                </span>
                <span>{week.meetings.length}</span>
              </div>
              {days.length === 0 ? (
                <p className="px-5 py-5 text-sm text-zinc-400">{t("weekNoMeetings")}</p>
              ) : (
                <div className="divide-y divide-zinc-800/80">
                  {days.map((day) => (
                    <div key={day.date} className="px-5 py-4">
                      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                        {sentence(dateOf(day.date))}
                        {day.date === week.firstDate && (
                          <span className="rounded-md border border-emerald-500/40 px-1.5 py-0.5 font-mono text-[10px] font-normal text-emerald-400">{t("weekToday")}</span>
                        )}
                      </h2>
                      <ul className="space-y-3">
                        {day.items.map((meeting) => {
                          const join = safeHttpUrl(meeting.meetLink);
                          const about = [
                            meeting.areaName,
                            meeting.problem && `${meeting.problem.code ? `${meeting.problem.code} · ` : ""}${meeting.problem.title}`,
                            meeting.ticketNumber && t("meetingTicket", { n: meeting.ticketNumber }),
                          ]
                            .filter(Boolean)
                            .join(" · ");
                          return (
                            <li key={meeting.id} className="space-y-0.5">
                              <p className="text-sm text-zinc-100">
                                <span className="font-mono text-xs text-zinc-400">
                                  {clock.format(meeting.start)}–{clock.format(meeting.end)}
                                </span>{" "}
                                {meeting.guest ?? "—"}
                                <span className="ml-2 rounded-md border border-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                                  {meeting.mode === "online" ? t("meetingOnline") : t("meetingInPerson")}
                                </span>
                              </p>
                              <p className="text-xs text-zinc-500">
                                {meeting.projectSlug ? (
                                  <Link href={{ pathname: `/portal/projects/${meeting.projectSlug}`, query: { tab: "onsite" } }} className={link}>
                                    {meeting.projectName}
                                  </Link>
                                ) : (
                                  t("weekPublicBooking")
                                )}
                                {about && ` · ${about}`}
                                {meeting.mode === "online" && join && (
                                  <>
                                    {" · "}
                                    <a href={join} target="_blank" rel="noreferrer noopener" className={link}>
                                      {t("meetingJoin")}
                                    </a>
                                  </>
                                )}
                                {meeting.mode === "in_person" && meeting.location && ` · ${meeting.location}`}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Days at an office */}
            <section className={panel}>
              <div className={band}>
                <span>
                  <span className="text-zinc-600">{"// "}</span>
                  {t("weekOnSite")}
                </span>
              </div>
              {week.visits.length === 0 ? (
                <p className="px-5 py-5 text-sm text-zinc-400">{t("weekNoOnSite")}</p>
              ) : (
                <ul className="divide-y divide-zinc-800/80">
                  {week.visits.map((visit) => (
                    <li key={`${visit.projectSlug}-${visit.date}`} className="flex flex-wrap items-baseline justify-between gap-x-4 px-5 py-3 text-sm">
                      <span className="text-zinc-100">
                        {sentence(dateOf(visit.date))} <span className="font-mono text-xs text-zinc-500">{visit.start}–{visit.end}</span>
                      </span>
                      <Link href={{ pathname: `/portal/projects/${visit.projectSlug}`, query: { tab: "onsite" } }} className={cn("text-xs", link)}>
                        {visit.projectName}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-6">
            {/* What needs the owner */}
            <section className={panel}>
              <div className={band}>
                <span>
                  <span className="text-zinc-600">{"// "}</span>
                  {t("weekTickets")}
                </span>
                <span>{week.tickets.total}</span>
              </div>
              <p className="border-b border-zinc-800/80 px-5 py-2.5 text-[11px] leading-relaxed text-zinc-500">{t("weekTicketsHelp")}</p>
              {week.tickets.shown.length === 0 ? (
                <p className="px-5 py-5 text-sm text-zinc-400">{t("weekNoTickets")}</p>
              ) : (
                <ul className="divide-y divide-zinc-800/80">
                  {week.tickets.shown.map((ticket) => (
                    <li key={ticket.id} className="space-y-1 px-5 py-3">
                      <p className="flex items-start gap-2 text-sm">
                        <Pill kind="priority" value={ticket.priority} label={t(`priority.${ticket.priority}`)} />
                        <Link href={`/portal/tickets/${ticket.id}`} className="min-w-0 text-zinc-100 hover:text-white">
                          <span className="font-mono text-xs text-zinc-500">#{ticket.number}</span> {ticket.title}
                        </Link>
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {ticket.projectName}
                        {ticket.areaName && ` · ${ticket.areaName}`} · {t(`ticketStatus.${ticket.status}`)} · {t("weekDaysAgo", { n: ticket.ageDays })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              {week.tickets.total > week.tickets.shown.length && (
                <p className="border-t border-zinc-800/80 px-5 py-2.5 text-[11px] text-zinc-500">{t("weekMoreTickets", { n: week.tickets.total - week.tickets.shown.length })}</p>
              )}
            </section>

            {/* Fixes waiting on a client */}
            {week.waiting.length > 0 && (
              <section className={panel}>
                <div className={band}>
                  <span>
                    <span className="text-zinc-600">{"// "}</span>
                    {t("weekWaiting")}
                  </span>
                </div>
                <ul className="divide-y divide-zinc-800/80">
                  {week.waiting.map((entry) => (
                    <li key={entry.projectSlug} className="flex items-baseline justify-between gap-3 px-5 py-3 text-sm">
                      <Link href={{ pathname: `/portal/projects/${entry.projectSlug}`, query: { tab: "tickets", tickets: "review", dept: "all" } }} className={link}>
                        {entry.projectName}
                      </Link>
                      <span className="font-mono text-xs text-zinc-400">{entry.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Due in the next seven days */}
            <section className={panel}>
              <div className={band}>
                <span>
                  <span className="text-zinc-600">{"// "}</span>
                  {t("weekDue")}
                </span>
              </div>
              {week.due.length === 0 ? (
                <p className="px-5 py-5 text-sm text-zinc-400">{t("weekNoDue")}</p>
              ) : (
                <ul className="divide-y divide-zinc-800/80">
                  {week.due.map((item) => (
                    <li key={item.id} className="space-y-0.5 px-5 py-3">
                      <p className="text-sm">
                        <Link href={`/portal/projects/${item.projectSlug}/problems/${item.id}`} className="text-zinc-100 hover:text-white">
                          {item.code && <span className="font-mono text-xs text-zinc-500">{item.code} </span>}
                          {item.title}
                        </Link>
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {item.projectName} · {sentence(dateOf(item.dueDate))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
