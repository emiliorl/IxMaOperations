/**
 * lib/content-engine.ts
 *
 * Pure NLP/transformation helpers behind the Phase 3 "Content Repurposing"
 * demo (CAPABILITY_DEMOS_PLAN.md Phase 3). Runs entirely client-side —
 * synchronous, no Web Worker, no API call — a real extractive pipeline
 * (sentence splitting, word-frequency scoring, hook/key-point ranking),
 * not a generative rewrite: there's no LLM behind this, and nothing here
 * pretends otherwise (STANDARDS.md / PROJECT_BLUEPRINT.md Section 8 Rule 2).
 * It restructures and ranks the visitor's own sentences; it doesn't
 * compose new ones.
 *
 * Consumed by components/examples/ContentDemo.tsx.
 */

export interface TextStats {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  readingTimeMinutes: number;
  avgWordsPerSentence: number;
  complexity: "simple" | "moderate" | "complex";
}

export interface ContentPackage {
  /** True when the input was longer than MAX_INPUT_CHARS and got cut before analysis. */
  truncated: boolean;
  stats: TextStats;
  hook: string;
  keyPoints: string[];
  tldr: string[];
  /** Each entry is a full tweet, already prefixed "N/Total ". */
  twitterThread: string[];
  linkedinPost: string;
  hashtags: string[];
}

const MAX_INPUT_CHARS = 20_000; // generous for a demo transcript (~3,500+ words); guards against a pathological paste freezing the tab

// --- sentence splitting -----------------------------------------------------

// Abbreviations whose trailing "." shouldn't be read as a sentence end.
const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "e.g", "i.e", "u.s", "u.k", "st", "ave", "inc", "co", "corp", "ltd",
]);

/**
 * Splits on sentence-ending punctuation followed by a capital letter/quote —
 * good enough for a demo, not a full NLP sentence tokenizer. Abbreviations
 * in ABBREVIATIONS get their accidental split rejoined onto the previous
 * sentence.
 */
export function splitSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const rough = normalized.split(/(?<=[.!?])\s+(?=[A-Z0-9"'‘“])/);
  const sentences: string[] = [];
  for (const piece of rough) {
    const prev = sentences[sentences.length - 1];
    const lastToken = prev
      ?.replace(/[.!?]+$/, "")
      .split(/\s+/)
      .pop()
      ?.toLowerCase();
    if (prev && lastToken && ABBREVIATIONS.has(lastToken)) {
      sentences[sentences.length - 1] = `${prev} ${piece}`;
    } else {
      sentences.push(piece);
    }
  }
  return sentences.filter((s) => s.trim().length > 0);
}

// --- word frequency -----------------------------------------------------------

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "when", "at", "by", "for", "with", "about", "against",
  "between", "into", "through", "during", "before", "after", "above", "below", "to", "from", "up", "down", "in",
  "out", "on", "off", "over", "under", "again", "further", "once", "here", "there", "all", "any", "both", "each",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too",
  "very", "s", "t", "can", "will", "just", "don", "should", "now", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "doing", "would", "could", "might", "must", "shall", "i", "you",
  "he", "she", "it", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his", "its", "our", "their", "this",
  "that", "these", "those", "of", "as", "what", "which", "who", "whom", "also", "like", "get", "got", "one", "two",
  "something", "anything", "everything", "nothing", "someone", "somebody", "anybody", "anyone", "everybody",
  "everyone", "nobody", "single", "thing", "things", "way", "ways", "lot", "much", "many", "instead", "really", "quite",
]);

/** Strips a contraction down to its base word ("it's" -> "it", "don't" ->
 *  "do", "company's" -> "company") so it matches the plain stopword list and
 *  merges frequency-counts with the uncontracted form — without this,
 *  "it's"/"that's"/etc. never match "it"/"that" in STOPWORDS at all (the
 *  tokenizer keeps the apostrophe) and can surface as a nonsense hashtag. */
function normalizeToken(word: string): string {
  if (word === "can't") return "can"; // the one irregular case — n't-stripping alone gives "ca"
  return word.replace(/'(s|re|ve|ll|d|m)$/, "").replace(/n't$/, "");
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []).map(normalizeToken).filter((w) => w.length > 1);
}

function significantWords(text: string): string[] {
  return tokenize(text).filter((w) => !STOPWORDS.has(w));
}

/** Frequency of each non-stopword term across the whole piece — the
 *  "topic frequency" signal the plan calls for; a sentence built from
 *  words that recur often across the piece is more likely to be a real
 *  point than an aside. */
export function buildWordFrequency(sentences: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const sentence of sentences) {
    for (const word of significantWords(sentence)) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  return freq;
}

// --- text stats -----------------------------------------------------------

function complexityFromAvgLength(avgWordsPerSentence: number): TextStats["complexity"] {
  if (avgWordsPerSentence <= 12) return "simple";
  if (avgWordsPerSentence <= 20) return "moderate";
  return "complex";
}

export function computeTextStats(rawText: string, sentences: string[]): TextStats {
  const wordCount = (rawText.trim().match(/\S+/g) ?? []).length;
  const sentenceCount = sentences.length;
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round((wordCount / sentenceCount) * 10) / 10 : 0;
  return {
    wordCount,
    charCount: rawText.length,
    sentenceCount,
    readingTimeMinutes: wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : 0,
    avgWordsPerSentence,
    complexity: complexityFromAvgLength(avgWordsPerSentence),
  };
}

// --- sentence scoring / key-point extraction -----------------------------------

