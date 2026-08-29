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
  /** Parsed count (from a leading "2x", "2 x", or "Qty: 2" token) — null when the line didn't carry one. */
  quantity: number | null;
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

/** Numeric slash/dash dates are ambiguous between MM/DD and DD/MM. US
 *  receipts are overwhelmingly MM/DD, so that's tried first — but when it's
 *  impossible (e.g. "25/12/2018", month 25 doesn't exist), the only other
 *  reading is DD/MM, so that's tried as a fallback rather than giving up. */
function isoFromAmbiguousParts(year: string, first: string, second: string): string | null {
  return isoFromParts(year, first, second) ?? isoFromParts(year, second, first);
}

const MONTH_NUMBERS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12",
};

function monthNumberFromName(name: string): string | null {
  const key = name.toLowerCase().startsWith("sept") ? "sept" : name.toLowerCase().slice(0, 3);
  return MONTH_NUMBERS[key] ?? null;
}

const DATE_PATTERNS: Array<{ re: RegExp; toIso: (m: RegExpMatchArray) => string | null }> = [
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/, toIso: (m) => isoFromParts(m[1], m[2], m[3]) },
  { re: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/, toIso: (m) => isoFromAmbiguousParts(m[3], m[1], m[2]) },
  { re: /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/, toIso: (m) => isoFromAmbiguousParts(m[3], m[1], m[2]) },
  // "25 Dec 2018" / "25-Dec-2018"
  { re: /\b(\d{1,2})[\s-]([A-Za-z]{3,9})[\s-](\d{4})\b/, toIso: (m) => {
      const mm = monthNumberFromName(m[2]);
      return mm ? isoFromParts(m[3], mm, m[1]) : null;
    } },
  // "Dec 25, 2018" / "December 25 2018"
  { re: /\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/, toIso: (m) => {
      const mm = monthNumberFromName(m[1]);
      return mm ? isoFromParts(m[3], mm, m[2]) : null;
    } },
];

export function extractDate(lines: OcrLine[]): OcrDate | null {
  // A pattern can match text that *looks* date-shaped but isn't (an
  // unrecognized "month" word, an impossible day) — toIso returns null for
  // those. Rather than stop at the first match, keep looking for one that
  // actually validates; only fall back to a best-effort raw match if
  // nothing on the whole receipt does.
  let fallback: OcrDate | null = null;
  for (const line of lines) {
    for (const { re, toIso } of DATE_PATTERNS) {
      const m = line.text.match(re);
      if (!m) continue;
      const iso = toIso(m);
      if (iso) return { rawText: m[0], iso };
      if (!fallback) fallback = { rawText: m[0], iso: null };
    }
  }
  return fallback;
}

// --- amounts & line items ----------------------------------------------------

const CURRENCY_SYMBOLS: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₩": "KRW",
  MXN: "MXN",
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
  RM: "MYR",
  CAD: "CAD",
  AUD: "AUD",
  SGD: "SGD",
  CHF: "CHF",
  NZD: "NZD",
  JPY: "JPY",
  CNY: "CNY",
  KRW: "KRW",
  INR: "INR",
  BRL: "BRL",
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Longest-first so a shorter token can never shadow a longer one that
// starts with the same letters (none currently overlap, but keeps this
// safe as more currencies get added).
const CURRENCY_TOKEN_PATTERN = Object.keys(CURRENCY_SYMBOLS)
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join("|");

// Requires an explicit currency marker ($, €, RM, MXN, ...) rather than a
// bare number — a receipt line has plenty of bare numbers (quantities,
// SKUs) that aren't prices, but a currency-marked figure almost always is.
const AMOUNT_SOURCE = `(${CURRENCY_TOKEN_PATTERN})\\s?(\\d{1,3}(?:,\\d{3})*\\.\\d{2}|\\d+\\.\\d{2}|\\d+)`;
// Fallback for receipts that print price columns with no currency marker at
// all (common outside the US) — still requires a 2-decimal-place figure,
// which is specific enough on its own not to catch quantities/SKUs/years.
// Currency comes back "" (unknown) rather than a guessed default.
const BARE_AMOUNT_SOURCE = "()(\\d{1,3}(?:,\\d{3})*\\.\\d{2}|\\d+\\.\\d{2})";

interface FoundAmount {
  value: number;
  currency: string;
  rawText: string;
  index: number;
}

