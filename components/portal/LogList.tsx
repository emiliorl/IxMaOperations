import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categoryOf, type LogCategory } from "@/lib/portal/log";
import type { LogEntry } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

const DOT: Record<LogCategory, string> = {
  progress: "bg-sky-400",
  opened: "bg-amber-400",
  solved: "bg-emerald-400",
  activity: "bg-zinc-600",
};

/** One line per event: what changed, who did it, when. Titles come from the (decrypted) tickets and plan items. */
export async function LogList({
  entries,
  locale,
  timeZone,
  projectSlug,
  folderLabel,
}: {
  entries: LogEntry[];
  locale: string;
  timeZone: string;
  projectSlug: string;
  folderLabel: (departmentId: string | null) => string;
}) {
  const t = await getTranslations("Portal");
  const stamp = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone });

  const describe = (e: LogEntry): string => {
    const who = e.actorName ?? t("logSomeone");
    const ticket = { number: e.ticketNumber ?? "?", title: e.ticketTitle ?? "—" };
    const item = e.problemCode ? `${e.problemCode} · ${e.problemTitle ?? "—"}` : (e.problemTitle ?? "—");
    switch (e.kind) {
      case "ticket_opened":
        return t("logTicketOpened", { who, ...ticket });
      case "ticket_status":
        return t("logTicketStatus", { who, ...ticket, status: t(`ticketStatus.${e.toStatus ?? "open"}`) });
      case "plan_status":
        return t("logPlanStatus", { who, item, status: t(`milestoneStatus.${e.toStatus ?? "pending"}`) });
      default:
        return t("logComment", { who, ...ticket });
    }
  };

  return (
    <ul className="divide-y divide-zinc-800/80">
      {entries.map((e) => {
        const category = categoryOf(e);
        const text = describe(e);
        const target = e.ticketId ? `/portal/tickets/${e.ticketId}` : e.milestoneId ? `/portal/projects/${projectSlug}/problems/${e.milestoneId}` : null;
        return (
          <li key={e.id} className="flex items-start gap-3 px-5 sm:px-6 py-3">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[category])} aria-hidden />
            <div className="min-w-0 flex-1 space-y-0.5">
              {target ? (
                <Link href={target} className="text-sm text-zinc-200 hover:text-white">
                  {text}
                </Link>
              ) : (
                <p className="text-sm text-zinc-200">{text}</p>
              )}
              <p className="font-mono text-[11px] text-zinc-500">
                {stamp.format(Date.parse(e.createdAt))} · {folderLabel(e.departmentId)} · {t(`logKind.${category}`)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
