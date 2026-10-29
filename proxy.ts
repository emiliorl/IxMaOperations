import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSession } from "./lib/supabase/proxy";

const intlProxy = createMiddleware(routing);

/** /portal and /es/portal (English is unprefixed — see i18n/routing.ts). */
const PORTAL_PATH = /^\/(?:(?:en|es)\/)?portal(?:\/|$)/;

/**
 * Locale routing for every page, plus session refresh for the private client
 * portal. The portal's access control is NOT here: each portal page and server
 * action verifies the signed-in user itself, because a proxy alone must never
 * be the only gate (Next.js has had proxy/middleware bypass advisories).
 */
export default async function proxy(request: NextRequest) {
  const response = intlProxy(request);
  if (PORTAL_PATH.test(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    await refreshSession(request, response);
  }
  return response;
}

export const config = {
  // Run on everything except API routes, Next internals, and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