function findAmountsWithPattern(text: string, source: string): FoundAmount[] {
  // Fresh RegExp per call — a shared global-flag regex would carry
  // `lastIndex` state across lines and silently skip matches.
  const re = new RegExp(source, "gi");
  const found: FoundAmount[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const value = Number(m[2].replace(/,/g, ""));
    if (Number.isNaN(value)) continue;
    found.push({ value, currency: m[1] ? CURRENCY_SYMBOLS[m[1].toUpperCase()] ?? "" : "", rawText: m[0], index: m.index });
  }
  return found;
}

/** Tries a currency-marked match first (high precision); only when a line
 *  has no marked figure at all does it fall back to a bare decimal — so a
 *  receipt mixing a marked total ("Rounded Total (RM): 9.00") with bare
 *  item-row prices ("1 PC * 9.00 0.00 9.00") gets both right. */
function findAmountsInLine(text: string): FoundAmount[] {
  const marked = findAmountsWithPattern(text, AMOUNT_SOURCE);
  if (marked.length > 0) return marked;
  return findAmountsWithPattern(text, BARE_AMOUNT_SOURCE);
}

// Order matters: "subtotal" and "total" both match /total/, so the more
// specific labels are checked first.
const AMOUNT_KEYWORDS: Array<{ label: AmountLabel; re: RegExp }> = [
  { label: "subtotal", re: /\bsub[\s-]?total\b/i },
  { label: "tax", re: /\b(sales\s+)?tax\b|\bvat\b|\bgst\b/i },
  { label: "tip", re: /\btip\b|\bgratuity\b/i },
  { label: "discount", re: /\bdiscount\b|\bcoupon\b/i },
  { label: "total", re: /\b(rounded|grand|net)\s+total\b|\btotal\b|\bbalance\s+due\b|\bamount\s+due\b/i },
];

function labelForLine(text: string): AmountLabel | null {
  for (const { label, re } of AMOUNT_KEYWORDS) {
    if (re.test(text)) return label;
  }
  return null;
}

const LEADING_QTY_X_RE = /^(\d+)\s*[xX]\s+(.+)$/;
const LEADING_QTY_KEYWORD_RE = /^qty\.?\s*:?\s*(\d+)\s+(.+)$/i;

/**
 * Splits a leading quantity token ("2x ", "2 x ", "Qty: 2 ") off an item
 * description, when the line has one — a description shouldn't have to
 * carry quantity as unstructured text glued to the item name.
 *
 * Deliberately conservative: no bare-leading-number pattern ("2 Widget"),
 * since a numeric SKU or pack-size prefix already inside an item name
 * ("100ct Screws") would otherwise get misread as a quantity. Only the
 * "N x" / "Nx" / "Qty: N" conventions receipts actually use for quantity
 * are recognized.
 */
function splitQuantity(text: string): { quantity: number | null; description: string } {
  const m = text.match(LEADING_QTY_X_RE) ?? text.match(LEADING_QTY_KEYWORD_RE);
  if (m) {
    const quantity = Number(m[1]);
    if (Number.isFinite(quantity) && quantity > 0) {
      return { quantity, description: m[2].trim() };
    }
  }
  return { quantity: null, description: text };
}

// A row like "1 PC * 9.00 0.00 9.00" — some POS layouts (common outside the
// US) print an item's SKU/description on one line and its qty/unit-price/
// total on the very next line, instead of one line per item.
const QTY_PRICE_ROW_RE = /^(\d+)\s*(?:pcs?|ea|units?)?\s*[*x×]\s*[\d.,]+/i;
// A long leading digit run at the start of a description line is a barcode/
// SKU number printed before the item name, not part of the name.
const LEADING_SKU_RE = /^\d{8,14}\s+/;

/**
 * Single pass over the receipt's lines: a line with a keyword (subtotal/
 * tax/tip/discount/total) and a trailing amount becomes a labeled total;
 * any other line with a trailing amount becomes a line item, split into
 * quantity/description/amount. This is the plan's "line-item table
 * builder", using each OCR line's own already-clustered bbox rather than
 * re-deriving columns from scratch.
 *
 * A second pass then looks for the two-row item layout described above:
 * among lines the first pass left untouched (no amount of their own), a
 * description-looking line immediately followed by a qty/price-shaped line
 * gets merged into one item. Only ever fills in what the first pass
 * couldn't already claim — never overrides a line that already resolved on
 * its own.
 */
