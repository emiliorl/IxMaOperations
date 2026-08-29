import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * i18n/navigation.ts — locale-aware drop-in replacements for next/link and
 * next/navigation. Every component that renders an internal `<Link>` or
 * calls `usePathname`/`useRouter` should import from here instead of
 * "next/link"/"next/navigation" so URLs get the right locale prefix
 * automatically (see i18n/routing.ts).
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
