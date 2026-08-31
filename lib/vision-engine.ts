/**
 * lib/vision-engine.ts
 *
 * Phase 6 of CAPABILITY_DEMOS_PLAN.md — the model wrapper behind
 * components/examples/VisionDemo.tsx (the "Custom Vision Model" capability
 * card). Loads a real pretrained object-detection model
 * (`@tensorflow-models/coco-ssd`, MobileNet backbone) on top of
 * `@tensorflow/tfjs`'s WebGL backend, and runs real inference against
 * whatever image the visitor picks — entirely in the browser. No server
 * round-trip, no simulated detections; every box, class, and confidence
 * score shown by the demo comes straight out of this model's own output.
 *
 * This is a general-purpose 80-class detector (the COCO dataset — people,
 * vehicles, furniture, animals, everyday objects), not a custom-trained
 * defect-inspection model. It's shown here as a stand-in for the same
 * underlying pipeline a bespoke inspection model would run (image in,
 * boxes + classes + confidence out) — not a claim that this pretrained
 * model itself does defect detection (STANDARDS.md / PROJECT_BLUEPRINT.md
 * Section 8 Rule 2). Both tfjs and the ~7MB `lite_mobilenet_v2` weights
 * load lazily via dynamic import on first use, never in the main bundle.
 */

export interface Detection {
  class: string;
  score: number; // 0-1
  bbox: [number, number, number, number]; // [x, y, width, height] in source-image pixels
}

export type ConfidenceTier = "high" | "medium" | "low";

const HIGH_CONFIDENCE = 0.75;
const MEDIUM_CONFIDENCE = 0.5;
const MIN_SCORE = 0.45;
const MAX_DETECTIONS = 20;

export function confidenceTier(score: number): ConfidenceTier {
  if (score >= HIGH_CONFIDENCE) return "high";
  if (score >= MEDIUM_CONFIDENCE) return "medium";
  return "low";
}

// STANDARDS.md Section 6 — crisp 1px vectors, Green #22c55e / Amber #f59e0b;
// low-confidence boxes get Red so a visitor can see the model's own doubt.
export function tierColor(tier: ConfidenceTier): string {
  if (tier === "high") return "#22c55e";
  if (tier === "medium") return "#f59e0b";
  return "#ef4444";
}

// Narrow, structural type instead of importing coco-ssd's own class — keeps
// this module's public surface independent of the library's exact shape.
interface CocoSsdModel {
  detect(
    img: HTMLImageElement | HTMLCanvasElement,
    maxNumBoxes?: number,
    minScore?: number
  ): Promise<Array<{ class: string; score: number; bbox: [number, number, number, number] }>>;
}

// Cached across calls/images for the lifetime of the page — the model's
// weights are ~7MB, so this avoids re-downloading and re-initializing on
// every image the visitor tries.
let modelPromise: Promise<CocoSsdModel> | null = null;
let tfBackend: string | null = null;

async function getModel(): Promise<CocoSsdModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [tf, cocoSsd] = await Promise.all([import("@tensorflow/tfjs"), import("@tensorflow-models/coco-ssd")]);
      await tf.ready();
      tfBackend = tf.getBackend();
      return (await cocoSsd.load({ base: "lite_mobilenet_v2" })) as unknown as CocoSsdModel;
    })();
  }
  return modelPromise;
}

/** True once a model load has been kicked off (not necessarily finished) —
 *  lets the UI skip the "downloading model" copy on the visitor's 2nd+ run. */
export function isModelLoadStarted(): boolean {
  return modelPromise !== null;
}

/** tfjs's active backend ("webgl", "cpu", ...) once known — null until the
 *  first model load has resolved. Real telemetry, not a staged value. */
export function getBackendName(): string | null {
  return tfBackend;
}

export interface DetectionResult {
  detections: Detection[];
  /** Time spent downloading/initializing the model, or null if it was
   *  already cached from an earlier call this session. Kept separate from
   *  `inferenceMs` so the UI never reports a multi-second one-time model
   *  load as if it were this image's own inference cost. */
  modelLoadMs: number | null;
  inferenceMs: number;
}

export async function detectObjects(image: HTMLImageElement): Promise<DetectionResult> {
  const isFirstLoad = modelPromise === null;
  const loadStart = performance.now();
  const model = await getModel();
  const modelLoadMs = isFirstLoad ? Math.round((performance.now() - loadStart) * 10) / 10 : null;

  const inferStart = performance.now();
  const raw = await model.detect(image, MAX_DETECTIONS, MIN_SCORE);
  const inferenceMs = Math.round((performance.now() - inferStart) * 10) / 10;

  return {
    detections: raw.map((d) => ({ class: d.class, score: d.score, bbox: d.bbox })),
    modelLoadMs,
    inferenceMs,
  };
}
