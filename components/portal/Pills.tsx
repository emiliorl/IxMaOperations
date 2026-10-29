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

/** A small monospaced status tag. The label is passed in already translated. */
export function Pill({ kind, value, label }: { kind: keyof typeof TABLES; value: string; label: string }) {
  return <Badge variant={TABLES[kind][value] ?? "outline"}>{label}</Badge>;
}
