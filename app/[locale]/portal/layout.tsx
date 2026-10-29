import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { PortalHeader } from "@/components/portal/PortalHeader";

/**
 * The client portal is private: never indexed, never linked from the public
 * site (STANDARDS.md §4.5). next.config.mjs also sends `X-Robots-Tag: noindex`
 * and `Cache-Control: private, no-store` on these paths. None of that is the
 * security control — sign-in and row-level security are.
 *
 * It has its own header and footer: the public sales chrome is hidden here
 * (components/layout/HideInPortal.tsx) because people in the portal are
 * already clients.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function PortalLayout(props: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col">
      <PortalHeader locale={locale} />
      <div className="flex-1">{props.children}</div>
      <PortalFooter />
    </div>
  );
}
