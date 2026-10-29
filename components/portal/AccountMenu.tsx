"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, KeyRound, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { initialsOf } from "@/lib/portal/initials";
import { cn } from "@/lib/utils";

const LANGUAGE_NAMES: Record<string, string> = { en: "English", es: "Español" };

const item =
  "flex w-full cursor-pointer select-none items-center gap-2.5 rounded px-2.5 py-2 text-sm text-zinc-300 outline-none data-[highlighted]:bg-zinc-900 data-[highlighted]:text-zinc-50";

/**
 * Everything about "me" in one place, instead of five separate things in the
 * header: who I am, language, change password, sign out. Sign-out is an
 * ordinary form (rendered by the header, linked here by id) so it works as the
 * server action it already was.
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
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

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

          <DropdownMenu.Label className="px-2.5 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {t("languageLabel")}
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={locale} onValueChange={(next) => router.replace(pathname, { locale: next })}>
            {routing.locales.map((code) => (
              <DropdownMenu.RadioItem key={code} value={code} className={cn(item, "justify-between")}>
                <span>{LANGUAGE_NAMES[code] ?? code.toUpperCase()}</span>
                <DropdownMenu.ItemIndicator>
                  <Check className="h-3.5 w-3.5 text-zinc-300" aria-hidden />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className="my-1 h-px bg-zinc-800" />

          <DropdownMenu.Item asChild>
            <Link href="/portal/set-password" className={item}>
              <KeyRound className="h-4 w-4 text-zinc-500" aria-hidden />
              {t("changePassword")}
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <button type="submit" form={signOutFormId} className={item}>
              <LogOut className="h-4 w-4 text-zinc-500" aria-hidden />
              {t("signOut")}
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
