"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CalendarDays, ChevronDown, KeyRound, LogOut, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { initialsOf } from "@/lib/portal/initials";

const item =
  "flex w-full cursor-pointer select-none items-center gap-2.5 rounded px-2.5 py-2 text-sm text-zinc-300 outline-none data-[highlighted]:bg-zinc-900 data-[highlighted]:text-zinc-50";

/**
 * Everything about "me" in one place: who I am, my settings (language, time zone,
 * notifications), change password, sign out. Sign-out is an ordinary form
 * (rendered by the header, linked here by id) so it works as the server action it
 * already was.
 */
export function AccountMenu({
  name,
  email,
  isAdmin,
  signOutFormId,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
  signOutFormId: string;
}) {
  const t = useTranslations("Portal");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t("accountMenu")}
        className="group flex items-center gap-2 rounded-md border border-transparent py-1 pl-1 pr-2 text-xs text-zinc-300 outline-none transition-colors hover:border-zinc-800 hover:bg-zinc-900/60 focus-visible:border-zinc-600 data-[state=open]:border-zinc-800 data-[state=open]:bg-zinc-900/60"
      >
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 font-mono text-[11px] text-zinc-200"
        >
          {initialsOf(name)}
        </span>
        <span className="hidden max-w-[10rem] truncate md:inline">{name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 shadow-lg shadow-black/40"
        >
          <div className="space-y-0.5 px-2.5 py-2">
            <p className="truncate text-sm font-medium text-zinc-100">{name}</p>
            {email && <p className="truncate font-mono text-[11px] text-zinc-500">{email}</p>}
            {isAdmin && <p className="pt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">{t("ownerBadge")}</p>}
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-zinc-800" />

          {/* The owner's week across every project. */}
          {isAdmin && (
            <DropdownMenu.Item asChild>
              <Link href="/portal/week" className={item}>
                <CalendarDays className="h-4 w-4 text-zinc-500" aria-hidden />
                {t("weekMenu")}
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild>
            <Link href="/portal/settings" className={item}>
              <Settings className="h-4 w-4 text-zinc-500" aria-hidden />
              {t("settingsLink")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link href="/portal/set-password" className={item}>
              <KeyRound className="h-4 w-4 text-zinc-500" aria-hidden />
              {t("changePassword")}
            </Link>
          </DropdownMenu.Item>
          {/* Submit the header's sign-out form from the handler itself. A plain submit button here would be removed by the closing menu before the browser got to submit it. */}
          <DropdownMenu.Item
            className={item}
            onSelect={() => (document.getElementById(signOutFormId) as HTMLFormElement | null)?.requestSubmit()}
          >
            <LogOut className="h-4 w-4 text-zinc-500" aria-hidden />
            {t("signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