export function extractAmountsAndLineItems(lines: OcrLine[]): {
  amounts: Partial<Record<AmountLabel, OcrAmount>>;
  lineItems: OcrLineItem[];
} {
  const amounts: Partial<Record<AmountLabel, OcrAmount>> = {};
  const lineItems: OcrLineItem[] = [];
  const consumed = new Set<number>();

  lines.forEach((line, i) => {
    const found = findAmountsInLine(line.text);
    if (found.length === 0) return;

    const last = found[found.length - 1]; // the trailing figure is the one that matters on a receipt line
    const label = labelForLine(line.text);

    if (label) {
      amounts[label] = { label, value: last.value, currency: last.currency, rawText: line.text };
      consumed.add(i);
      return;
    }

    // A qty/price row ("1 PC * 9.00 0.00 9.00") on its own isn't a usable
    // item — everything before its trailing amount is more qty/price noise,
    // not a description. Leave it unconsumed for the two-row merge below,
    // which pairs it with the separate description line above it.
    if (QTY_PRICE_ROW_RE.test(line.text)) return;

    const rawDescription = line.text.slice(0, last.index).trim().replace(/[.\-\s]+$/, "");
    if (!rawDescription) return; // a bare amount with no description isn't a usable line item
    const { quantity, description } = splitQuantity(rawDescription);
    if (!description) return; // guard: a quantity token with nothing after it
    lineItems.push({ quantity, description, amount: last.value, currency: last.currency, rawText: line.text });
    consumed.add(i);
  });

  for (let i = 0; i < lines.length - 1; i++) {
    if (consumed.has(i) || consumed.has(i + 1)) continue;

    const descLine = lines[i];
    const priceLine = lines[i + 1];
    if (!/[a-zA-Z]/.test(descLine.text)) continue; // a description candidate needs actual letters

    const qtyMatch = priceLine.text.match(QTY_PRICE_ROW_RE);
    if (!qtyMatch) continue;
    const priceFound = findAmountsInLine(priceLine.text);
    if (priceFound.length === 0) continue;

    const description = descLine.text.replace(LEADING_SKU_RE, "").trim();
    if (!description) continue;

    const last = priceFound[priceFound.length - 1];
    lineItems.push({
      quantity: Number(qtyMatch[1]) || null,
      description,
      amount: last.value,
      currency: last.currency,
      rawText: `${descLine.text} | ${priceLine.text}`,
    });
    consumed.add(i);
    consumed.add(i + 1);
  }

  return { amounts, lineItems };
}

const NOISE_CONFIDENCE_THRESHOLD = 35;

function alnumRatio(text: string): number {
  const stripped = text.replace(/\s/g, "");
  if (!stripped) return 0;
  const alnum = stripped.replace(/[^a-zA-Z0-9]/g, "");
  return alnum.length / stripped.length;
}

/** Barcodes and other non-text image noise sometimes get "read" by
 *  tesseract as short, garbled strings — low confidence and/or almost no
 *  real alphanumeric content. Excluded before parsing (and before the
 *  confidence average) so they can't seed a bogus line item or drag the
 *  displayed confidence down on an otherwise-clean read. */
function isNoiseLine(line: OcrLine): boolean {
  if (line.confidence < NOISE_CONFIDENCE_THRESHOLD) return true;
  const stripped = line.text.replace(/\s/g, "");
  return stripped.length >= 4 && alnumRatio(line.text) < 0.4;
}

export function averageConfidence(lines: OcrLine[]): number {
  if (lines.length === 0) return 0;
  const sum = lines.reduce((acc, l) => acc + l.confidence, 0);
  return Math.round((sum / lines.length) * 10) / 10;
}

export function extractReceiptData(lines: OcrLine[]): OcrExtraction {
  const cleanLines = lines.filter((l) => !isNoiseLine(l));
  const { amounts, lineItems } = extractAmountsAndLineItems(cleanLines);
  return {
    date: extractDate(cleanLines),
    amounts,
    lineItems,
    averageConfidence: averageConfidence(cleanLines),
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
  const rows: string[] = ["Quantity,Description,Amount,Currency"];
  for (const item of extraction.lineItems) {
    rows.push(
      [csvCell(item.quantity ?? ""), csvCell(item.description), csvCell(item.amount.toFixed(2)), csvCell(item.currency)].join(",")
    );
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
