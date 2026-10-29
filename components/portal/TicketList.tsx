import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Pill } from "@/components/portal/Pills";
import { isActiveTicket } from "@/lib/portal/plan";
import type { TicketSummary } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

/** The stripe on a ticket's left edge: how urgent it is at a glance, and green when it is waiting on the person. */
const STRIPE: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-500/70",
  low: "border-l-zinc-600",
};

/**
 * The ticket queue. Rows arrive already in the order to show (see `sortTickets`):
 * the ones that still need attention carry a priority-coloured stripe, a ticket
 * waiting on the person is green, and resolved / closed ones are dimmed.
 */
export async function TicketList({
  tickets,
  locale,
  folderLabel,
  problemCodes,
  showFolder = true,
}: {
  tickets: TicketSummary[];
  locale: string;
  folderLabel: (departmentId: string | null) => string;
  /** milestone id → "DW-1" (or the title), to show which problem a ticket belongs to. */
  problemCodes?: Map<string, string>;
  showFolder?: boolean;
}) {
  const t = await getTranslations("Portal");
  const dateFmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <ul className="divide-y divide-zinc-800/80">
      {tickets.map((ticket) => {
        const active = isActiveTicket(ticket.status);
        const waiting = ticket.status === "needs_review";
        const problem = ticket.milestoneId ? problemCodes?.get(ticket.milestoneId) : undefined;
        return (
          <li key={ticket.id}>
            <Link
              href={`/portal/tickets/${ticket.id}`}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 px-5 sm:px-6 py-3.5 transition-colors",
                waiting
                  ? "border-l-emerald-400 bg-emerald-500/[0.05] hover:bg-emerald-500/[0.09]"
                  : active
                    ? cn(STRIPE[ticket.priority] ?? "border-l-amber-500/70", "hover:bg-zinc-900/60")
                    : "border-l-transparent opacity-60 hover:opacity-100 hover:bg-zinc-900/60"
              )}
            >
              <span className="font-mono text-xs text-zinc-500 w-10 shrink-0">#{ticket.number}</span>
              <span className="flex-1 min-w-[12rem]">
                <span className={cn("block text-sm", active ? "text-zinc-50 font-medium" : "text-zinc-300")}>{ticket.title}</span>
                {ticket.createdByName && <span className="block text-[11px] text-zinc-500">{t("openedByShort", { name: ticket.createdByName })}</span>}
              </span>
              {problem && <span className="font-mono text-[11px] text-zinc-400">{problem}</span>}
              {showFolder && <span className="font-mono text-[11px] text-zinc-500">{folderLabel(ticket.departmentId)}</span>}
              <Pill kind="priority" value={ticket.priority} label={t(`priority.${ticket.priority}`)} />
              <Pill kind="ticketStatus" value={ticket.status} label={t(`ticketStatus.${ticket.status}`)} />
              <span className="w-28 text-right font-mono text-[11px] text-zinc-500" title={t("ticketUpdated")}>
                {dateFmt.format(Date.parse(ticket.updatedAt))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
