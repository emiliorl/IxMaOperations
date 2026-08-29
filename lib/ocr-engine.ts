/**
 * lib/ocr-engine.ts
 *
 * Pure extraction/structuring helpers behind the Phase 2 "Document &
 * Receipt OCR" demo (CAPABILITY_DEMOS_PLAN.md Phase 2). tesseract.js itself
 * (loaded on-demand in the browser via a Web Worker — see
 * components/examples/OcrDemo.tsx) does the actual character recognition;
 * this file takes its line/word output and turns it into a date, a set of
 * labeled totals (subtotal/tax/tip/discount/total), and a line-item table —
 * the "Extraction & Structuring Heuristics" and "Line-item table builder"
 * from the plan.
 *
 * Deliberately has no dependency on the `tesseract.js` package itself (only
 * a structural shape matching its output, in flattenOcrLines' RawPage type)
 * so this stays a plain, testable module — same shape as
 * lib/scraper-engine.ts for the scraper demo.
 */

export interface OcrBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: OcrBbox;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: OcrBbox;
  words: OcrWord[];
}

export type AmountLabel = "subtotal" | "tax" | "tip" | "discount" | "total";

export interface OcrAmount {
  label: AmountLabel;
  value: number;
  currency: string;
  rawText: string;
}

export interface OcrLineItem {
  description: string;
  amount: number;
  currency: string;
  rawText: string;
}

export interface OcrDate {
  rawText: string;
  /** ISO 8601 (YYYY-MM-DD), or null when the matched text had an out-of-range month/day. */
  iso: string | null;
}

export interface OcrExtraction {
  date: OcrDate | null;
  amounts: Partial<Record<AmountLabel, OcrAmount>>;
  lineItems: OcrLineItem[];
  averageConfidence: number;
}

// --- flattening tesseract.js's output --------------------------------------
//
// tesseract.js v5+ nests recognition results as blocks -> paragraphs ->
// lines -> words (only present when `worker.recognize()` is called with
// `{ blocks: true }` in its output-format argument — it's `false` by
// default). We flatten straight to a line list: each Line already carries
// its own bbox and confidence, which is exactly the "group words by
// vertical line coordinates" the plan calls for — tesseract has already
// done that clustering for us.

interface RawBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface RawWord {
  text: string;
  confidence: number;
  bbox: RawBbox;
}
interface RawLine {
  text: string;
  confidence: number;
  bbox: RawBbox;
  words: RawWord[];
}
interface RawParagraph {
  lines: RawLine[];
}
interface RawBlock {
  paragraphs: RawParagraph[];
}
/** Structural match for tesseract.js's `Page` type — kept local rather than
 *  imported so this module has no compile-time dependency on that package. */
export interface RawOcrPage {
  blocks: RawBlock[] | null;
}

export function flattenOcrLines(page: RawOcrPage): OcrLine[] {
  const lines: OcrLine[] = [];
  for (const block of page.blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const text = line.text.trim();
        if (!text) continue;
        lines.push({
          text,
          confidence: line.confidence,
          bbox: line.bbox,
          words: line.words.map((w) => ({ text: w.text, confidence: w.confidence, bbox: w.bbox })),
        });
      }
    }
  }
  // Top-to-bottom reading order — blocks/paragraphs don't always arrive
  // pre-sorted, and every heuristic below (date, totals, line items) reads
  // the receipt top to bottom the way a person would.
  return lines.slice().sort((a, b) => a.bbox.y0 - b.bbox.y0);
}

// --- date extraction ---------------------------------------------------------

function pad2(n: string): string {
  return n.padStart(2, "0");
}

function isoFromParts(year: string, month: string, day: string): string | null {
  const mm = Number(month);
  const dd = Number(day);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

const DATE_PATTERNS: Array<{ re: RegExp; toIso: (m: RegExpMatchArray) => string | null }> = [
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/, toIso: (m) => isoFromParts(m[1], m[2], m[3]) },
  // US receipts overwhelmingly print MM/DD/YYYY or MM-DD-YYYY.
  { re: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, toIso: (m) => isoFromParts(m[3], m[1], m[2]) },
  { re: /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/, toIso: (m) => isoFromParts(m[3], m[1], m[2]) },
];

export function extractDate(lines: OcrLine[]): OcrDate | null {
  for (const line of lines) {
    for (const { re, toIso } of DATE_PATTERNS) {
      const m = line.text.match(re);
      if (m) return { rawText: m[0], iso: toIso(m) };
    }
  }
  return null;
}

// --- amounts & line items ----------------------------------------------------

const CURRENCY_SYMBOLS: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  MXN: "MXN",
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
};

