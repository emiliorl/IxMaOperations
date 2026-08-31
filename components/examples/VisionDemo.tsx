"use client";

/**
 * components/examples/VisionDemo.tsx
 *
 * Phase 6 of CAPABILITY_DEMOS_PLAN.md — interactive input + live data
 * renderer for the "Custom Vision Model" capability card
 * (components/home/ExamplesSection.tsx). A visitor drops in a photo (or
 * picks a sample), and lib/vision-engine.ts runs a real pretrained
 * YOLOX-Nano object-detection model — ONNX Runtime Web's WASM execution
 * provider, dynamically imported so the ~13MB runtime and ~3.5MB model
 * never touch the main bundle — entirely in the browser. Unlike a wrapped
 * library's `.detect()` call, ONNX Runtime only runs the raw network here:
 * the image letterboxing, grid decoding, and non-max suppression around it
 * are this app's own code (see lib/vision-engine.ts's header for the full
 * pipeline and a real preprocessing bug that write-up caught before this
 * ever ran in a browser).
 *
 * This is general-purpose 80-class object detection (people, vehicles,
 * furniture, animals, everyday objects), not a custom-trained defect
 * inspector — the caption under the image says so explicitly, since the
 * capability card's pitch is a custom-trained model and this demo
 * shouldn't be mistaken for one (STANDARDS.md / PROJECT_BLUEPRINT.md
 * Section 8 Rule 2). Bounding boxes follow STANDARDS.md Section 6's
 * spec — crisp 1px vectors, a monospaced label anchored to the box's
 * top-left corner — colored by the model's own confidence tier rather
 * than a fixed color, so a visitor can see where it's least sure.
 *
 * Reliability note (Aug 30, 2026): a visitor uploaded a photo of many dogs
 * in party hats packed together, and the prior COCO-SSD engine called
 * several of them "teddy bear" at 63-66% confidence — a structural
 * limitation of lightweight detectors on crowded/occluded scenes, not a
 * fixable bug, and one YOLOX doesn't categorically solve either. This
 * component still surfaces that honestly via `lowConfidenceScene` (an
 * inline advisory when even the model's best guess on the image is weak)
 * instead of presenting shaky boxes as reliable.
 */
import * as React from "react";
import { useTranslations } from "next-intl";
import { useDropzone } from "react-dropzone";
import { Loader2, UploadCloud } from "lucide-react";
import { loadImage } from "@/lib/image-preprocess";
import {
  detectObjects,
  confidenceTier,
  tierColor,
  isModelLoadStarted,
  getBackendName,
  type Detection,
} from "@/lib/vision-engine";

const SAMPLES: Array<{ url: string; labelKey: "sampleStreet" | "sampleWorkspace" | "sampleDog" }> = [
  { url: "/samples/vision/street-traffic.jpg", labelKey: "sampleStreet" },
  { url: "/samples/vision/workspace-meeting.jpg", labelKey: "sampleWorkspace" },
  { url: "/samples/vision/dog-beach.jpg", labelKey: "sampleDog" },
];

