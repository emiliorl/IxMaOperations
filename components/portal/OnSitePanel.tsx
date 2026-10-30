import { getTranslations } from "next-intl/server";
import { removeOnSiteVisit, saveOnSiteVisit, setOfficeDays, setOnSitePresence } from "@/app/[locale]/portal/actions";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DEFAULT_AVAILABILITY } from "@/lib/availability-config";
import type { OnSiteDayDetail } from "@/lib/portal/onsite";
import { DEFAULT_OFFICE_DAYS, describeOfficeDays } from "@/lib/portal/office-days";
import { formatVisit } from "@/lib/portal/onsite-format";
import type { Segment } from "@/lib/portal/onsite-schedule";
import { localDate } from "@/lib/tz";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-[11px] uppercase tracking-wider text-zinc-500";
const panel = "rounded-lg border border-zinc-800/80 bg-zinc-900/30 overflow-hidden";

const SEGMENT_STYLE: Record<Segment["kind"], string> = {
  free: "bg-emerald-500/60",
  busy: "bg-zinc-600",
  lunch: "bg-amber-500/30",
  gap: "bg-zinc-800/70",
};

/**
 * "When I'm at your office": the days the owner is at this project's office, each as a
 * timeline of meetings, lunch and the free stretches when it is fine to walk up. Only
 * times are shown: other people's meetings are just "in a meeting". The owner also
 * manages the days here (add, remove, show or hide the whole schedule).
 */
