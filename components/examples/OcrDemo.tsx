"use client";

/**
 * components/examples/OcrDemo.tsx
 *
 * Phase 2 of CAPABILITY_DEMOS_PLAN.md — interactive input + live data
 * renderer for the "Document & Receipt OCR" capability card
 * (components/home/ExamplesSection.tsx). A visitor drops in a receipt/
 * invoice image (or picks a sample), tesseract.js runs real OCR entirely in
 * the browser via a Web Worker (dynamically imported — never in the main
 * bundle), and lib/ocr-engine.ts turns the recognized lines into a date,
 * detected totals, and an editable line-item table.
 *
 * No server round-trip and no simulated backend — every render here
 * reflects actual character recognition against the visitor's own image
 * (STANDARDS.md / PROJECT_BLUEPRINT.md Section 8 Rule 2).
 *
 * Real uploaded photos (shadows, uneven lighting, phone-camera noise) read
 * far worse to tesseract.js untouched than the clean rendered samples in
 * public/samples/ocr/ — lib/image-preprocess.ts's preprocessForOcr()
 * grayscales and adaptive-thresholds every image (samples included, so the
 * pipeline is uniform) before it ever reaches tesseract. The processed
 * (black-and-white) version is what gets shown here too, not the original —
 * so the bounding-box overlay's coordinates always match what's on screen,
 * and visitors see what the engine actually read rather than a black-box
 * transform of their photo.
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { Loader2, UploadCloud, Copy, Check, Download, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { loadImage, preprocessForOcr, yieldToBrowser } from "@/lib/image-preprocess";
import {
  flattenOcrLines,
  extractReceiptData,
  extractionToCsv,
  type OcrWord,
  type OcrExtraction,
  type AmountLabel,
} from "@/lib/ocr-engine";

const SAMPLES: Array<{ url: string; labelKey: "sampleCafe" | "sampleHardware" | "sampleRetail" }> = [
  { url: "/samples/ocr/receipt-cafe.png", labelKey: "sampleCafe" },
  { url: "/samples/ocr/receipt-hardware.png", labelKey: "sampleHardware" },
  { url: "/samples/ocr/receipt-retail.png", labelKey: "sampleRetail" },
];

const AMOUNT_ORDER: AmountLabel[] = ["subtotal", "tax", "tip", "discount", "total"];

const AMOUNT_KEY_MAP: Record<AmountLabel, "amountSubtotal" | "amountTax" | "amountTip" | "amountDiscount" | "amountTotal"> = {
  subtotal: "amountSubtotal",
  tax: "amountTax",
  tip: "amountTip",
  discount: "amountDiscount",
  total: "amountTotal",
};

interface EditableItem {
  quantityText: string;
  description: string;
  amountText: string;
  currency: string;
}

function boxColor(confidence: number): string {
  if (confidence >= 85) return "#22c55e"; // green — STANDARDS.md Section 6.3
  if (confidence >= 60) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

/** Human status line for tesseract.js's own logger status strings — falls
 *  back to the raw string for statuses we don't have a translation for. */
function statusLabel(raw: string, t: (key: string) => string): string {
  if (raw === "loading tesseract core") return t("statusLoadingEngine");
  if (raw === "initializing tesseract" || raw === "initializing api") return t("statusInitializing");
  if (raw === "recognizing text") return t("statusRecognizing");
  return raw;
}