export function VisionDemo() {
  const t = useTranslations("Examples.vision");

  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [naturalSize, setNaturalSize] = React.useState<{ width: number; height: number } | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [loadingLabel, setLoadingLabel] = React.useState("");
  const [detections, setDetections] = React.useState<Detection[]>([]);
  const [inferenceMs, setInferenceMs] = React.useState<number | null>(null);
  const [modelLoadMs, setModelLoadMs] = React.useState<number | null>(null);
  const [backend, setBackend] = React.useState<string | null>(null);
  const [lowConfidenceScene, setLowConfidenceScene] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const runIdRef = React.useRef(0);
  const blobUrlRef = React.useRef<string | null>(null); // the one blob URL currently backing <img>, if any

  React.useEffect(() => {
    // Revoke whatever blob URL is still live when the demo unmounts.
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const runDetection = React.useCallback(
    async (rawUrl: string, isBlobUrl: boolean) => {
      const runId = ++runIdRef.current;
      setStatus("loading");
      setError(null);
      setDetections([]);
      setNaturalSize(null);
      setInferenceMs(null);
      setLowConfidenceScene(false);
      setLoadingLabel(isModelLoadStarted() ? t("statusRunning") : t("statusLoadingModel"));

      // The previous run's blob URL (if any) is safe to free now — a new
      // image is about to replace it as the <img> source.
      if (blobUrlRef.current && blobUrlRef.current !== rawUrl) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = isBlobUrl ? rawUrl : null;

      try {
        const img = await loadImage(rawUrl);
        if (runIdRef.current !== runId) return;
        setImageUrl(rawUrl);
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });

        const result = await detectObjects(img);
        if (runIdRef.current !== runId) return;

        setDetections(result.detections);
        setInferenceMs(result.inferenceMs);
        setModelLoadMs(result.modelLoadMs);
        setBackend(getBackendName());
        setLowConfidenceScene(result.lowConfidenceScene);
        setStatus("done");
      } catch (err) {
        if (runIdRef.current !== runId) return;
        setError(err instanceof Error ? err.message : t("errorPrefix"));
        setStatus("error");
      }
    },
    [t]
  );

  const onDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      void runDetection(URL.createObjectURL(file), true);
    },
    [runDetection]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
    maxFiles: 1,
    multiple: false,
  });

  const loading = status === "loading";
  const estFps = inferenceMs && inferenceMs > 0 ? Math.round(1000 / inferenceMs) : null;

  return (
    <div className="space-y-5">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-zinc-500 bg-zinc-900/60" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
        }`}
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
            onClick={() => void runDetection(sample.url, false)}
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
          <div className="space-y-2">
            <div className="relative inline-block max-w-full rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="block max-w-full h-auto" />
              {naturalSize && detections.length > 0 && (
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
                  preserveAspectRatio="none"
                >
                  {detections.map((d, i) => {
                    const [x, y, w, h] = d.bbox;
                    const color = tierColor(confidenceTier(d.score));
                    const label = `${d.class} [${(d.score * 100).toFixed(1)}%]`;
                    const strokeWidth = Math.max(1, naturalSize.width / 400);
                    const fontSize = Math.max(10, naturalSize.width / 55);
                    const tagHeight = fontSize * 1.6;
                    const tagWidth = label.length * fontSize * 0.62 + fontSize;
                    const tagY = Math.max(0, y - tagHeight);
                    return (
                      <g key={i}>
                        <rect x={x} y={y} width={Math.max(1, w)} height={Math.max(1, h)} fill="transparent" stroke={color} strokeWidth={strokeWidth} />
                        <rect x={x} y={tagY} width={tagWidth} height={tagHeight} fill="#09090b" opacity={0.85} />
                        <text
                          x={x + fontSize * 0.35}
                          y={tagY + tagHeight * 0.72}
                          fontSize={fontSize}
                          fontFamily="monospace"
                          fill={color}
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {loading && (
                <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
                  <p className="text-[11px] font-mono text-zinc-400 max-w-[80%] text-center">{loadingLabel}</p>
                </div>
              )}
            </div>

            {status === "done" && (
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
              </div>
            )}

            {status === "done" && detections.length > 0 && lowConfidenceScene && (
              <p className="text-[11px] text-amber-400 leading-relaxed rounded-md border border-amber-900/60 bg-amber-950/40 px-2.5 py-2">
                {t("lowConfidenceAdvisory")}
              </p>
            )}

            <p className="text-[10px] text-zinc-600 leading-relaxed">{t("modelNote")}</p>

            {status === "error" && (
              <p className="text-xs text-red-400">
                {t("errorPrefix")}
                {error ? `: ${error}` : ""}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {status === "done" && (
              <>
                <section className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{t("sectionTelemetry")}</h4>
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statModel")}</dt>
                      <dd className="text-xs text-zinc-300 mt-0.5 font-mono">YOLOX-Nano</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statLatency")}</dt>
                      <dd className="text-xs text-zinc-300 mt-0.5 font-mono">{inferenceMs}ms</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statObjects")}</dt>
                      <dd className="text-xs text-zinc-300 mt-0.5 font-mono">{detections.length}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statFps")}</dt>
                      <dd className="text-xs text-zinc-300 mt-0.5 font-mono">{estFps ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statBackend")}</dt>
                      <dd className="text-xs text-zinc-300 mt-0.5 font-mono">{backend ?? "—"}</dd>
                    </div>
                    {modelLoadMs !== null && (
                      <div>
                        <dt className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">{t("statModelLoad")}</dt>
                        <dd className="text-xs text-zinc-300 mt-0.5 font-mono">{modelLoadMs}ms</dd>
                      </div>
                    )}
                  </dl>
                  <p className="text-[10px] text-zinc-600">{t("fpsHint")}</p>
                  {modelLoadMs !== null && <p className="text-[10px] text-zinc-600">{t("modelLoadHint")}</p>}
                </section>

                <section className="rounded-md border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{t("sectionDetections")}</h4>
                  {detections.length === 0 ? (
                    <p className="text-xs text-zinc-600 italic">{t("noneDetected")}</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                      {detections
                        .slice()
                        .sort((a, b) => b.score - a.score)
                        .map((d, i) => {
                          const tier = confidenceTier(d.score);
                          return (
                            <li key={i} className="flex items-center justify-between gap-2 text-xs">
                              <span className="flex items-center gap-2 min-w-0">
                                <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: tierColor(tier) }} />
                                <span className="text-zinc-200 truncate">{d.class}</span>
                              </span>
                              <span className="text-zinc-500 font-mono shrink-0">{(d.score * 100).toFixed(1)}%</span>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