export async function OnSitePanel({
  locale,
  slug,
  timeZone,
  days,
  isAdmin,
  showOnsite,
  officeLabel,
  officeAddress,
  officeDays = [...DEFAULT_OFFICE_DAYS],
  notice,
}: {
  locale: string;
  slug: string;
  /** The viewer's own time zone: every time is shown on their clock. */
  timeZone: string;
  days: OnSiteDayDetail[];
  isAdmin: boolean;
  showOnsite: boolean;
  officeLabel: string | null;
  officeAddress: string | null;
  /** The weekdays (0 = Sunday ... 6 = Saturday) this office is open for visits. */
  officeDays?: number[];
  notice: "saved" | "error" | "closed" | null;
}) {
  const t = await getTranslations("Portal");
  const host = DEFAULT_AVAILABILITY.hostTimezone;
  const today = localDate(Date.now(), host);
  const clock = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" });
  const range = (from: number, to: number) => `${clock.format(from)}–${clock.format(to)}`;
  const place = [officeLabel, officeAddress].filter(Boolean).join(" — ");
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="projectSlug" value={slug} />
    </>
  );

  const label = (segment: Segment) =>
    segment.kind === "free"
      ? t("onsiteFree")
      : segment.kind === "lunch"
        ? t("onsiteLunch")
        : segment.kind === "busy"
          ? segment.mine
            ? t("onsiteMine")
            : t("onsiteBusy")
          : "";

  return (
    <div className="space-y-5">
      {notice && (
        <p role="status" className={cn("text-xs", notice === "saved" ? "text-green-500" : "text-red-400")}>
          {notice === "saved" ? t("onsiteSaved") : notice === "closed" ? t("onsiteClosed") : t("onsiteError")}
        </p>
      )}

      <section className={panel}>
        <div className="space-y-2 border-b border-zinc-800 bg-zinc-900/60 px-5 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-zinc-100">{t("onsiteTitle")}</h2>
          <p className="max-w-2xl text-xs leading-relaxed text-zinc-400">{t("onsiteIntro")}</p>
          {place && <p className="font-mono text-[11px] text-zinc-500">{place}</p>}
          <p className="text-xs text-zinc-400">
            {officeDays.length === 0 ? t("officeDaysNone") : t("officeDaysLine", { days: describeOfficeDays(officeDays, locale, "") })}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-zinc-500" aria-label={t("onsiteLegend")}>
            {(["free", "busy", "lunch"] as const).map((kind) => (
              <li key={kind} className="flex items-center gap-1.5">
                <span aria-hidden className={cn("h-2.5 w-2.5 rounded-sm", SEGMENT_STYLE[kind])} />
                {label({ kind, start: 0, end: 0 })}
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-zinc-500 ring-1 ring-inset ring-zinc-300/40" />
              {t("onsiteMine")}
            </li>
          </ul>
        </div>

        {days.length === 0 ? (
          <div className="space-y-3 px-5 py-5 sm:px-6">
            <p className="text-sm text-zinc-400">{t("onsiteEmpty")}</p>
            <Link href={{ pathname: "/portal/book", query: { project: slug, mode: "in_person" } }} className={buttonVariants({ size: "sm" })}>
              {t("bookCall")}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/80">
            {days.map((day) => {
              const visit = { date: day.date, start: "00:00", end: "23:59" };
              const dayName = formatVisit(visit, locale, timeZone, host).day;
              return (
                <li key={day.date} className="space-y-3 px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-sm font-medium text-zinc-100">
                      {dayName}
                      {day.date === today && <span className="ml-2 rounded-md border border-emerald-500/40 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">{t("onsiteToday")}</span>}
                    </p>
                    <p className="font-mono text-xs text-zinc-400">
                      {day.date === today ? t("onsiteUntil", { time: clock.format(day.end) }) : range(day.start, day.end)}
                      {!day.announced && <span className="ml-2 text-zinc-600">· {t("onsiteFromMeeting")}</span>}
                    </p>
                  </div>

                  {day.known ? (
                    <>
                      <div
                        role="img"
                        aria-label={day.segments.filter((s) => s.kind !== "gap").map((s) => `${range(s.start, s.end)} ${label(s)}`).join(", ")}
                        className="flex h-5 overflow-hidden rounded-md border border-zinc-800"
                      >
                        {day.segments.map((segment) => (
                          <div
                            key={segment.start}
                            title={`${range(segment.start, segment.end)}${label(segment) ? ` · ${label(segment)}` : ""}`}
                            style={{ flexGrow: (segment.end - segment.start) / 60_000, flexBasis: 0 }}
                            className={cn(SEGMENT_STYLE[segment.kind], segment.kind === "busy" && segment.mine && "bg-zinc-500 ring-1 ring-inset ring-zinc-300/40")}
                          />
                        ))}
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-300">
                        {day.free.length > 0 ? (
                          <>
                            <span className="text-emerald-400">{t("onsiteFreeWindows")}</span> {day.free.map((f) => range(f.start, f.end)).join("  ·  ")}
                          </>
                        ) : (
                          <span className="text-zinc-500">{t("onsiteNoFree")}</span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-500">{t("onsiteUnknown")}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Link
                      href={{ pathname: "/portal/book", query: { project: slug, mode: "in_person", day: day.date } }}
                      className="text-xs text-zinc-300 underline underline-offset-4 hover:text-white"
                    >
                      {t("onsiteBookDay")} →
                    </Link>
                    {isAdmin && day.announced && day.id && (
                      <form action={removeOnSiteVisit}>
                        {hidden}
                        <input type="hidden" name="visitId" value={day.id} />
                        <button type="submit" className="text-xs text-zinc-500 underline underline-offset-4 hover:text-red-400">
                          {t("onsiteRemove")}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isAdmin && (
        <section className={panel}>
          <div className={cn(eyebrow, "border-b border-zinc-800 bg-zinc-900/60 px-5 py-3")}>
            <span className="text-zinc-600">{"// "}</span>
            {t("onsiteAdminTitle")}
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            <form action={setOfficeDays} className="space-y-3">
              {hidden}
              <p className="text-sm font-medium text-zinc-100">{t("officeDaysTitle")}</p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {[1, 2, 3, 4, 5].map((day) => (
                  <label key={day} className="flex items-center gap-2 text-xs text-zinc-300">
                    <input type="checkbox" name="day" value={day} defaultChecked={officeDays.includes(day)} className="accent-zinc-300" />
                    {new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(Date.UTC(2024, 0, 7 + day))}
                  </label>
                ))}
                <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  {t("officeDaysSave")}
                </button>
              </div>
              <p className="max-w-2xl text-[11px] leading-relaxed text-zinc-500">{t("officeDaysHelp")}</p>
            </form>

            <form action={saveOnSiteVisit} className="space-y-3 border-t border-zinc-800 pt-5">
              {hidden}
              <p className="text-sm font-medium text-zinc-100">{t("onsiteAddDay")}</p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="space-y-1.5">
                  <span className={eyebrow}>{t("onsiteDate")}</span>
                  <Input name="date" type="date" required min={today} className="h-8 w-44 text-xs" />
                </label>
                <label className="space-y-1.5">
                  <span className={eyebrow}>{t("onsiteFrom")}</span>
                  <Input name="start" type="time" required defaultValue={DEFAULT_AVAILABILITY.inPerson.startTime} className="h-8 w-28 text-xs" />
                </label>
                <label className="space-y-1.5">
                  <span className={eyebrow}>{t("onsiteTo")}</span>
                  <Input name="end" type="time" required defaultValue={DEFAULT_AVAILABILITY.inPerson.endTime} className="h-8 w-28 text-xs" />
                </label>
                <button type="submit" className={buttonVariants({ size: "sm" })}>
                  {t("onsiteAdd")}
                </button>
              </div>
              <p className="max-w-2xl text-[11px] leading-relaxed text-zinc-500">{t("onsiteAdminNote", { from: DEFAULT_AVAILABILITY.lunch.start, to: DEFAULT_AVAILABILITY.lunch.end })}</p>
            </form>

            <form action={setOnSitePresence} className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-5">
              {hidden}
              <input type="hidden" name="enabled" value={showOnsite ? "no" : "yes"} />
              <p className="text-xs text-zinc-400">
                <span className={showOnsite ? "text-emerald-400" : "text-amber-400"}>{showOnsite ? t("onsiteVisible") : t("onsiteHidden")}</span>
                <span className="block text-[11px] text-zinc-500">{t("onsiteVisibleHelp")}</span>
              </p>
              <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {showOnsite ? t("onsiteHide") : t("onsiteShow")}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
