# Real Working Capability Demos — Architecture & Engineering Plan (`CAPABILITY_DEMOS_PLAN.md`)

> **Objective:** Deliver fully functional, testable mini-engines for each capability card so visitors can provide their own inputs (URLs, receipts, transcripts, CSVs, JSON payloads, images) and see real code and extraction pipelines execute in real time.  
> **Host Component:** `components/home/ExamplesSection.tsx`  
> **Standards:** Sober Engineering Aesthetic (Zinc 950, 1px Hairline Borders, Monospaced Metrics — per `STANDARDS.md`), fully localized (EN/ES via `next-intl`).

---

## 1. Architecture Strategy: Real Execution Without Infrastructure Bloat

To ensure maximum responsiveness, privacy, and zero reliance on fragile external paid APIs, we utilize two execution strategies:

1. **Client-Side WASM / Web Worker Pipelines:**
   - Runs OCR (`tesseract.js`), Data QA / Regex validation, NLP parsing, and Computer Vision (`@tensorflow/tfjs` or WebGL) directly in the visitor's browser.
   - **Zero API costs, instant response, 100% privacy** (client data never leaves their browser).
2. **Lightweight Edge API Routes:**
   - For live scraping (`/api/examples/scrape`), Next.js Edge/Node handlers fetch public HTML, sanitize DOM trees, extract JSON-LD/OpenGraph/meta tags, and return structured payloads.

---

## 2. Detailed Technical Breakdown for Each Phase

---

### Phase 1: Real Scraping & Enrichment Engine (`lead-scraper-enrichment`)

#### 1.1 What the User Tests
The visitor can type **any public URL** or pick from curated **one-click presets**. The tool fetches the live page, parses the DOM and meta tags, and returns structured business intelligence in under 2 seconds.

#### 1.2 Target Website Categories & Recommended Test Sites
| Category | Recommended Examples | What Gets Extracted |
|---|---|---|
| **B2B SaaS & Tech Companies** | `https://linear.app`, `https://resend.com`, `https://stripe.com` | Brand identity, value prop, detected tech stack (`Next.js`, `Tailwind`, `React`), social handles (`@linear`), OpenGraph assets. |
| **E-Commerce Storefronts** | `https://kith.com`, `https://allbirds.com` | Store platform (e.g., Shopify), JSON-LD `OnlineStore`/`Product` schema, support emails, localized currency. |
| **Media & Publications** | `https://news.ycombinator.com`, Substack articles | Semantic headings (`H1`/`H2`), article publication dates, author metadata, top link lists. |
| **Visitor's Own Website** | `https://yourcompany.com` | Live inspection of their own domain's public footprint, meta tags, and tech signatures. |

#### 1.3 Under the Hood (Real Pipeline)
* **API Handler (`app/api/examples/scrape/route.ts`):**
  * Accepts `{ url: string }` via `POST`.
  * Validates URL format with Zod and enforces request timeouts (5s).
  * Fetches the target page with standard browser headers.
  * Extracts:
    * **Page Identity:** Title, Meta Description, Favicon, Canonical URL.
    * **OpenGraph & Twitter Cards:** `og:image`, `og:site_name`, `og:type`.
    * **Structured Data:** JSON-LD schema objects (`Organization`, `WebSite`, `Product`).
    * **Technology Fingerprints:** Detected frameworks/CMS (`Next.js`, `React`, `Shopify`, `WordPress`, `Tailwind`).
    * **Contact & Social Leads:** Extracted Twitter/X handles, LinkedIn links, GitHub handles, public contact emails.
  * **Graceful Edge-Case Handling:** If a site blocks serverless IPs or requires CAPTCHA (e.g. Cloudflare Turnstile), returns a clean technical notice:  
    `"Bot shield / CAPTCHA detected. Production scraper uses residential proxy rotation & stealth browser workers."` (demonstrating why client-tier packages are needed for protected targets).

