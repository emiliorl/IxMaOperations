/**
 * Small rules for the ticket form, kept here so they can be tested: when the
 * person has a real choice of area, and which area the form starts on.
 */

/**
 * The area picker only appears when there is something to choose. A plan item
 * that belongs to an area decides the area; with a single area available there
 * is nothing to pick. (A disabled picker never helps anyone.)
 */
export function showAreaPicker(areaCount: number, planItemArea: string | null): boolean {
  return planItemArea === null && areaCount > 1;
}

/**
 * The area the form starts on: the only one available; otherwise the one the
 * person was looking at when they clicked "Open a ticket" (if they may file
 * there); otherwise none (the whole project).
 */
export function initialArea(areas: { id: string }[], requested: string | undefined): string {
  if (areas.length === 1) return areas[0].id;
  if (requested && areas.some((area) => area.id === requested)) return requested;
  return "";
}
