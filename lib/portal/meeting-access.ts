/**
 * Who may see and cancel a booked meeting. Pure, so the rule is tested on its own.
 *
 * A meeting made from the portal records the account that booked it. Older ones (and any made
 * before that was recorded) are matched by the guest's email, which a portal booking always sets
 * to the account's own. The owner manages every meeting of a project; everyone else only their own,
 * never a colleague's.
 */

export interface MeetingOwner {
  /** The account that booked it, when recorded. */
  clientId: string | null;
  guestEmail: string | null;
}

export interface Viewer {
  id: string;
  email: string;
  isAdmin: boolean;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Booked by this person. */
export function isMyMeeting(meeting: MeetingOwner, viewer: Pick<Viewer, "id" | "email">): boolean {
  if (meeting.clientId) return meeting.clientId === viewer.id;
  return Boolean(meeting.guestEmail && viewer.email && same(meeting.guestEmail, viewer.email));
}

/** May see it in the project's meetings, and cancel it. */
export function canManageMeeting(meeting: MeetingOwner, viewer: Viewer): boolean {
  return viewer.isAdmin || isMyMeeting(meeting, viewer);
}

/** Only a confirmed meeting that has not started can be cancelled here. */
export function isCancellable(meeting: { status: string; start: number }, now: number): boolean {
  return meeting.status === "confirmed" && meeting.start > now;
}
