"use client";

/**
 * lib/image-preprocess.ts
 *
 * Browser-only image preprocessing for the OCR demo
 * (components/examples/OcrDemo.tsx). The built-in samples in
 * public/samples/ocr/ are clean rendered receipts — real uploaded photos
 * (uneven lighting, shadows, phone-camera noise, small/skewed text) read
 * far worse to tesseract.js untouched. This applies the standard fixes
 * before recognition ever runs:
 *
 *  - scales the image into the size band tesseract reads best at (a small
 *    crop gets upscaled; a multi-megapixel phone photo gets capped, both
 *    for accuracy and so recognition doesn't take forever),
 *  - converts to grayscale,
 *  - divides out uneven local lighting: each pixel is normalized against a
 *    heavily-blurred ("local background") estimate of its own neighborhood,
 *    so a shadow or lighting gradient across the photo gets flattened back
 *    toward white without touching well-lit regions.
 *
 * Deliberately NOT hard black/white thresholding (binarization/Otsu/etc.) —
 * that's the right move for Tesseract's old pattern-matching "Legacy"
 * engine, but tesseract.js defaults to (and this demo uses) the LSTM engine,
 * which was trained on natural grayscale/antialiased text and reads *worse*
 * once that gradation gets forced to pure black-or-white; a hard threshold
 * can also delete genuinely faint print (common on thermal receipts) outright
 * rather than just enhancing it. The division-based normalization here keeps
 * every pixel continuous grayscale — a flat, well-lit image comes out
 * essentially unchanged, so this should never make an easy photo read worse,
 * only make a hard one (shadowed, uneven lighting) read closer to the easy
 * case.
 *
 * Runs entirely on a <canvas> — no server round-trip, no extra dependency.
 * The processed canvas is what both gets shown to the visitor (so they see
 * what the engine actually read, not a black-box transformation of their
 * photo) and gets handed to tesseract.js directly.
 */

const MIN_LONG_SIDE = 1000;
const MAX_LONG_SIDE = 2600;
const BLUR_PX = 25; // radius of the "local background" window — bigger than a character stroke, small enough to track a lighting gradient

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load that image."));
    img.src = url;
  });
}

function scaledSize(width: number, height: number): { width: number; height: number } {
  const longSide = Math.max(width, height);
  const scale = longSide < MIN_LONG_SIDE ? MIN_LONG_SIDE / longSide : longSide > MAX_LONG_SIDE ? MAX_LONG_SIDE / longSide : 1;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Draws `img` scaled onto a fresh canvas, converts it to grayscale, and
 *  flattens uneven local lighting against a blurred background estimate —
 *  returns the processed canvas, ready to display and to hand straight to
 *  tesseract.js. */
export function preprocessForOcr(img: HTMLImageElement): HTMLCanvasElement {
  const { width, height } = scaledSize(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  // A heavily blurred copy of the now-grayscale image approximates the
  // page's local lighting at each point (text strokes are too thin to
  // survive a blur this wide, so this is background, not ink).
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext("2d", { willReadFrequently: true });
  if (!bgCtx) return canvas;
  bgCtx.filter = `blur(${BLUR_PX}px)`;
  bgCtx.drawImage(canvas, 0, 0);
  const bg = bgCtx.getImageData(0, 0, width, height).data;

  // Divide each pixel by its local background and rescale to white — where
  // the background is already bright (bg ≈ 255) this is a no-op, where it's
  // darkened by a shadow (bg < 255) this brightens that whole neighborhood
  // back up while preserving how dark the ink is *relative to* its own
  // background. Continuous grayscale in, continuous grayscale out.
  for (let i = 0; i < data.length; i += 4) {
    const localBg = Math.max(bg[i], 1); // guard against a divide-by-zero on a fully black patch
    const v = Math.min(255, Math.round((data[i] / localBg) * 255));
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/** Resolves after the browser's next paint — used before the synchronous
 *  (and, on a large photo, non-trivial) canvas work in preprocessForOcr so
 *  a "loading" state committed just before it actually reaches the screen
 *  instead of the tab appearing to freeze with nothing shown yet. */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
