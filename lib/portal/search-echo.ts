/**
 * The search box asks the page for results while the person is still typing, and
 * the page answers a moment later, by which time more has been typed. If every
 * answer were copied back into the box, "inv" arriving after "invoi" would erase
 * letters, and a slow answer could make text repeat.
 *
 * So the box remembers every search it asked for. An answer carrying one of them
 * is an echo and is ignored (whatever order the answers arrive in); only a search
 * the box never asked for, such as a link that clears it, is news worth showing.
 */
export function createSearchEcho(initial: string) {
  const asked = new Set([initial]);
  return {
    /** The box asked the page for this search. */
    ask(value: string): void {
      asked.add(value);
    },
    /** Should the box show this value from the URL? True only when it changed for a reason the box did not cause. */
    isNews(fromUrl: string): boolean {
      if (asked.has(fromUrl)) return false;
      asked.add(fromUrl);
      return true;
    },
  };
}
