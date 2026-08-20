---
trigger: model_decision
description: Apply this rule whenever creating, modifying, or refactoring frontend UI components, Next.js/React pages, Tailwind CSS layouts, or design system styles. Enforces clean, sober engineering aesthetics (Vercel/Linear style) and prevents AI visual clutter
---

# Frontend Engineering & Design System Standards (`STANDARDS.md`)

## 1. Design Philosophy: The Sober Engineering Aesthetic

This platform pitches high-ticket industrial vision pipelines, enterprise document intelligence, and productized automation. The design must communicate **rigor, precision, deterministic reliability, and high enterprise value.**

### The "Anti-AI Slop" Manifesto (Strict Banned Patterns)

* **NO Neon Glows & Drop Shadows:** Do not use `box-shadow: 0 0 20px cyan`, glowing borders, or blurred radial background light-blobs.
* **NO Cyan/Magenta AI Gradients:** Do not use linear gradients on hero typography (e.g., cyan-to-green or purple-to-pink gradient text). Text must be clean, crisp white (`#ffffff`) or light zinc (`#f4f4f5`).
* **NO Over-Pillification:** Do not put pill badges on every headline, navigation item, or feature list. Badges should be sparse, functional, and monospaced.
* **NO Cluttered Header Navigation:** The top navigation bar must remain minimal and uncluttered. Do not cram pricing tiers (`$5k-$25k`), micro-badges, or secondary CTAs into the main header.
* **NO Centered Wall-of-Text Blocks:** Use structured, left-aligned grid layouts.

---

## 2. Color Palette & CSS Variables

The color system relies on high-contrast neutrals, subtle hairline borders (`1px border-zinc-800`), and restrained accent cues.

```css
:root {
  /* Surface & Background */
  --bg-primary: #09090b;       /* Zinc 950 - Solid deep background */
  --bg-surface: #121215;       /* Card background */
  --bg-surface-hover: #18181b; /* Card hover state */
  
  /* Borders & Dividers */
  --border-subtle: #27272a;    /* Zinc 800 - 1px Hairline borders */
  --border-strong: #3f3f46;    /* Zinc 700 - Hover borders */
  
  /* Typography */
  --text-primary: #f4f4f5;     /* Zinc 100 - Primary Headings */
  --text-secondary: #a1a1aa;   /* Zinc 400 - Subtitles & Descriptions */
  --text-muted: #71717a;       /* Zinc 500 - Captions & Footer */
  --text-mono: #a1a1aa;        /* Monospaced technical parameters */
  
  /* Functional Accents (Restrained & Sparse) */
  --accent-primary: #ffffff;   /* Pure White for Primary CTAs */
  --accent-primary-hover: #e4e4e7;
  --status-active: #22c55e;    /* Muted Green for live system status */
  --status-active-bg: rgba(34, 197, 94, 0.1);
}
```

---

## 3. Typography Rules & Hierarchy

| Role | Font Family | Size / Line Height | Tracking | Application |
| --- | --- | --- | --- | --- |
| **Hero Title** | Inter / Geist Sans | `text-4xl sm:text-6xl` | `tracking-tight` (`-0.03em`) | Max 1 Hero title per route. Left-aligned preferred. |
| **Section Header** | Inter / Geist Sans | `text-2xl sm:text-3xl` | `tracking-tight` | Section entrances. |
| **Card Title** | Inter / Geist Sans | `text-base font-semibold` | `tracking-normal` | UI cards, feature modules. |
| **Body Text** | Inter / Geist Sans | `text-sm sm:text-base` | `leading-relaxed` | Descriptions. Max width `max-w-2xl`. |
| **Technical Data** | JetBrains Mono / Geist Mono | `text-xs font-mono` | `tracking-wider uppercase` | Latency (e.g., `14ms TensorRT`), PLC protocols, API tokens. |

---

## 4. Header & Navigation Constraints

The header in the original layout was overcrowded with badges, pricing tags, and dual CTAs. All developers must adhere to the simplified navigation structure:

```
[ LOGO ]        Enterprise    Interactive Sandboxes    Case Studies          [ Book Feasibility Call ]
```

