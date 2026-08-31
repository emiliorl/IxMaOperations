import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * Content-Security-Policy — scoped to exactly what this app's client-side
 * code actually loads, not a generic template:
 *  - cdn.jsdelivr.net: tesseract.js's worker/core/lang-data (OcrDemo) AND
 *    onnxruntime-web's WASM runtime (VisionDemo) both default to this CDN.
 *  - blob:: tesseract.js spawns its worker from a Blob URL by default
 *    (workerBlobURL), and canvas.toDataURL()/URL.createObjectURL() (OcrDemo,
 *    VisionDemo file uploads) produce blob:/data: URLs rendered in <img>.
 *  - 'wasm-unsafe-eval': lets the browser instantiate WebAssembly (both of
 *    the above) without the much broader 'unsafe-eval'.
 *  - calendly.com: the booking iframe (ScheduleEmbed.tsx).
 *  - fonts.googleapis.com / fonts.gstatic.com: the Google Fonts <link> in
 *    app/[locale]/layout.tsx.
 *
 * Dev vs. prod script-src: Next's dev server wraps modules with eval() for
 * Hot Module Replacement — a real `next dev` run under the strict prod
 * policy below silently breaks (onClick handlers appear attached but
 * nothing happens, no console error, no CSP-violation event; that's what
 * "unsafe-eval" being missing looks like, not a rethrown error). Production
 * builds don't use eval-based HMR, so the deployed site gets the strict
 * 'wasm-unsafe-eval'-only policy; only local `next dev` gets 'unsafe-eval'.
 *
 * Verified against a live run through the OCR and Vision demos and the
 * Calendly embed (no console CSP-violation errors) before shipping.
 */
const isDev = process.env.NODE_ENV !== "production";
const CSP = [
  "default-src 'self'",
  // cdn.jsdelivr.net here (not just connect-src) because tesseract.js's
  // worker loads its own script via importScripts(), which script-src
  // governs, not connect-src — connect-src alone let that request through
  // silently in some cases but not others; both need it to be reliable.
  `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net ${isDev ? "'unsafe-eval'" : "'wasm-unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://images.unsplash.com",
  "connect-src 'self' https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
  "frame-src https://calendly.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Minification is on by default in production; this additionally keeps
  // source maps off the deployed site so DevTools can't "pretty-print"
  // minified bundles back into readable original source. Client-side JS is
  // always inspectable at the network/execution level — this only removes
  // the easiest path to a readable reconstruction of it.
  productionBrowserSourceMaps: false,
  images: {
    domains: ["images.unsplash.com"],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  webpack: (config) => {
    // next-intl's extractor uses a dynamic import() that webpack's
    // FileSystemInfo can't statically resolve for build-dependency
    // tracking. It's harmless (only affects cache invalidation
    // precision for that one internal file) and is logged via
    // infrastructureLogging rather than compilation warnings, so it
    // has to be silenced at that level.
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: "error",
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
