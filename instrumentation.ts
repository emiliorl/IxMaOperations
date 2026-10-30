import type { Instrumentation } from "next";

/**
 * Next.js calls this for every error nobody handled on the server: a page that crashes, a server action or an API
 * route that throws. It is the safety net: each one is written to the log and, in production, emailed to the owner
 * (one email per kind of problem per hour, and nothing from the person's request). See lib/failure-alerts.ts.
 *
 * Errors a route handles itself (a booking that returns a clean 502) never get here, so those call the same
 * function directly where they happen.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // The alert code uses Node features (email, Redis); the edge runtime only runs the proxy.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { alertOwnerOfFailure } = await import("./lib/failure-alerts");
  await alertOwnerOfFailure(`${context.routeType} error`, error, {
    path: request.path,
    method: request.method,
    digest: (error as { digest?: string } | null)?.digest,
  });
};
