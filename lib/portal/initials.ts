/** A letter is a character whose upper and lower case differ (true for accented letters too, false for digits and punctuation). */
const isLetter = (char: string) => char.toLowerCase() !== char.toUpperCase();

/** "Marta (Finance + Operations)" → "MF"; "Emilio Ramirez" → "ER". Letters only, at most two. */
export function initialsOf(name: string): string {
  const letters: string[] = [];
  for (const word of name.split(/\s+/)) {
    const first = Array.from(word).find(isLetter);
    if (first) letters.push(first.toUpperCase());
    if (letters.length === 2) break;
  }
  return letters.join("") || "?";
}
