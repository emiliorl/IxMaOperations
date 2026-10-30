"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { pageKind, previousPage, recordVisit } from "@/lib/portal/trail";

/**
 * "Back" that returns to where the person was (see lib/portal/trail.ts). The trail of visited pages
 * lives in sessionStorage, so it belongs to this browser tab and ends with it.
 */
const KEY = "portal-trail";

function readTrail(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((page): page is string => typeof page === "string") : [];
  } catch {
    return [];
  }
}

/** Notes that the person is on `here`, and returns the updated trail. Safe to call any number of times. */
function visit(here: string): string[] {
  const trail = recordVisit(readTrail(), here);
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(trail));
  } catch {
    // Storage blocked (private mode, full): back simply uses the page's own fixed address.
  }
  return trail;
}

const pageNow = (pathname: string) => `${pathname}${window.location.search}`;

function Tracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    visit(pageNow(pathname));
  }, [pathname, search]);
  return null;
}

/** Mounted once in the portal layout, so every page the person opens is remembered. */
export function PortalTrail() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}

/**
 * A back link. With a page before this one it goes there, and says where ("Back to the ticket");
 * without one (landed from an email, say) it goes to `fallbackHref` and shows `children`.
 */
export function BackLink({
  fallbackHref,
  children,
  className,
  prefix = "← ",
  suffix = "",
}: {
  fallbackHref: string;
  children: ReactNode;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const t = useTranslations("Portal");
  const pathname = usePathname();
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    const here = pageNow(pathname);
    setPrevious(previousPage(visit(here), here));
  }, [pathname]);

  const label = previous
    ? ({
        projects: t("backToProjects"),
        project: t("backToProject"),
        problem: t("backToProblem"),
        ticket: t("backToTicket"),
        log: t("backToLog"),
        other: t("backToPrevious"),
      } as const)[pageKind(previous)]
    : null;

  return (
    <Link href={previous ?? fallbackHref} className={className}>
      {label ? `${prefix}${label}${suffix}` : (
        <>
          {prefix}
          {children}
          {suffix}
        </>
      )}
    </Link>
  );
}
