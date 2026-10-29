import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Pill } from "@/components/portal/Pills";
import { isActiveTicket } from "@/lib/portal/plan";
import type { TicketSummary } from "@/lib/portal/queries";
import { cn } from "@/lib/utils";

/**
 * A list of tickets with the ones that still need attention first and
 * highlighted. Resolved / closed tickets are dimmed so the open ones stand out.
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

  // Open first; newest first within each group (the input is already newest first).
  const sorted = [...tickets].sort((a, b) => Number(isActiveTicket(b.status)) - Number(isActiveTicket(a.status)));

  return (
    <ul className="divide-y divide-zinc-800/80">
      {sorted.map((ticket) => {
        const active = isActiveTicket(ticket.status);
        const problem = ticket.milestoneId ? problemCodes?.get(ticket.milestoneId) : undefined;
        return (
          <li key={ticket.id}>
            <Link
              href={`/portal/tickets/${ticket.id}`}
              className={cn(
                "flex flex-wrap items-center gap-x-4 gap-y-2 border-l-2 px-5 sm:px-6 py-3.5 transition-colors",
                active
                  ? "border-l-amber-500/80 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
                  : "border-l-transparent opacity-60 hover:opacity-100 hover:bg-zinc-900/60"
              )}
            >
              <span className="font-mono text-xs text-zinc-500 w-10 shrink-0">#{ticket.number}</span>
              <span className={cn("flex-1 min-w-[12rem] text-sm", active ? "text-zinc-50 font-medium" : "text-zinc-300")}>{ticket.title}</span>
              {problem && <span className="font-mono text-[11px] text-zinc-400">{problem}</span>}
              {showFolder && <span className="font-mono text-[11px] text-zinc-500">{folderLabel(ticket.departmentId)}</span>}
              <Pill kind="priority" value={ticket.priority} label={t(`priority.${ticket.priority}`)} />
              <Pill kind="ticketStatus" value={ticket.status} label={t(`ticketStatus.${ticket.status}`)} />
              <span className="font-mono text-[11px] text-zinc-600 w-24 text-right">{dateFmt.format(Date.parse(ticket.createdAt))}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
