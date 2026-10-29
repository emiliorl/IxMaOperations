"use client";

import React from "react";
import { usePathname } from "@/i18n/navigation";

/**
 * Hides the public site's sales header/footer inside the client portal.
 * People in the portal are already clients, so they get the portal's own
 * chrome (components/portal/PortalHeader.tsx) instead — no marketing links,
 * no "Get Started". `usePathname` comes from i18n/navigation, so the path has
 * no locale prefix and one check covers /portal and /es/portal. This is a
 * client component, but it is still server-rendered, so there is no flash.
 */
export function HideInPortal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return /^\/portal(\/|$)/.test(pathname) ? null : <>{children}</>;
}
