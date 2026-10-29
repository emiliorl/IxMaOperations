import type { ActionError } from "@/app/[locale]/portal/actions";

/**
 * Which message (key in messages/<locale>.json → "Portal") to show for each
 * kind of failure an action can report. One place, so every form words the
 * same problem the same way.
 */
export function errorMessageKey(error: ActionError, form: "login" | "ticket"): string {
  switch (error) {
    case "files_too_many":
      return "errorFilesTooMany";
    case "files_too_big":
      return "errorFilesTooBig";
    case "files_bad_type":
      return "errorFilesBadType";
    case "rate":
      return form === "login" ? "errorRate" : "errorGeneric";
    case "unavailable":
      return form === "login" ? "errorUnavailable" : "errorGeneric";
    case "invalid":
      return form === "login" ? "errorInvalid" : "errorTicketInvalid";
    case "denied":
      return form === "login" ? "errorInvalid" : "errorDenied";
    default:
      return form === "login" ? "errorUnavailable" : "errorGeneric";
  }
}
