import { getTranslations } from "next-intl/server";
import { Pill } from "@/components/portal/Pills";
import { Link } from "@/i18n/navigation";
import { safeHttpUrl } from "@/lib/portal/constants";
import type { WeekData } from "@/lib/portal/week";
import { groupByLocalDay } from "@/lib/portal/week-rules";

const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";
const band = "flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/60 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500 sm:px-5";
const link = "text-zinc-200 underline underline-offset-4 hover:text-white";
/** A link inside a line of text, with room around it for a finger (the padding is cancelled by a negative margin, so the line doesn't grow). */
const tap = "inline-block py-2 -my-2 sm:py-0 sm:my-0";

/**
 * The owner's week (meetings by day, days at an office, what needs the owner, what is due), as it reads on a phone first:
 * one column, big touch areas, long titles wrapping. From `lg` up it is two columns.
 */
export async function WeekView({ week, locale, timeZone }: { week: WeekData; locale: string; timeZone: string }) {
  const t = await getTranslations("Portal");
  const dayTitle = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
  const clock = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone });
  const dateOf = (date: string) => dayTitle.format(Date.parse(`${date}T12:00:00Z`));
  const sentence = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  const days = groupByLocalDay(week.meetings, timeZone);

  return (
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
            <p className="px-4 py-5 text-sm text-zinc-400 sm:px-5">{t("weekNoMeetings")}</p>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {days.map((day) => (
                <div key={day.date} className="px-4 py-4 sm:px-5">
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    {sentence(dateOf(day.date))}
                    {day.date === week.firstDate && (
                      <span className="rounded-md border border-emerald-500/40 px-1.5 py-0.5 font-mono text-[10px] font-normal text-emerald-400">{t("weekToday")}</span>
                    )}
                  </h2>
                  <ul className="space-y-4">
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
                        <li key={meeting.id} className="space-y-1">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-100">
                            <span className="font-mono text-xs text-zinc-400">
                              {clock.format(meeting.start)}–{clock.format(meeting.end)}
                            </span>
                            <span className="min-w-0 break-words">{meeting.guest ?? "—"}</span>
                            <span className="rounded-md border border-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                              {meeting.mode === "online" ? t("meetingOnline") : t("meetingInPerson")}
                            </span>
                          </p>
                          <p className="break-words text-xs leading-relaxed text-zinc-500">
                            {meeting.projectSlug ? (
                              <Link href={{ pathname: `/portal/projects/${meeting.projectSlug}`, query: { tab: "onsite" } }} className={`${link} ${tap}`}>
                                {meeting.projectName}
                              </Link>
                            ) : (
                              t("weekPublicBooking")
                            )}
                            {about && ` · ${about}`}
                            {meeting.mode === "in_person" && meeting.location && ` · ${meeting.location}`}
                          </p>
                          {meeting.mode === "online" && join && (
                            <a
                              href={join}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="mt-1 inline-flex min-h-10 items-center justify-center rounded-md border border-zinc-700 px-4 text-sm text-zinc-200 hover:bg-zinc-900 sm:min-h-0 sm:border-0 sm:px-0 sm:text-xs sm:underline sm:underline-offset-4 sm:hover:bg-transparent sm:hover:text-white"
                            >
                              {t("meetingJoin")}
                            </a>
                          )}
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
            <p className="px-4 py-5 text-sm text-zinc-400 sm:px-5">{t("weekNoOnSite")}</p>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {week.visits.map((visit) => (
                <li key={`${visit.projectSlug}-${visit.date}`} className="flex flex-col gap-0.5 px-4 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4 sm:px-5">
                  <span className="text-zinc-100">
                    {sentence(dateOf(visit.date))} <span className="font-mono text-xs text-zinc-500">{visit.start}–{visit.end}</span>
                  </span>
                  <Link href={{ pathname: `/portal/projects/${visit.projectSlug}`, query: { tab: "onsite" } }} className={`text-xs ${link} ${tap}`}>
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
          <p className="border-b border-zinc-800/80 px-4 py-2.5 text-[11px] leading-relaxed text-zinc-500 sm:px-5">{t("weekTicketsHelp")}</p>
          {week.tickets.shown.length === 0 ? (
            <p className="px-4 py-5 text-sm text-zinc-400 sm:px-5">{t("weekNoTickets")}</p>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {week.tickets.shown.map((ticket) => (
                <li key={ticket.id}>
                  {/* The whole row opens the ticket: a big target, and the line of details sits under the title. */}
                  <Link href={`/portal/tickets/${ticket.id}`} className="block space-y-1.5 px-4 py-3.5 transition-colors hover:bg-zinc-900/60 sm:px-5">
                    <span className="flex items-start gap-2 text-sm">
                      <Pill kind="priority" value={ticket.priority} label={t(`priority.${ticket.priority as "low" | "medium" | "high" | "critical"}`)} />
                      <span className="min-w-0 break-words text-zinc-100">
                        <span className="font-mono text-xs text-zinc-500">#{ticket.number}</span> {ticket.title}
                      </span>
                    </span>
                    <span className="block text-[11px] text-zinc-500">
                      {ticket.projectName}
                      {ticket.areaName && ` · ${ticket.areaName}`} · {t(`ticketStatus.${ticket.status}`)} · {t("weekDaysAgo", { n: ticket.ageDays })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {week.tickets.total > week.tickets.shown.length && (
            <p className="border-t border-zinc-800/80 px-4 py-2.5 text-[11px] text-zinc-500 sm:px-5">{t("weekMoreTickets", { n: week.tickets.total - week.tickets.shown.length })}</p>
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
                <li key={entry.projectSlug}>
                  <Link
                    href={{ pathname: `/portal/projects/${entry.projectSlug}`, query: { tab: "tickets", tickets: "review", dept: "all" } }}
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-900/60 sm:px-5"
                  >
                    <span className="min-w-0 break-words">{entry.projectName}</span>
                    <span className="font-mono text-xs text-zinc-400">{entry.count}</span>
                  </Link>
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
            <p className="px-4 py-5 text-sm text-zinc-400 sm:px-5">{t("weekNoDue")}</p>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {week.due.map((item) => (
                <li key={item.id}>
                  <Link href={`/portal/projects/${item.projectSlug}/problems/${item.id}`} className="block space-y-0.5 px-4 py-3.5 hover:bg-zinc-900/60 sm:px-5">
                    <span className="block break-words text-sm text-zinc-100">
                      {item.code && <span className="font-mono text-xs text-zinc-500">{item.code} </span>}
                      {item.title}
                    </span>
                    <span className="block text-[11px] text-zinc-500">
                      {item.projectName} · {sentence(dateOf(item.dueDate))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