#### 1.4 Frontend Component (`components/examples/ScraperDemo.tsx`)
* **Input Bar:** URL input with validation and a high-contrast `[ ⚡ Scrape ]` trigger.
* **One-Click Preset Badges:** `[ Linear (SaaS) ]`, `[ Resend (API) ]`, `[ Hacker News (List) ]`.
* **Telemetry Bar:** Displays response time (`~240ms`), status (`200 OK`), payload size (`14.2 KB`).
* **Dual-View Output:**
  * **Structured Summary:** Clean cards with company details, tech stack badges, and social links.
  * **Raw JSON Payload:** Syntax-highlighted monospaced JSON for technical visitors.

---

### Phase 2: Real Document & Receipt OCR Engine (`invoice-ocr-pipeline`)

#### 2.1 What the User Tests
Visitors can **upload any image of a receipt/invoice** (PNG, JPEG) or pick from built-in sample receipts. The tool runs real OCR, draws bounding boxes over detected text, and extracts structured line items and totals into an exportable table.

#### 2.2 Under the Hood (Real Pipeline)
* **Client-Side Engine:**
  * Uses `tesseract.js` loaded on-demand via Web Worker.
  * Processes image matrix, detects word coordinates (`bbox: { x0, y0, x1, y1 }`) and confidence scores.
* **Extraction & Structuring Heuristics:**
  * Regex parser identifies invoice dates (`YYYY-MM-DD`, `MM/DD/YYYY`).
  * Currency parser detects totals, subtotals, and tax figures (`$`, `€`, `£`, `MXN`).
  * Line-item table builder groups items by vertical line coordinates.
* **Frontend Component (`components/examples/OcrDemo.tsx`):**
  * Drag-and-drop file uploader (`react-dropzone`) + sample image selector.
  * Live canvas overlay with real bounding boxes rendered on hover.
  * Tabular output with editable fields and a "Copy JSON" / "Download CSV" action.

---

### Phase 3: Real Content Repurposing Engine (`content-repurposing`)

#### 2.1 What the User Tests
Visitors can **paste any text, article paragraph, video transcript, or raw notes** (or load a sample transcript). The engine analyzes the content and dynamically generates multi-platform drafts.

#### 2.2 Under the Hood (Real Pipeline)
* **Client-Side NLP & Transformation Engine:**
  * Text statistics: word count, reading time, sentence complexity.
  * Key point extractor: ranks sentences by information density and topic frequency.
  * Hook generator: extracts provocative opening statements for social platforms.
* **Multi-Platform Deliverables:**
  * **X / Twitter Thread:** Generates a structured 1/N thread with hooks, body points, and conclusion.
  * **LinkedIn Post:** Generates an executive takeaway formatted with white space, bullet points, and hashtags.
  * **Executive TL;DR:** 3-bullet core summary.
* **Frontend Component (`components/examples/ContentDemo.tsx`):**
  * Textarea with sample presets.
  * Real-time character counters and platform tabs.
  * One-click "Copy to Clipboard" with toast feedback.

---

### Phase 4: Real Data Auditing & QA Linter (`data-qa-audit`)

#### 4.1 What the User Tests
Visitors can **upload a dirty CSV or paste unformatted text records** (with misformatted phone numbers, invalid emails, inconsistent casing, duplicates, and missing values). The engine runs real validation checks and returns a comprehensive health report.

#### 4.2 Under the Hood (Real Pipeline)
* **Validation Rules Engine (`lib/audit-engine.ts`):**
  * **Email RFC 5322 Validator:** Checks syntax, disposable domains, and common typos (`@gmai.com` → `@gmail.com`).
  * **Phone E.164 Normalizer:** Cleans punctuation, validates country code length, flags invalid numbers.
  * **Date Normalizer:** Parses ambiguous dates (`08/29/2026`, `29-Aug-2026`) into standardized ISO-8601 strings.
  * **Deduplication Engine:** Exact and fuzzy matching on email/phone records.
