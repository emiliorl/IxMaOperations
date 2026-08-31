/**
 * lib/vision-engine.ts
 *
 * Phase 6 of CAPABILITY_DEMOS_PLAN.md — the model wrapper behind
 * components/examples/VisionDemo.tsx (the "Custom Vision Model" capability
 * card). Runs YOLOX-Nano (Megvii, Apache-2.0 — see
 * public/models/YOLOX-LICENSE.txt) via ONNX Runtime Web's WASM execution
 * provider, entirely client-side. No server round-trip, no simulated
 * detections; every box, class, and confidence score comes straight out of
 * this model's own output.
 *
 * Unlike the earlier @tensorflow-models/coco-ssd version of this file,
 * ONNX Runtime only runs the raw network — everything around it is
 * implemented here from scratch, matching Megvii's own reference
 * ONNXRuntime demo (`demo/ONNXRuntime/onnx_inference.py` in the YOLOX repo)
 * step for step:
 *   1. Letterbox the image onto a 416x416 canvas (scale to fit, pad the
 *      remainder with mid-gray 114/114/114, origin at top-left — not
 *      centered) and convert to a [1,3,416,416] CHW float32 tensor.
 *   2. Run the network, which returns one raw [1,3549,85] tensor: 3549
 *      anchor-free grid cells across three feature-map strides (8/16/32),
 *      each row [cx, cy, w, h, objectness, ...80 class scores].
 *   3. Decode each cell's box from its own grid position and stride, then
 *      run this file's own greedy IoU non-max suppression — the model
 *      doesn't do this itself; it just scores every grid cell.
 *
 * That reference pipeline was validated against this exact model file in
 * Python (onnxruntime, CPUExecutionProvider) before being ported here,
 * including a real bug the Python check caught: this model expects BGR
 * channel order, not RGB — swapping only R/B (not RGB entirely) dropped a
 * correct "dog" detection's confidence by ~15 points and produced several
 * duplicate low-confidence boxes on a street scene, well before this ever
 * touched a browser or a visitor's image.
 *
 * The ~13MB onnxruntime-web WASM runtime is fetched from jsdelivr (not
 * bundled — same reasoning as the model weights previously being fetched
 * from Google's CDN: a multi-MB binary has no business in the app's own
 * bundle) and the ~3.5MB model from this app's own /public/models/, both
 * lazily on first use via dynamic import.
 */

const MODEL_URL = "/models/yolox-nano.onnx";
const ORT_VERSION = "1.29.0"; // pinned to match the installed onnxruntime-web version
const ORT_WASM_CDN = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const INPUT_SIZE = 416; // yolox_nano's own trained test_size (exps/default/yolox_nano.py)
const STRIDES = [8, 16, 32];
const NMS_IOU_THRESHOLD = 0.45; // matches Megvii's own demo default
const PRE_NMS_SCORE_THRESHOLD = 0.1; // candidate floor before NMS, matches Megvii's own demo
const DISPLAY_SCORE_THRESHOLD = 0.3; // matches Megvii's own demo's default --score_thr

const HIGH_CONFIDENCE = 0.75;
const MEDIUM_CONFIDENCE = 0.5;
// Below this, the model's own best guess on the whole image is weak enough
// that the result is more "here's its least-bad guess" than a confident
// read — worth flagging rather than presenting silently as reliable.
const LOW_CONFIDENCE_SCENE_THRESHOLD = 0.7;

// Dense 0-indexed COCO class list, in the exact order YOLOX's output
// channels use (yolox/data/datasets/coco_classes.py) — unlike coco-ssd's
// sparse 1-90 category IDs, this has no gaps to map through.
const COCO_CLASSES = [
  "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
  "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog",
  "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella",
  "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball", "kite",
  "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket", "bottle",
  "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich",
  "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
  "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote",
  "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book",
  "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush",
] as const;

export interface Detection {
  class: string;
  score: number; // 0-1
  bbox: [number, number, number, number]; // [x, y, width, height] in source-image pixels
}

