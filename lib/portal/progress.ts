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
