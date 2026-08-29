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
 *  - adaptive (local-mean) thresholding to binarize. A single global
 *    threshold (e.g. Otsu) blows out one side of a photo with a shadow or
 *    lighting gradient across it — comparing each pixel to a *nearby*
 *    background estimate instead survives that, which is exactly the
 *    difference between a scanned/rendered receipt and a photographed one.
 *
 * Runs entirely on a <canvas> — no server round-trip, no extra dependency.
 * The processed canvas is what both gets shown to the visitor (so they see
 * what the engine actually read, not a black-box transformation of their
 * photo) and gets handed to tesseract.js directly.
 */

const MIN_LONG_SIDE = 1000;
const MAX_LONG_SIDE = 2200;
const BLUR_PX = 21; // radius of the "local background" window for adaptive thresholding
const THRESHOLD_BIAS = 12; // C — how much darker than local background counts as ink

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
 *  applies adaptive (local-mean) thresholding to binarize it — returns the
 *  processed canvas, ready to display and to hand straight to tesseract.js. */
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
  // page's local lighting at each point.
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext("2d", { willReadFrequently: true });
  if (!bgCtx) return canvas;
  bgCtx.filter = `blur(${BLUR_PX}px)`;
  bgCtx.drawImage(canvas, 0, 0);
  const bg = bgCtx.getImageData(0, 0, width, height).data;

  for (let i = 0; i < data.length; i += 4) {
    const isInk = data[i] < bg[i] - THRESHOLD_BIAS;
    const v = isInk ? 0 : 255;
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