export type ConfidenceTier = "high" | "medium" | "low";

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

// Narrow structural type for just what this file uses from onnxruntime-web,
// so the public surface here doesn't leak the library's exact shape.
interface OrtModule {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  InferenceSession: {
    create(uri: string, options?: { executionProviders?: string[] }): Promise<OrtSession>;
  };
  Tensor: new (type: "float32", data: Float32Array, dims: readonly number[]) => OrtTensor;
}
interface OrtTensor {
  data: Float32Array | number[];
}
interface OrtSession {
  outputNames: readonly string[];
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
}

let ortModulePromise: Promise<OrtModule> | null = null;
let sessionPromise: Promise<OrtSession> | null = null;
let backendLabel: string | null = null;

async function getSession(): Promise<{ ort: OrtModule; session: OrtSession }> {
  if (!ortModulePromise) {
    ortModulePromise = (async () => {
      const ort = (await import("onnxruntime-web/wasm")) as unknown as OrtModule;
      ort.env.wasm.wasmPaths = ORT_WASM_CDN;
      // Multi-threaded WASM needs cross-origin isolation (SharedArrayBuffer)
      // this site doesn't opt into — force single-threaded so it reliably
      // works everywhere rather than silently falling back per-browser.
      // yolox-nano is small enough that this costs single-digit ms.
      ort.env.wasm.numThreads = 1;
      return ort;
    })();
  }
  const ort = await ortModulePromise;
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_URL, { executionProviders: ["wasm"] });
    backendLabel = "wasm (onnxruntime-web)";
  }
  return { ort, session: await sessionPromise };
}

/** True once a model load has been kicked off (not necessarily finished) —
 *  lets the UI skip the "downloading model" copy on the visitor's 2nd+ run. */
export function isModelLoadStarted(): boolean {
  return sessionPromise !== null;
}

/** The active execution provider, once known — null until the first
 *  session create has resolved. Real telemetry, not a staged value. */
export function getBackendName(): string | null {
  return backendLabel;
}

// --- Step 1: letterbox preprocessing --------------------------------------

interface LetterboxResult {
  tensorData: Float32Array;
  ratio: number;
}

function letterbox(image: HTMLImageElement): LetterboxResult {
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  // Pad value 114 on all channels — matches Megvii's reference preproc()
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const ratio = Math.min(INPUT_SIZE / image.naturalHeight, INPUT_SIZE / image.naturalWidth);
  // Math.floor (not round) — matches Python's int() truncation in preproc()
  const newWidth = Math.floor(image.naturalWidth * ratio);
  const newHeight = Math.floor(image.naturalHeight * ratio);
  ctx.drawImage(image, 0, 0, newWidth, newHeight);

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE); // RGBA, top-left origin
  const size = INPUT_SIZE * INPUT_SIZE;
  const tensorData = new Float32Array(3 * size);
  // CHW, channel order B, G, R — the model was trained on cv2 (BGR) images
  // with no explicit channel conversion; see this file's header comment for
  // the accuracy cost of getting this backwards. No /255 normalization —
  // the exported graph expects raw 0-255 values, also confirmed in the
  // Python validation.
  for (let i = 0; i < size; i++) {
    const o = i * 4;
    tensorData[i] = data[o + 2]; // plane 0 = Blue
    tensorData[size + i] = data[o + 1]; // plane 1 = Green
    tensorData[2 * size + i] = data[o]; // plane 2 = Red
  }
  return { tensorData, ratio };
}

// --- Step 2 & 3: decode the anchor-free grid output + greedy NMS ----------

interface Candidate {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  score: number;
  classId: number;
}

