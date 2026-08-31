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
 * Section 8 Rule 2). Both tfjs and the ~26MB `mobilenet_v1` weights load
 * lazily via dynamic import on first use, never in the main bundle.
 *
 * Base model choice (Aug 30, 2026): an in-browser A/B test against
 * `lite_mobilenet_v2` (17MB) and `mobilenet_v2` (64MB) found all three
 * scored 87-98% on ordinary single/multi-dog photos — the base model isn't
 * what makes or breaks accuracy here. `mobilenet_v1` is used as a modest,
 * low-risk step up in documented accuracy for a fair size cost, not a claim
 * that it fixes hard scenes. What actually breaks any of the three: many
 * overlapping same-class objects, occlusion (props/costumes hiding the
 * features that distinguish e.g. a dog from a teddy bear), and heavy visual
 * clutter — a structural limitation of SSD-style detectors, not a config
 * problem. See VisionDemo.tsx's low-confidence advisory and caption, which
 * disclose this rather than silently presenting a shaky guess as reliable.
 */

export interface Detection {
  class: string;
  score: number; // 0-1
  bbox: [number, number, number, number]; // [x, y, width, height] in source-image pixels
}

export type ConfidenceTier = "high" | "medium" | "low";

const HIGH_CONFIDENCE = 0.75;
const MEDIUM_CONFIDENCE = 0.5;
const MIN_SCORE = 0.5; // coco-ssd's own default — 0.45 let through noise the tier coloring didn't earn
const MAX_DETECTIONS = 20;
// Below this, the model's own best guess on the whole image is weak enough
// that the result is more "here's its least-bad guess" than a confident
// read — worth flagging rather than presenting silently as reliable.
const LOW_CONFIDENCE_SCENE_THRESHOLD = 0.7;

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
      return (await cocoSsd.load({ base: "mobilenet_v1" })) as unknown as CocoSsdModel;
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
  /** True when even the model's single best guess on this image scored
   *  below LOW_CONFIDENCE_SCENE_THRESHOLD — a real signal (from the model's
   *  own output, not a heuristic on image content) that this scene is
   *  harder than usual, surfaced by the UI as an honest advisory rather
   *  than silently showing shaky boxes as if they were reliable. */
  lowConfidenceScene: boolean;
}

export async function detectObjects(image: HTMLImageElement): Promise<DetectionResult> {
  const isFirstLoad = modelPromise === null;
  const loadStart = performance.now();
  const model = await getModel();
  const modelLoadMs = isFirstLoad ? Math.round((performance.now() - loadStart) * 10) / 10 : null;

  const inferStart = performance.now();
  const raw = await model.detect(image, MAX_DETECTIONS, MIN_SCORE);
  const inferenceMs = Math.round((performance.now() - inferStart) * 10) / 10;

  const detections = raw.map((d) => ({ class: d.class, score: d.score, bbox: d.bbox }));
  const bestScore = detections.reduce((max, d) => Math.max(max, d.score), 0);

  return {
    detections,
    modelLoadMs,
    inferenceMs,
    lowConfidenceScene: detections.length === 0 || bestScore < LOW_CONFIDENCE_SCENE_THRESHOLD,
  };
}
