import { getTranslations } from "next-intl/server";
import { updateMilestoneStatus } from "@/app/[locale]/portal/actions";
import { Pill, PriorityDot } from "@/components/portal/Pills";
import { StatusForm } from "@/components/portal/StatusForm";
import { Link } from "@/i18n/navigation";
import { MILESTONE_STATUSES } from "@/lib/portal/constants";

export interface PlanCardItem {
  id: string;
  code: string | null;
  title: string;
  summary: string | null;
  status: string;
  priority: string;
  /** Null when the project has a single area (nothing to tell apart). */
  areaLabel: string | null;
  /** The due date already formatted for the person, or null. */
  dueLabel: string | null;
  openTickets: number;
  hasCost: boolean;
  canReport: boolean;
}

const tapButton =
  "inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-sm transition-colors";

/**
 * The plan's problems as cards, for a phone: the wide table is for larger screens (the project page shows one or
 * the other). Each card says what the problem is first (code and title), then its state in a wrapped line, and ends
 * in two big buttons: the tickets open on it, and a way to report a new one. Everything on a card is a comfortable
 * tap target (44px), and long titles wrap instead of pushing the screen sideways.
 */
export async function PlanCards({ locale, slug, isAdmin, items }: { locale: string; slug: string; isAdmin: boolean; items: PlanCardItem[] }) {
  const t = await getTranslations("Portal");
  return (
    <ul className="divide-y divide-zinc-800/80 md:hidden">
      {items.map((m) => {
        const href = `/portal/projects/${slug}/problems/${m.id}`;
        return (
          <li key={m.id} className="space-y-3 px-4 py-4">
            <div className="flex items-start gap-3">
              <Link href={href} className="inline-flex min-h-8 w-[3.75rem] shrink-0 items-center font-mono text-xs font-medium text-zinc-200 underline underline-offset-4">
                {m.code ?? "—"}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={href} className="block break-words text-[15px] font-medium leading-snug text-zinc-100">
                  {m.title}
                </Link>
                {m.summary && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{m.summary}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {isAdmin ? (
                <div className="w-full">
                  <StatusForm
                    action={updateMilestoneStatus}
                    hidden={{ locale, milestoneId: m.id }}
                    current={m.status as (typeof MILESTONE_STATUSES)[number]}
                    options={MILESTONE_STATUSES.map((status) => ({ value: status, label: t(`milestoneStatus.${status}`) }))}
                    ariaLabel={t("statusLabel")}
                  />
                </div>
              ) : (
                <Pill kind="milestone" value={m.status} label={t(`milestoneStatus.${m.status as (typeof MILESTONE_STATUSES)[number]}`)} />
              )}
              <PriorityDot value={m.priority as "high" | "medium" | "low"} label={t(`priority.${m.priority as "high" | "medium" | "low"}`)} />
              {m.areaLabel && <span className="font-mono text-[11px] text-zinc-400">{m.areaLabel}</span>}
              {m.hasCost && <span className="rounded-md border border-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">{t("costTitle")}</span>}
              {m.dueLabel && <span className="font-mono text-[11px] text-zinc-400">{t("due", { date: m.dueLabel })}</span>}
            </div>

            {(m.openTickets > 0 || m.canReport) && (
              <div className={`grid gap-2 ${m.openTickets > 0 && m.canReport ? "grid-cols-2" : "grid-cols-1"}`}>
                {m.openTickets > 0 ? (
                  <Link href={href} className={`${tapButton} border-amber-500/40 bg-amber-500/10 font-mono text-amber-300 hover:bg-amber-500/15`}>
                    {t("ticketsOpenCount", { count: m.openTickets })}
                  </Link>
                ) : null}
                {m.canReport && (
                  <Link
                    href={{ pathname: `/portal/projects/${slug}/tickets/new`, query: { item: m.id } }}
                    className={`${tapButton} border-zinc-700 text-zinc-200 hover:bg-zinc-900`}
                  >
                    {t("reportIssue")} →
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
