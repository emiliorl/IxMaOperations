import type { Metadata } from "next";

/**
 * The client portal is private: never indexed, never linked from the public
 * site (STANDARDS.md §4.5). next.config.mjs also sends `X-Robots-Tag: noindex`
 * and `Cache-Control: private, no-store` on these paths. None of that is the
 * security control — sign-in and row-level security are.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
