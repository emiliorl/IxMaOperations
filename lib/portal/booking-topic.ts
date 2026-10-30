/**
 * What a portal booking is about: an area (team) of the project and, inside it, a problem.
 *
 * Pure on purpose. The lists passed in come from queries run as the signed-in person, so
 * they hold only what that person may open; this file only makes sure a choice is one of
 * them. An id that is not in the lists (another team's problem, a made-up id, a problem
 * from another project) is ignored, never trusted.
 */

export interface TopicArea {
  id: string;
  name: string;
}

export interface TopicProblem {
  id: string;
  /** "FIN-1". Null if the item has no ID yet. */
  code: string | null;
  title: string;
  priority: "high" | "medium" | "low";
  /** Null for a problem that belongs to the whole project. */
  areaId: string | null;
}

export interface TopicChoice {
  areaId: string | null;
  problemId: string | null;
}

/**
 * The valid version of what was asked for.
 *  - a problem decides its own area (a problem of the Finance team is never "about Operations");
 *  - a project-wide problem keeps whatever valid area was chosen, or none;
 *  - an id that isn't available to the person becomes "nothing chosen".
 */
export function resolveTopic(input: {
  areas: TopicArea[];
  problems: TopicProblem[];
  areaId?: string | null;
  problemId?: string | null;
}): TopicChoice {
  const problem = input.problemId ? (input.problems.find((p) => p.id === input.problemId) ?? null) : null;
  const chosenArea = input.areaId ? (input.areas.find((a) => a.id === input.areaId) ?? null) : null;
  const areaId = problem?.areaId ?? chosenArea?.id ?? null;
  return { areaId: areaId && input.areas.some((a) => a.id === areaId) ? areaId : null, problemId: problem?.id ?? null };
}

/** The problems to offer for a chosen area: that area's own, plus the project-wide ones. No area chosen → all of them. */
export function problemsForArea(problems: TopicProblem[], areaId: string | null): TopicProblem[] {
  return areaId ? problems.filter((p) => p.areaId === null || p.areaId === areaId) : problems;
}

/** "FIN-1 · Title", or just the title for an item without an ID. */
export function problemLabel(problem: Pick<TopicProblem, "code" | "title">): string {
  return problem.code ? `${problem.code} · ${problem.title}` : problem.title;
}
