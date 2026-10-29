"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

/**
 * Search for a plan item or ticket. It only moves between URLs the project page
 * already understands (`?q=`), so the server stays in charge of what matches.
 * Press "/" anywhere on the page to jump into it, Esc to clear.
 */
export function SearchBox({
  pathname,
  query,
  initial,
  live = true,
  focusOnMount = false,
  className,
}: {
  pathname: string;
  /** The other filters currently in the URL; they are kept. */
  query: Record<string, string>;
  /** The search currently applied. */
  initial: string;
  /** Search while typing. Off where a result lands on a different layout (a remount would drop focus): Enter searches instead. */
  live?: boolean;
  focusOnMount?: boolean;
  className?: string;
}) {
  const t = useTranslations("Portal");
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The link "clear search" (or back/forward) changes the URL under us.
  useEffect(() => setValue(initial), [initial]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (focusOnMount) input.current?.setSelectionRange(initial.length, initial.length);
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  const go = (next: string) => {
    clearTimeout(timer.current);
    const trimmed = next.trim();
    if (trimmed === initial) return;
    const params = { ...query };
    if (trimmed) params.q = trimmed;
    else delete params.q;
    startTransition(() => router.replace({ pathname, query: params }, { scroll: false }));
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go(value);
      }}
      className={cn("relative", className)}
    >
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
      <input
        ref={input}
        type="search"
        value={value}
        autoFocus={focusOnMount}
        maxLength={80}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        onChange={(event) => {
          setValue(event.target.value);
          if (!live) return;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => go(event.target.value), DEBOUNCE_MS);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            setValue("");
            go("");
          }
        }}
        className={cn(
          "h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-16 text-sm text-zinc-100 placeholder:text-zinc-500",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 [&::-webkit-search-cancel-button]:hidden",
          pending && "opacity-70"
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label={t("searchClear")}
          onClick={() => {
            setValue("");
            go("");
            input.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <kbd
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-zinc-700 px-1.5 font-mono text-[10px] text-zinc-500 sm:block"
        >
          /
        </kbd>
      )}
    </form>
  );
}