* **Frontend Component (`components/examples/AuditDemo.tsx`):**
  * Paste / upload area with "Load Sample Dirty Dataset (50 rows)" button.
  * Real-time health score meter (`0% - 100%`) with issue breakdown (Errors, Warnings, Fixed).
  * Interactive diff table showing `Raw Value` vs. `Corrected Value`.
  * "Download Cleaned CSV" button that generates a clean CSV blob directly in-browser.

---

### Phase 5: Real Backend Integrations & Webhook Playground (`api-workflow-integration`)

#### 5.1 What the User Tests
Visitors can **input any JSON webhook payload** (e.g., Stripe `payment_intent.succeeded`, Shopify `orders/create`, or a custom CRM lead) and build/execute a transformation pipeline.

#### 5.2 Under the Hood (Real Pipeline)
* **Pipeline Execution Engine (`lib/workflow-engine.ts`):**
  * Step 1: **Payload Ingestion & Schema Validation.**
  * Step 2: **Field Mapping & Normalization** (e.g., `amount_cents / 100`, string sanitization).
  * Step 3: **Condition Filtering** (e.g., `if total > 500 => route to Enterprise VIP`).
  * Step 4: **Downstream Payload Dispatch Simulation** (formatted SQL INSERT, Slack Block Kit message, and Resend email HTML).
* **Frontend Component (`components/examples/IntegrationDemo.tsx`):**
  * Visual node diagram showing live step-by-step evaluation.
  * JSON editor with syntax validation.
  * Step-by-step latency & execution trace log with expandable payload inspectors for each destination.

---

### Phase 6: Real Computer Vision & Object Inspection (`custom-vision-model`)

#### 6.1 What the User Tests
Visitors can **upload their own photo / part image** (or choose from demo inspection images) and run a client-side computer vision model to detect objects, features, or defects with real bounding boxes, confidence tags, and inference latency.

#### 6.2 Under the Hood (Real Pipeline)
* **Vision Model Engine:**
  * ~~Uses lightweight client-side COCO-SSD / MobileNet via `@tensorflow/tfjs`~~ — shipped, then replaced (Aug 30, 2026) with **YOLOX-Nano** (Megvii, Apache-2.0) via **ONNX Runtime Web**'s WASM execution provider, for better accuracy at a smaller download and to demonstrate a hand-rolled inference pipeline (custom letterboxing, anchor-free grid decode, and NMS — not a wrapped `.detect()` call). See `lib/vision-engine.ts`'s header for the full pipeline and a real preprocessing bug the switch caught (BGR vs RGB channel order).
  * Runs inference on the browser's WASM backend (no WebGL/WebGPU dependency).
  * Computes bounding box coordinates, class labels, and confidence probabilities in milliseconds.
* **Frontend Component (`components/examples/VisionDemo.tsx`):**
  * Interactive canvas with image upload and sample selection.
  * Crisp 1px vector bounding box overlays with custom styling (green for verified, amber/red for defect thresholds).
  * Monospaced telemetry bar: `FPS`, `Inference Latency (ms)`, `Detected Objects Count`.

---

## 3. Step-by-Step Implementation Roadmap

We will build and integrate each working demo one at a time:

```
[x] Phase 1: Scraping & Enrichment -> Real API Route + Scraper UI (ScraperDemo.tsx)
[x] Phase 2: Document & Receipt OCR -> Real Tesseract.js WASM Engine (OcrDemo.tsx)
[x] Phase 3: Content Automation -> Real NLP Repurposing Engine (ContentDemo.tsx)
[x] Phase 4: Data Auditing & QA -> Real CSV/Data Linter & Export (AuditDemo.tsx)
[x] Phase 5: Backend Integrations -> Real Webhook & Transformer Engine (IntegrationDemo.tsx)
[x] Phase 6: Computer Vision -> Real Client-Side Vision Engine (VisionDemo.tsx)
```

---

## 4. Next Step

We start with **Phase 1: Real Scraping & Enrichment Engine**:
1. Create `app/api/examples/scrape/route.ts` (real edge/node scraper endpoint).
2. Create `components/examples/ScraperDemo.tsx` (interactive input + live data renderer).
3. Connect into `components/home/ExamplesSection.tsx` and verify live functionality.
