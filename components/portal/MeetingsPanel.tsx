import { getTranslations } from "next-intl/server";
import { cancelMeeting } from "@/app/[locale]/portal/actions";
import { CancelMeetingButton } from "@/components/portal/CancelMeetingButton";
import { buttonVariants } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { safeHttpUrl } from "@/lib/portal/constants";
import type { ProjectMeeting } from "@/lib/portal/project-meetings";
import { cn } from "@/lib/utils";

const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";

/**
 * The project's upcoming booked meetings, at the top of the Meetings tab: when, how (online with the
 * call link, or in person with the address), what about, and a way to cancel. A person sees only the
 * meetings they booked; the owner sees everyone's and who booked each one.
 */
export async function MeetingsPanel({
  locale,
  slug,
  timeZone,
  meetings,
  isAdmin,
  notice,
}: {
  locale: string;
  slug: string;
  /** The viewer's own time zone: every time is shown on their clock. */
  timeZone: string;
  meetings: ProjectMeeting[];
  isAdmin: boolean;
  notice: "cancelled" | "error" | null;
}) {
  const t = await getTranslations("Portal");
  const day = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", timeZone });
  const clock = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", timeZone });
  const zone = new Intl.DateTimeFormat(locale, { timeZoneName: "short", timeZone }).formatToParts(Date.now()).find((p) => p.type === "timeZoneName")?.value ?? "";
  const sentence = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  return (
    <section className={panel}>
      <div className="space-y-2 border-b border-zinc-800 bg-zinc-900/60 px-5 py-4 sm:px-6">
        <h2 className="text-sm font-semibold text-zinc-100">{isAdmin ? t("meetingsTitleOwner") : t("meetingsTitle")}</h2>
        <p className="max-w-2xl text-xs leading-relaxed text-zinc-400">{isAdmin ? t("meetingsIntroOwner") : t("meetingsIntro")}</p>
        {notice && (
          <p role="status" className={cn("text-xs", notice === "cancelled" ? "text-green-500" : "text-red-400")}>
            {notice === "cancelled" ? t("meetingCancelled") : t("meetingCancelFailed")}
          </p>
        )}
      </div>

      {meetings.length === 0 ? (
        <p className="px-5 py-5 text-sm text-zinc-400 sm:px-6">{t("meetingsEmpty")}</p>
      ) : (
        <ul className="divide-y divide-zinc-800/80">
          {meetings.map((meeting) => {
            const link = safeHttpUrl(meeting.meetLink);
            const about = [meeting.areaName, meeting.problem && `${meeting.problem.code ? `${meeting.problem.code} · ` : ""}${meeting.problem.title}`, meeting.ticketNumber && t("meetingTicket", { n: meeting.ticketNumber })]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={meeting.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-6">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-zinc-100">
                    {sentence(day.format(meeting.start))}
                    <span className="ml-2 font-mono text-xs font-normal text-zinc-400">
                      {clock.format(meeting.start)}–{clock.format(meeting.end)} {zone}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400">
                    <span className="mr-2 rounded-md border border-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                      {meeting.mode === "online" ? t("meetingOnline") : t("meetingInPerson")}
                    </span>
                    {meeting.mode === "online" ? (
                      link && (
                        <a href={link} target="_blank" rel="noreferrer noopener" className="text-zinc-200 underline underline-offset-4 hover:text-white">
                          {t("meetingJoin")}
                        </a>
                      )
                    ) : (
                      meeting.location && <span className="text-zinc-300">{meeting.location}</span>
                    )}
                  </p>
                  {about && <p className="text-xs text-zinc-500">{about}</p>}
                  {isAdmin && meeting.bookedBy && <p className="text-xs text-zinc-500">{t("meetingBookedBy", { name: meeting.bookedBy })}</p>}
                </div>
                <div className="flex items-center gap-4">
                  {/* Moving it keeps the same meeting and calendar event: the guest gets an updated invitation. */}
                  <Link
                    href={{ pathname: "/portal/book", query: { project: slug, reschedule: meeting.id } }}
                    className="text-xs text-zinc-300 underline underline-offset-4 hover:text-white"
                  >
                    {t("meetingReschedule")}
                  </Link>
                  <form action={cancelMeeting}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="projectSlug" value={slug} />
                    <input type="hidden" name="meetingId" value={meeting.id} />
                    <CancelMeetingButton label={t("meetingCancel")} confirmText={t("meetingCancelConfirm")} />
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!isAdmin && (
        <div className="border-t border-zinc-800 bg-zinc-900/40 px-5 py-3 sm:px-6">
          <Link href={{ pathname: "/portal/book", query: { project: slug } }} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {meetings.length > 0 ? t("meetingBookAnother") : t("bookCall")}
          </Link>
        </div>
      )}
    </section>
  );
}