export function OcrDemo() {
  const t = useTranslations("Examples.ocr");

  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [progress, setProgress] = React.useState(0);
  const [progressStatus, setProgressStatus] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [words, setWords] = React.useState<OcrWord[]>([]);
  const [naturalSize, setNaturalSize] = React.useState<{ width: number; height: number } | null>(null);
  const [extraction, setExtraction] = React.useState<OcrExtraction | null>(null);
  const [editableItems, setEditableItems] = React.useState<EditableItem[]>([]);
  const [hoveredWord, setHoveredWord] = React.useState<number | null>(null);
  const [copied, setCopied] = React.useState(false);

  const runIdRef = React.useRef(0);

  React.useEffect(() => {
    setEditableItems(
      extraction
        ? extraction.lineItems.map((li) => ({
            quantityText: li.quantity != null ? String(li.quantity) : "",
            description: li.description,
            amountText: li.amount.toFixed(2),
            currency: li.currency,
          }))
        : []
    );
  }, [extraction]);

  /** `rawUrl` is only ever loaded into an <img> to preprocess — the
   *  processed canvas (not the original) is what gets displayed and
   *  recognized. `revoke: true` for an uploaded File's object URL, which
   *  is discarded the moment it's been read into that <img>. */
  const runOcr = React.useCallback(async (rawUrl: string, revoke: boolean) => {
    const runId = ++runIdRef.current;
    setStatus("loading");
    setError(null);
    setExtraction(null);
    setWords([]);
    setImageUrl(null);
    setNaturalSize(null);
    setProgress(0);
    setProgressStatus(t("statusPreprocessing"));
    setHoveredWord(null); // stale index from the previous image would otherwise mislabel a word in the new one

    try {
      await yieldToBrowser(); // let the "loading" state above actually paint before the synchronous canvas work below
      let canvas: HTMLCanvasElement;
      try {
        const img = await loadImage(rawUrl);
        if (runIdRef.current !== runId) return;
        canvas = preprocessForOcr(img);
      } finally {
        if (revoke) URL.revokeObjectURL(rawUrl);
      }
      if (runIdRef.current !== runId) return;

      setImageUrl(canvas.toDataURL("image/png"));
      setNaturalSize({ width: canvas.width, height: canvas.height });

      const { createWorker, OEM } = await import("tesseract.js");
      const worker = await createWorker("eng", OEM.LSTM_ONLY, {
        logger: (m) => {
          if (runIdRef.current !== runId) return;
          setProgressStatus(m.status);
          setProgress(Math.round((m.progress ?? 0) * 100));
        },
      });
      // Retains the gap between tabular columns (description vs. price)
      // instead of collapsing them to a single space — receipts with
      // wide-spaced price columns read noticeably cleaner with this on.
      await worker.setParameters({ preserve_interword_spaces: "1" });

      try {
        // rotateAuto: real phone photos are sometimes shot sideways/upside
        // down — tesseract's own orientation detection corrects that before
        // the actual recognition pass. The rendered samples are always
        // upright, so this is a no-op for them.
        const { data } = await worker.recognize(canvas, { rotateAuto: true }, { blocks: true });
        if (runIdRef.current !== runId) return; // a newer run superseded this one

        const lines = flattenOcrLines(data);
        const allWords = lines.flatMap((l) => l.words);
        setWords(allWords);
        setExtraction(extractReceiptData(lines));
        setStatus("done");
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      if (runIdRef.current !== runId) return;
      setError(err instanceof Error ? err.message : t("errorPrefix"));
      setStatus("error");
    }
  }, [t]);

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      void runOcr(URL.createObjectURL(file), true);
    },
    [runOcr]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
    maxFiles: 1,
    multiple: false,
  });

  const updateItem = (index: number, field: keyof EditableItem, value: string) => {
    setEditableItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };
  const removeItem = (index: number) => {
    setEditableItems((prev) => prev.filter((_, i) => i !== index));
  };
  const addItem = () => {
    setEditableItems((prev) => [
      ...prev,
      { quantityText: "", description: "", amountText: "0.00", currency: extraction?.lineItems[0]?.currency ?? "USD" },
    ]);
  };

  const exportPayload = React.useCallback((): OcrExtraction => {
    return {
      date: extraction?.date ?? null,
      amounts: extraction?.amounts ?? {},
      averageConfidence: extraction?.averageConfidence ?? 0,
      lineItems: editableItems
        .filter((it) => it.description.trim())
        .map((it) => {
          const quantity = Number(it.quantityText);
          return {
            quantity: it.quantityText.trim() && Number.isFinite(quantity) ? quantity : null,
            description: it.description.trim(),
            amount: Number(it.amountText) || 0,
            currency: it.currency,
            rawText: it.description.trim(),
          };
        }),
    };
  }, [extraction, editableItems]);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportPayload(), null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable — silently ignore.
    }
  };

  const handleDownloadCsv = () => {
    const csv = extractionToCsv(exportPayload());
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "receipt-export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loading = status === "loading";
  const hovered = hoveredWord !== null ? words[hoveredWord] : null;

  return (
    <div className="space-y-5">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-zinc-500 bg-zinc-900/60" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
        )}
      >
        <input {...getInputProps()} />
        <UploadCloud className="h-5 w-5 text-zinc-500" />
        <p className="text-xs text-zinc-400">{isDragActive ? t("dropActiveHint") : t("dropHint")}</p>
        <p className="text-[11px] text-zinc-600">{t("browseHint")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-zinc-500">{t("samplesLabel")}</span>
        {SAMPLES.map((sample) => (
          <button
            key={sample.url}
            type="button"
            onClick={() => void runOcr(sample.url, false)}
            disabled={loading}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-zinc-700 hover:text-zinc-100 transition-colors disabled:opacity-50"
          >
            {t(sample.labelKey)}
          </button>
        ))}
      </div>

      {!imageUrl && (
        <div className="rounded-md border border-zinc-800 bg-zinc-950 min-h-[160px] flex items-center justify-center p-8 text-center">
          <p className="text-xs text-zinc-600 max-w-sm leading-relaxed">{t("emptyState")}</p>
        </div>
      )}

      {imageUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Image + bounding-box overlay — STANDARDS.md Section 6.3 */}
          <div className="space-y-2">
            <div className="relative inline-block max-w-full rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className="block max-w-full h-auto"
                onLoad={(e) => setNaturalSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
              />
              {naturalSize && words.length > 0 && (
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
                  preserveAspectRatio="none"
                >
                  {words.map((w, i) => (
                    <rect
                      key={i}
                      x={w.bbox.x0}
                      y={w.bbox.y0}
                      width={Math.max(1, w.bbox.x1 - w.bbox.x0)}
                      height={Math.max(1, w.bbox.y1 - w.bbox.y0)}
                      fill="transparent"
                      stroke={boxColor(w.confidence)}
                      strokeWidth={hoveredWord === i ? naturalSize.width / 150 : naturalSize.width / 380}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredWord(i)}
                      onMouseLeave={() => setHoveredWord((prev) => (prev === i ? null : prev))}
                    />
                  ))}
                  {hovered && (
                    <g>
                      <rect
                        x={hovered.bbox.x0}
                        y={Math.max(0, hovered.bbox.y0 - naturalSize.width / 26)}
                        width={Math.max(60, (hovered.text.length + 5) * (naturalSize.width / 62))}
                        height={naturalSize.width / 26}
                        fill="#09090b"
                        opacity={0.92}
                      />
                      <text
                        x={hovered.bbox.x0 + naturalSize.width / 250}
                        y={Math.max(0, hovered.bbox.y0 - naturalSize.width / 26) + naturalSize.width / 34}
                        fontSize={naturalSize.width / 42}
                        fontFamily="monospace"
                        fill="#e4e4e7"
                      >
                        {hovered.text} [{hovered.confidence.toFixed(0)}%]
                      </text>
                    </g>
                  )}
                </svg>
              )}

              {loading && (
                <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
                  <p className="text-[11px] font-mono text-zinc-400">{statusLabel(progressStatus, t)}</p>
                  <div className="w-32 h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full bg-zinc-300 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>

            {status === "done" && words.length > 0 && (
              <>
                <p className="text-[10px] text-zinc-600">{t("enhancedHint")}</p>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: "#22c55e" }} /> {t("legendHigh")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: "#f59e0b" }} /> {t("legendMid")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm" style={{ background: "#ef4444" }} /> {t("legendLow")}
                  </span>
                  <span className="text-zinc-600">— {t("hoverHint")}</span>
                </div>
              </>
            )}

            {status === "error" && (
              <p className="text-xs text-red-400">
                {t("errorPrefix")}
                {error ? `: ${error}` : ""}
              </p>
            )}
          </div>

          {/* Structured output */}
          <div className="space-y-4">
            {extraction && (
              <>
                <section className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{t("sectionTotals")}</h4>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("fieldDate")}</dt>
                      <dd className="text-xs text-zinc-300 mt-0.5">
                        {extraction.date ? extraction.date.iso ?? extraction.date.rawText : t("noneDetected")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("fieldAvgConfidence")}</dt>
                      <dd className="text-xs text-zinc-300 mt-0.5 font-mono">{extraction.averageConfidence.toFixed(1)}%</dd>
                    </div>
                    {AMOUNT_ORDER.filter((label) => extraction.amounts[label]).map((label) => (
                      <div key={label}>
                        <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                          {t(AMOUNT_KEY_MAP[label])}
                        </dt>
                        <dd className="text-xs text-zinc-300 mt-0.5 font-mono">
                          {extraction.amounts[label]!.currency ? `${extraction.amounts[label]!.currency} ` : ""}
                          {extraction.amounts[label]!.value.toFixed(2)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{t("lineItemsHeading")}</h4>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{t("lineItemsHint")}</p>
                  </div>

                  {editableItems.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic">{t("noLineItems")}</p>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 px-0.5">
                        <span className="w-12 shrink-0 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                          {t("fieldQuantity")}
                        </span>
                        <span className="flex-1 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                          {t("descriptionPlaceholder")}
                        </span>
                        <span className="w-24 shrink-0 text-[10px] font-mono uppercase tracking-wider text-zinc-600">
                          {t("amountPlaceholder")}
                        </span>
                        <span className="w-8 shrink-0" />
                      </div>
                      {editableItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <Input
                            value={item.quantityText}
                            onChange={(e) => updateItem(i, "quantityText", e.target.value)}
                            placeholder="—"
                            inputMode="numeric"
                            className="h-8 w-12 text-xs font-mono border-zinc-800 bg-zinc-950 focus-visible:ring-zinc-500 shrink-0 text-center px-1"
                          />
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(i, "description", e.target.value)}
                            placeholder={t("descriptionPlaceholder")}
                            className="h-8 text-xs border-zinc-800 bg-zinc-950 focus-visible:ring-zinc-500"
                          />
                          <Input
                            value={item.amountText}
                            onChange={(e) => updateItem(i, "amountText", e.target.value)}
                            placeholder={t("amountPlaceholder")}
                            inputMode="decimal"
                            className="h-8 w-24 text-xs font-mono border-zinc-800 bg-zinc-950 focus-visible:ring-zinc-500 shrink-0"
                          />
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            aria-label={t("removeRow")}
                            className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900/60 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    {t("addRow")}
                  </Button>
                </section>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={handleCopyJson}>
                    {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {copied ? t("copied") : t("copyJson")}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={handleDownloadCsv}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    {t("downloadCsv")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
