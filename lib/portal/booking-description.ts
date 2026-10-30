/**
 * The text the owner sees for a booking made from the portal: the calendar event's title and
 * description, and the one-line context in the notification email. Pure, so it is tested.
 *
 * It names the project, team, problem (ID, title, priority) and ticket, plus a link back to
 * it in the portal, so the owner knows what the call is about before opening anything. It
 * deliberately leaves out a problem's summary and action plan, and never carries costs: the
 * calendar is another company's system, so only what is needed to recognise the topic goes there.
 */

export interface PortalBookingTopic {
  projectName: string;
  areaName: string | null;
  problem: { code: string | null; title: string; priority: string } | null;
  ticketNumber: number | null;
}

const problemText = (problem: NonNullable<PortalBookingTopic["problem"]>) =>
  `${problem.code ? `[${problem.code}] ` : ""}${problem.title} (priority: ${problem.priority})`;

/** "Demo · Finance · [FIN-1] Invoices (priority: high) · ticket #3" — the short form for emails. */
export function portalContextLine(topic: PortalBookingTopic): string {
  return [
    topic.projectName,
    topic.areaName,
    topic.problem && problemText(topic.problem),
    topic.ticketNumber ? `ticket #${topic.ticketNumber}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "IxMaOperations call — Ana · FIN-1": the person's name, then the problem's ID when there is one. */
export function portalMeetingTitle(base: string, topic: Pick<PortalBookingTopic, "problem">): string {
  return topic.problem?.code ? `${base} · ${topic.problem.code}` : base;
}

export function portalEventDescription(input: {
  topic: PortalBookingTopic;
  guestName: string;
  guestEmail: string;
  notes: string;
  visitorTimezone: string;
  /** Where to open it in the portal (the ticket, or the project's team). */
  portalUrl: string | null;
}): string {
  const { topic } = input;
  return [
    [
      "Booked from the client portal",
      `Client: ${input.guestName} <${input.guestEmail}>`,
      `Project: ${topic.projectName}`,
      topic.areaName && `Team: ${topic.areaName}`,
      topic.problem && `Problem: ${problemText(topic.problem)}`,
      topic.ticketNumber && `Ticket: #${topic.ticketNumber}`,
      input.portalUrl && `Portal: ${input.portalUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    input.notes && `Notes from ${input.guestName}:\n${input.notes}`,
    `Visitor timezone: ${input.visitorTimezone}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
