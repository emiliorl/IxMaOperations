import { findMatches } from "@/lib/portal/filters";

/** The text with the searched words marked, wherever they are (ignoring case and accents). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const ranges = findMatches(text, query);
  if (ranges.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={index} className="rounded-sm bg-amber-400/20 px-0.5 text-amber-100">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}