/** Average per-word frequency (not the raw sum) so a sentence scores high
 *  for being *information-dense*, not merely long. A mild bonus for the
 *  opening/closing sentence, since a piece's thesis often lives there. */
function densityScore(sentence: string, freq: Map<string, number>, index: number, total: number): number {
  const words = significantWords(sentence);
  if (words.length === 0) return 0;
  const sum = words.reduce((acc, w) => acc + (freq.get(w) ?? 0), 0);
  const density = sum / words.length;
  const positionBonus = index === 0 || index === total - 1 ? 1.15 : 1;
  return density * positionBonus;
}

/** Ranks sentences by density score, takes the top `count`, then returns
 *  them back in their original document order — reads coherently instead
 *  of as a shuffled highlight reel. Skips fragments under 4 words (rarely
 *  a real point on their own). */
export function extractKeyPoints(sentences: string[], freq: Map<string, number>, count: number): string[] {
  const scored = sentences
    .map((text, index) => ({ text, index, score: densityScore(text, freq, index, sentences.length) }))
    .filter((s) => s.text.split(/\s+/).length >= 4);
  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
    .map((s) => s.text);
}

// --- hook extraction -----------------------------------------------------------

const HOOK_POWER_WORDS = [
  "secret", "mistake", "never", "always", "biggest", "worst", "best", "proven", "surprising", "shocking",
  "truth", "wrong", "stop", "why", "how", "reveal", "warning", "finally", "actually", "real", "uncomfortable",
];

function hookScore(sentence: string, freq: Map<string, number>, index: number, total: number): number {
  const base = densityScore(sentence, freq, index, total);
  const lower = sentence.toLowerCase();
  let bonus = 0;
  if (/\d/.test(sentence)) bonus += 0.4; // a stat is a strong opener
  if (sentence.includes("?")) bonus += 0.3;
  if (HOOK_POWER_WORDS.some((w) => lower.includes(w))) bonus += 0.5;
  // Prefer sentences from roughly the first 40% of the piece — a hook pulled
  // from deep in the conclusion reads oddly out of context.
  const positionFactor = index < Math.max(1, Math.floor(total * 0.4)) ? 1 : 0.6;
  return (base + bonus) * positionFactor;
}

export function extractHook(sentences: string[], freq: Map<string, number>): string {
  if (sentences.length === 0) return "";
  const scored = sentences.map((text, index) => ({ text, score: hookScore(text, freq, index, sentences.length) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].text;
}

// --- hashtags -----------------------------------------------------------

export function extractHashtags(freq: Map<string, number>, count: number): string[] {
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

// --- platform formatting -----------------------------------------------------------

const TWEET_LIMIT = 280;

/** Fits `text` into the remaining tweet budget after a "N/Total " prefix —
 *  cuts at the nearest sentence-internal punctuation within budget when
 *  possible, otherwise hard-truncates with an ellipsis. */
function fitToTweet(text: string, prefixLength: number): string {
  const budget = TWEET_LIMIT - prefixLength;
  if (text.length <= budget) return text;
  const slice = text.slice(0, Math.max(0, budget - 1));
  const lastBreak = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(", "), slice.lastIndexOf("; "));
  if (lastBreak > budget * 0.5) return `${slice.slice(0, lastBreak + 1).trim()}…`;
  return `${slice.trim()}…`;
}

export function buildTwitterThread(hook: string, keyPoints: string[]): string[] {
  if (!hook) return [];
  const body = keyPoints.filter((p) => p !== hook);
  const closer = "That's the thread. If this was useful, sharing it helps it reach more people.";
  const raw = [hook, ...body, closer];
  const total = raw.length;
  return raw.map((text, i) => {
    const prefix = `${i + 1}/${total} `;
    return prefix + fitToTweet(text, prefix.length);
  });
}

export function buildLinkedinPost(hook: string, keyPoints: string[], hashtags: string[]): string {
  if (!hook) return "";
  const bullets = keyPoints
    .filter((p) => p !== hook) // the hook already opens the post — don't repeat it as its own bullet
    .map((p) => `→ ${p}`)
    .join("\n\n");
  const closer = "What's been your experience with this? I'd love to hear your take in the comments.";
  const tags = hashtags.map((h) => `#${h}`).join(" ");
  return [hook, bullets, closer, tags].filter((section) => section.trim().length > 0).join("\n\n");
}

// --- top-level assembly -----------------------------------------------------

const EMPTY_STATS: TextStats = {
  wordCount: 0,
  charCount: 0,
  sentenceCount: 0,
  readingTimeMinutes: 0,
  avgWordsPerSentence: 0,
  complexity: "simple",
};

export function analyzeContent(rawText: string): ContentPackage {
  const truncated = rawText.length > MAX_INPUT_CHARS;
  const text = truncated ? rawText.slice(0, MAX_INPUT_CHARS) : rawText;

  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return { truncated, stats: EMPTY_STATS, hook: "", keyPoints: [], tldr: [], twitterThread: [], linkedinPost: "", hashtags: [] };
  }

  const freq = buildWordFrequency(sentences);
  const stats = computeTextStats(text, sentences);
  const hook = extractHook(sentences, freq);
  const keyPoints = extractKeyPoints(sentences, freq, 5);
  const tldr = extractKeyPoints(sentences, freq, 3);
  const hashtags = extractHashtags(freq, 5);
  const twitterThread = buildTwitterThread(hook, keyPoints);
  const linkedinPost = buildLinkedinPost(hook, keyPoints, hashtags);

  return { truncated, stats, hook, keyPoints, tldr, twitterThread, linkedinPost, hashtags };
}
