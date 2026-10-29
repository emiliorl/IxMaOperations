import type { MilestoneStatus } from "./constants";

export interface ProgressInput {
  status: MilestoneStatus;
}

/**
 * Project progress is derived from the plan, never typed in by hand, so the
 * number a client sees can't drift from the milestones listed under it.
 * A blocked or in-progress milestone counts as not done.
 */
export function milestoneProgress(milestones: ProgressInput[]): { done: number; total: number; percent: number } {
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === "completed").length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/**
 * How many plan items are in each status, in a fixed order, leaving out the
 * empty ones — for the one-line read on project health under the progress bar.
 */
export function milestoneBreakdown(milestones: ProgressInput[]): { status: MilestoneStatus; count: number }[] {
  const order: MilestoneStatus[] = ["completed", "in_progress", "blocked", "pending"];
  return order
    .map((status) => ({ status, count: milestones.filter((m) => m.status === status).length }))
    .filter((entry) => entry.count > 0);
}