// Requires an explicit currency marker ($, €, £, MXN, ...) rather than a
// bare number — a receipt line has plenty of bare numbers (quantities,
// SKUs) that aren't prices, but a currency-marked figure almost always is.
const AMOUNT_SOURCE = "(\\$|€|£|MXN|USD|EUR|GBP)\\s?(\\d{1,3}(?:,\\d{3})*\\.\\d{2}|\\d+\\.\\d{2}|\\d+)";

interface FoundAmount {
  value: number;
  currency: string;
  rawText: string;
  index: number;
}

function findAmountsInLine(text: string): FoundAmount[] {
  // Fresh RegExp per call — a shared global-flag regex would carry
  // `lastIndex` state across lines and silently skip matches.
  const re = new RegExp(AMOUNT_SOURCE, "gi");
  const found: FoundAmount[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const value = Number(m[2].replace(/,/g, ""));
    if (Number.isNaN(value)) continue;
    found.push({ value, currency: CURRENCY_SYMBOLS[m[1].toUpperCase()] ?? "USD", rawText: m[0], index: m.index });
  }
  return found;
}

// Order matters: "subtotal" and "total" both match /total/, so the more
// specific labels are checked first.
const AMOUNT_KEYWORDS: Array<{ label: AmountLabel; re: RegExp }> = [
  { label: "subtotal", re: /\bsub[\s-]?total\b/i },
  { label: "tax", re: /\b(sales\s+)?tax\b|\bvat\b|\bgst\b/i },
  { label: "tip", re: /\btip\b|\bgratuity\b/i },
  { label: "discount", re: /\bdiscount\b|\bcoupon\b/i },
  { label: "total", re: /\btotal\b/i },
];

function labelForLine(text: string): AmountLabel | null {
  for (const { label, re } of AMOUNT_KEYWORDS) {
    if (re.test(text)) return label;
  }
  return null;
}

/**
 * Single pass over the receipt's lines: a line with a keyword (subtotal/
 * tax/tip/discount/total) and a trailing currency amount becomes a labeled
 * total; any other line with a trailing amount becomes a line item (its
 * text before the amount is the description). Lines with no currency-marked
 * figure at all (store name, address, "thank you") are skipped — this is
 * the plan's "line-item table builder", using each OCR line's own
 * already-clustered bbox rather than re-deriving columns from scratch.
 */
export function extractAmountsAndLineItems(lines: OcrLine[]): {
  amounts: Partial<Record<AmountLabel, OcrAmount>>;
  lineItems: OcrLineItem[];
} {
  const amounts: Partial<Record<AmountLabel, OcrAmount>> = {};
  const lineItems: OcrLineItem[] = [];

  for (const line of lines) {
    const found = findAmountsInLine(line.text);
    if (found.length === 0) continue;

    const last = found[found.length - 1]; // the trailing figure is the one that matters on a receipt line
    const label = labelForLine(line.text);

    if (label) {
      amounts[label] = { label, value: last.value, currency: last.currency, rawText: line.text };
      continue;
    }

    const description = line.text.slice(0, last.index).trim().replace(/[.\-\s]+$/, "");
    if (!description) continue; // a bare amount with no description isn't a usable line item
    lineItems.push({ description, amount: last.value, currency: last.currency, rawText: line.text });
  }

  return { amounts, lineItems };
}

export function averageConfidence(lines: OcrLine[]): number {
  if (lines.length === 0) return 0;
  const sum = lines.reduce((acc, l) => acc + l.confidence, 0);
  return Math.round((sum / lines.length) * 10) / 10;
}

export function extractReceiptData(lines: OcrLine[]): OcrExtraction {
  const { amounts, lineItems } = extractAmountsAndLineItems(lines);
  return {
    date: extractDate(lines),
    amounts,
    lineItems,
    averageConfidence: averageConfidence(lines),
  };
}

// --- CSV export ---------------------------------------------------------------

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a downloadable CSV from the extraction — line items plus a totals
 *  summary block, used by OcrDemo.tsx's "Download CSV" action. */
export function extractionToCsv(extraction: OcrExtraction): string {
  const rows: string[] = ["Description,Amount,Currency"];
  for (const item of extraction.lineItems) {
    rows.push([csvCell(item.description), csvCell(item.amount.toFixed(2)), csvCell(item.currency)].join(","));
  }
  rows.push("");
  rows.push("Label,Amount,Currency");
  (Object.keys(extraction.amounts) as AmountLabel[]).forEach((label) => {
    const amount = extraction.amounts[label];
    if (!amount) return;
    rows.push([csvCell(label), csvCell(amount.value.toFixed(2)), csvCell(amount.currency)].join(","));
  });
  if (extraction.date) {
    rows.push("");
    rows.push(`Date,${csvCell(extraction.date.iso ?? extraction.date.rawText)}`);
  }
  return rows.join("\n");
}
