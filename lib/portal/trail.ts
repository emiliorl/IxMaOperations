/**
 * "Back" that goes back to where the person really was.
 *
 * A back link used to point at one fixed address (a ticket always went back to the project's
 * tickets tab, a problem to its plan), so the filter, tab or search the person had open was lost.
 * Instead the portal remembers the pages visited in this browser tab (a short trail, kept in
 * sessionStorage), and a back link returns to the page before the current one. A person who
 * lands cold (from an email, a bookmark) has no trail, and gets the fixed address.
 *
 * Everything here is pure so it can be tested. Pages are "path?query" without the language prefix.
 */

export const TRAIL_LIMIT = 30;

/** Pages that are never a sensible place to go "back" to: sign-in, and a form that was already submitted. */
const NEVER_BACK = [/^\/portal\/login/, /^\/portal\/set-password/, /^\/portal\/projects\/[^/?]+\/tickets\/new(\?|$)/];

const pathOf = (page: string) => page.split("?")[0];

/**
 * The trail after visiting `here`.
 *  - the same page again changes nothing;
 *  - a page already on the trail means the person went back (browser button or a back link):
 *    everything after it is dropped, so the trail keeps matching where they are;
 *  - anything else is a new step.
 */
export function recordVisit(trail: string[], here: string): string[] {
  if (trail[trail.length - 1] === here) return trail;
  const seen = trail.lastIndexOf(here);
  if (seen !== -1) return trail.slice(0, seen + 1);
  return [...trail, here].slice(-TRAIL_LIMIT);
}

/**
 * The page to go back to: the nearest earlier one that is a different page (not the same page with
 * another filter) and a sensible place to return to. Null when there is none.
 */
export function previousPage(trail: string[], here: string): string | null {
  for (let i = trail.length - 1; i >= 0; i--) {
    const page = trail[i];
    if (pathOf(page) === pathOf(here)) continue;
    if (NEVER_BACK.some((re) => re.test(page))) continue;
    return page;
  }
  return null;
}

/** What kind of page it is, so the link can say where it goes ("Back to the project", "Back to the ticket"…). */
export type PageKind = "projects" | "project" | "problem" | "ticket" | "log" | "other";

export function pageKind(page: string): PageKind {
  const path = pathOf(page);
  if (path === "/portal") return "projects";
  if (/^\/portal\/projects\/[^/]+$/.test(path)) return "project";
  if (/^\/portal\/projects\/[^/]+\/problems\/[^/]+$/.test(path)) return "problem";
  if (/^\/portal\/tickets\/[^/]+$/.test(path)) return "ticket";
  if (/^\/portal\/projects\/[^/]+\/log$/.test(path)) return "log";
  return "other";
}
