"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createSearchEcho } from "@/lib/portal/search-echo";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 350;
/** One letter matches almost everything, so searching while typing waits for two. Enter always searches. */
const MIN_LIVE_LENGTH = 2;

/**
 * Search for a plan item or ticket. It only moves between URLs the project page
 * already understands (`?q=`), so the server stays in charge of what matches.
 * Press "/" anywhere on the page to jump into it, Esc to clear.
 *
 * What is typed belongs to the input, not to the URL. The page answers a little
 * later than the keystrokes, and an answer to "inv" must never overwrite what
 * has since become "invoi" (that made letters repeat or vanish). So the URL only
 * flows back into the box when it changed for a reason this box did not cause.
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
  /** Search while typing. Off on the area picker, where the answer is a different page: Enter searches instead. */
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
  const composing = useRef(false);
  /** Remembers every search this box asked for, so the page's late answers to them are never copied back in. */
  const echo = useRef<ReturnType<typeof createSearchEcho>>(null);
  if (!echo.current) echo.current = createSearchEcho(initial);
  const latest = useRef(initial);

  useEffect(() => {
    if (!echo.current!.isNews(initial)) return;
    // Changed from outside (a link that clears the search…): show it.
    latest.current = initial;
    clearTimeout(timer.current);
    setValue(initial);
  }, [initial]);

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
    if (trimmed === latest.current) return;
    latest.current = trimmed;
    echo.current!.ask(trimmed);
    const params = { ...query };
    if (trimmed) params.q = trimmed;
    else delete params.q;
    startTransition(() => router.replace({ pathname, query: params }, { scroll: false }));
  };

  const schedule = (next: string) => {
    clearTimeout(timer.current);
    if (!live || composing.current) return;
    const length = next.trim().length;
    if (length !== 0 && length < MIN_LIVE_LENGTH) return;
    timer.current = setTimeout(() => go(next), DEBOUNCE_MS);
  };

  return (
    // Without JavaScript this is an ordinary form: it asks the same page for ?q=… and the server answers.
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go(value);
      }}
      className={cn("relative", className)}
    >
      {Object.entries(query).map(([name, hidden]) => (
        <input key={name} type="hidden" name={name} value={hidden} />
      ))}
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
      <input
        ref={input}
        name="q"
        type="search"
        value={value}
        autoFocus={focusOnMount}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={80}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchLabel")}
        onChange={(event) => {
          setValue(event.target.value);
          schedule(event.target.value);
        }}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={(event) => {
          composing.current = false;
          schedule(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            setValue("");
            go("");
          }
        }}
        className={cn(
          "h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 pr-16 text-base text-zinc-100 sm:h-9 sm:text-sm placeholder:text-zinc-500",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 [&::-webkit-search-cancel-button]:hidden"
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
      {pending && (
        <span aria-hidden className="pointer-events-none absolute bottom-0 left-3 right-3 h-px animate-pulse bg-zinc-400/60" />
      )}
    </form>
  );
}
