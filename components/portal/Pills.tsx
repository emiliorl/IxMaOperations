import { Badge } from "@/components/ui/Badge";

type Variant = "default" | "secondary" | "active" | "destructive" | "outline";

const TICKET_STATUS: Record<string, Variant> = {
  open: "default",
  in_progress: "secondary",
  needs_review: "active",
  resolved: "active",
  closed: "outline",
};
const PRIORITY: Record<string, Variant> = { low: "outline", medium: "secondary", high: "default", critical: "destructive" };
const MILESTONE: Record<string, Variant> = {
  pending: "outline",
  in_progress: "default",
  completed: "active",
  blocked: "destructive",
};
const PROJECT: Record<string, Variant> = {
  discovery: "outline",
  in_progress: "default",
  review: "secondary",
  completed: "active",
  maintenance: "secondary",
};

const TABLES = { ticketStatus: TICKET_STATUS, priority: PRIORITY, milestone: MILESTONE, project: PROJECT };

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-sky-400",
};

/** Priority as a coloured square and its name, the way a ticket queue shows it. The label is passed in already translated. */
export function PriorityDot({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-zinc-300">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-sm ${PRIORITY_DOT[value] ?? "bg-zinc-500"}`} />
      {label}
    </span>
  );
}

/** A small monospaced status tag. The label is passed in already translated. */
export function Pill({ kind, value, label }: { kind: keyof typeof TABLES; value: string; label: string }) {
  return <Badge variant={TABLES[kind][value] ?? "outline"}>{label}</Badge>;
}