### Navigation Rules

1. **Maximum 4 Links:** Navigation links must be plain text with subtle hover states (`text-zinc-400 hover:text-zinc-100`).
2. **NO Pricing Badges in Navigation:** Do NOT attach `($5k-$25k)` or `($499+)` tags inside header links.
3. **Dual-Track Segmented Control:** Move the Enterprise vs. Solopreneur track switcher down to a dedicated, clean segmented control block directly inside the **Hero Section** or **Pricing Section**, NOT in the top sticky navbar.
4. **Single Header CTA:** Exactly ONE high-contrast primary button (`Book Feasibility Call` on enterprise routes; `Explore Micro-Sprints` on `/tools`).

---

## 5. Component Styling Specifications

### A. Buttons & Interactive Controls

* **Primary Action Button:**
  * Background: Solid white (`bg-zinc-100 text-zinc-900`).
  * Border: None or 1px hairline (`border-zinc-200`).
  * Hover: Slightly dimmed zinc (`hover:bg-zinc-200`).
  * Shadow: Small neutral drop shadow (`shadow-sm`), NO colored neon glow.

* **Secondary Action Button:**
  * Background: Transparent or dark surface (`bg-zinc-900/60 text-zinc-300`).
  * Border: Hairline zinc (`border border-zinc-800 hover:border-zinc-700`).
  * Typography: Monospaced or clean sans with terminal icon `>_`.

### B. Cards & Feature Panels

* Background: `bg-zinc-900/40` with `backdrop-blur-md`.
* Border: `border border-zinc-800/80`.
* Radius: Moderate rounding (`rounded-lg` or `rounded-xl`). Do NOT use ultra-rounded rounded-3xl pills for rectangular structural cards.
* Hover Effect: Transition border color to `border-zinc-700` and translate Y by `-1px`. NO background glow expansion.

### C. Technical Badges & Tags

* Style: Square or slightly rounded (`rounded-md`), monospaced text (`font-mono text-[11px]`).
* Color: Dark background (`bg-zinc-900 text-zinc-400 border border-zinc-800`).
* Limit: Maximum 3 to 4 badges per card or section. Do not flood section bottoms with rows of floating pill badges.

---

## 6. Layout & Visualizer Sandbox Architecture

When displaying interactive sandboxes (ALPR, Manufacturing QA, Scraper Terminal, Document Vision):

1. **Integrated IDE / Dashboard Aesthetic:** Sandboxes must resemble production software tools (e.g., Dark-themed macOS/Linux application frame, VS Code panel, or Grafana telemetry dashboard).
2. **Terminal Windows (`xterm.js` / Scraper Logs):**
  * Header bar with window control dots (red, yellow, green) and title (e.g., `playwright_stealth_worker.py`).
  * Monospaced green/zinc log output with timestamps (`[17:22:04] [INFO] Extracted 42 SKU data points...`).
3. **Image Vision Overlays (`react-konva` / Canvas):**
  * Bounding boxes must use clean 1px solid vectors (e.g., Crisp Green `#22c55e` or Amber `#f59e0b`) with a small monospaced label tag anchored to the top-left corner of the box (`Defect: Scratch [98.4%]`).

---

## 7. Developer Prompting Rules for AI IDEs (Cursor / Antigravity)

When instructing AI code generators or refactoring components, copy and paste this system prompt constraint:

```
SYSTEM RULE FOR AI GENERATION:
You are a senior UI/UX engineer building for an enterprise B2B engineering agency.
Adhere strictly to the design rules in STANDARDS.md:

1. Do NOT use cyan gradients, neon drop-shadows, or blurred glowing background blobs.
2. Do NOT clutter the top navigation bar with price tags, badges, or dual CTAs.
3. Use a sober dark palette (Zinc 950 background, Zinc 800 hairline 1px borders, Zinc 100 primary text).
4. Use monospaced font (JetBrains Mono/Geist Mono) ONLY for technical parameters, latency metrics, and terminal logs.
5. Keep card containers structured, left-aligned, and clean with subtle hover borders (border-zinc-700).
6. Prioritize whitespace and typography precision over flashy visual effects.
```
