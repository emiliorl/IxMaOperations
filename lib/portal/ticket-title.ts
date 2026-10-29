export const MIN_TITLE = 3;
export const MAX_TITLE = 200;

/**
 * A ticket tied to a plan item may be sent with no title of its own: it is
 * named after the item ("Invoice automation"), so reporting a problem against
 * something already in the plan takes a couple of clicks instead of typing.
 * A ticket about something that is NOT in the plan needs a real title.
 */
export function resolveTicketTitle(
  typedTitle: string,
  planItemTitle: string | null
): { ok: true; title: string } | { ok: false } {
  const typed = typedTitle.trim();
  if (typed.length >= MIN_TITLE) return { ok: true, title: typed.slice(0, MAX_TITLE) };
  if (typed.length === 0 && planItemTitle && planItemTitle.trim().length >= MIN_TITLE) {
    return { ok: true, title: planItemTitle.trim().slice(0, MAX_TITLE) };
  }
  return { ok: false };
}

/**
 * Which folder a ticket lands in. A plan item that belongs to a folder decides
 * it (the person can't file "Finance's" problem under HR); a project-wide plan
 * item or no item at all leaves the choice to the person.
 */
export function resolveTicketFolder(planItemFolder: string | null | undefined, chosenFolder: string): string | null {
  if (planItemFolder) return planItemFolder;
  return chosenFolder || null;
}