function iou(a: Candidate, b: Candidate): number {
  const interX1 = Math.max(a.x1, b.x1);
  const interY1 = Math.max(a.y1, b.y1);
  const interX2 = Math.min(a.x2, b.x2);
  const interY2 = Math.min(a.y2, b.y2);
  const interW = Math.max(0, interX2 - interX1 + 1);
  const interH = Math.max(0, interY2 - interY1 + 1);
  const interArea = interW * interH;
  const areaA = (a.x2 - a.x1 + 1) * (a.y2 - a.y1 + 1);
  const areaB = (b.x2 - b.x1 + 1) * (b.y2 - b.y1 + 1);
  return interArea / (areaA + areaB - interArea);
}

const ROW_LENGTH = 5 + COCO_CLASSES.length; // cx, cy, w, h, objectness, 80 class scores

function decodeAndNms(output: ArrayLike<number>, ratio: number): Detection[] {
  const candidates: Candidate[] = [];
  let cell = 0;

  for (const stride of STRIDES) {
    const gridSize = INPUT_SIZE / stride; // 52, 26, 13
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const base = cell * ROW_LENGTH;
        const objectness = output[base + 4];

        let bestClass = 0;
        let bestClassProb = output[base + 5];
        for (let c = 1; c < COCO_CLASSES.length; c++) {
          const p = output[base + 5 + c];
          if (p > bestClassProb) {
            bestClassProb = p;
            bestClass = c;
          }
        }

        const score = objectness * bestClassProb;
        if (score > PRE_NMS_SCORE_THRESHOLD) {
          // anchor-free decode — box center/size come from this cell's own
          // grid position and stride, not a fixed anchor box
          const cx = (output[base + 0] + gx) * stride;
          const cy = (output[base + 1] + gy) * stride;
          const w = Math.exp(output[base + 2]) * stride;
          const h = Math.exp(output[base + 3]) * stride;
          candidates.push({
            x1: (cx - w / 2) / ratio,
            y1: (cy - h / 2) / ratio,
            x2: (cx + w / 2) / ratio,
            y2: (cy + h / 2) / ratio,
            score,
            classId: bestClass,
          });
        }
        cell++;
      }
    }
  }

  // Greedy NMS, class-agnostic (matches Megvii's own default) — a car box
  // and a person box can suppress each other if they overlap enough, same
  // as two car boxes would.
  candidates.sort((a, b) => b.score - a.score);
  const kept: Candidate[] = [];
  const suppressed = new Uint8Array(candidates.length);
  for (let i = 0; i < candidates.length; i++) {
    if (suppressed[i]) continue;
    kept.push(candidates[i]);
    for (let j = i + 1; j < candidates.length; j++) {
      if (!suppressed[j] && iou(candidates[i], candidates[j]) > NMS_IOU_THRESHOLD) {
        suppressed[j] = 1;
      }
    }
  }

  return kept
    .filter((d) => d.score >= DISPLAY_SCORE_THRESHOLD)
    .map((d) => ({
      class: COCO_CLASSES[d.classId],
      score: d.score,
      bbox: [d.x1, d.y1, d.x2 - d.x1, d.y2 - d.y1] as [number, number, number, number],
    }));
}

// --- Orchestration ---------------------------------------------------------

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

function round1(ms: number): number {
  return Math.round(ms * 10) / 10;
}

export async function detectObjects(image: HTMLImageElement): Promise<DetectionResult> {
  const isFirstLoad = sessionPromise === null;
  const loadStart = performance.now();
  const { ort, session } = await getSession();
  const modelLoadMs = isFirstLoad ? round1(performance.now() - loadStart) : null;

  const inferStart = performance.now();
  const { tensorData, ratio } = letterbox(image);
  const inputTensor = new ort.Tensor("float32", tensorData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const results = await session.run({ images: inputTensor });
  const output = results[session.outputNames[0]].data;
  const detections = decodeAndNms(output, ratio);
  const inferenceMs = round1(performance.now() - inferStart);

  const bestScore = detections.reduce((max, d) => Math.max(max, d.score), 0);

  return {
    detections,
    modelLoadMs,
    inferenceMs,
    lowConfidenceScene: detections.length === 0 || bestScore < LOW_CONFIDENCE_SCENE_THRESHOLD,
  };
}
