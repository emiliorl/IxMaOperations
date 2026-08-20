# IxMaOperations — Dual-Funnel AI Engineering & Micro-SaaS Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Branch](https://img.shields.io/badge/Active%20Branch-dev-emerald)](https://github.com/)

> **High-Ticket Enterprise AI Engineering ($5k–$25k+) + Zero-Touch Solopreneur Micro-Sprints ($499–$1,499)**  
> Built with Next.js App Router, Tailwind CSS, Zustand, Radix UI, AES-256 Vault Encryption, and Stripe.

---

## 🎯 Main Goal of the Project

**IxMaOperations** is engineered to bridge the gap between high-ticket custom enterprise AI deployments (industrial computer vision, edge TensorRT, multi-agent RAG, PLC/SCADA pipelines) and fast-turnaround productized micro-sprints for creators and solopreneurs.

It provides:
1. **Enterprise Track (`/` & `/enterprise`):** High-ticket authority, technical architecture breakdowns, interactive engineering sandboxes, and feasibility booking mechanics.
2. **Solopreneur Track (`/tools`):** Fixed-scope 48-hour delivery micro-sprints ($499, $750, $1,200), direct Stripe checkout, and zero-touch async onboarding.
3. **Interactive Portfolio Sandboxes:** Live ALPR & container OCR, manufacturing defect QA heatmaps, invoice/document parsing, and real-time Playwright terminal streaming.
4. **Asynchronous Onboarding Engine:** Loom workflow submission, AES-256 encrypted API key vault, and automated client portal.

---

## 📖 Detailed Blueprint & Stage Roadmap

For the complete technical blueprint, component breakdown, and architecture specifications, please refer to:
👉 **[`PROJECT_BLUEPRINT.md`](./PROJECT_BLUEPRINT.md)**

---

## 🚀 Quickstart Guide

### 1. Active Branch
All active feature development happens on the **`dev`** branch:
```bash
git checkout dev
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the Enterprise track, or [http://localhost:3000/tools](http://localhost:3000/tools) for the Solopreneur track.

---

## 📊 Development Stages & Milestones

| Stage | Focus Area | Status | Key Deliverables |
|---|---|---|---|
| **Stage 1** | **Core Setup & Shared Libs** | ✅ Complete | TypeScript schemas, `crypto.ts` (AES-256), `store.ts` (Zustand), UI primitives |
| **Stage 2** | **Interactive Sandboxes Engine** | ✅ Complete | ALPR OCR, Defect QA Heatmaps, Document Vision, Live SSE Scraper Terminal |
| **Stage 3** | **Enterprise B2B Funnel** | ✅ Complete | Enterprise layout, Hero, ROI stats, Architecture diagram, Feasibility modal |
| **Stage 4** | **Solopreneur Micro-Sprints** | ✅ Complete | Product catalog, dynamic landing pages (`/tools/[slug]`), Stripe checkout |
| **Stage 5** | **Async Onboarding & Vault** | ✅ Complete | Loom intake, client-side AES-256 API vault, client portal dashboard |
| **Stage 6** | **Security Audit & Production** | 🔄 In Progress | Cryptographic validation, cross-browser responsiveness, Vercel deployment |

---

## 🛡️ Security & Zero-Trust Key Policy

- Client API keys entered into the Onboarding Vault are encrypted using **AES-256-GCM** on the client before network transmission.
- Plaintext API tokens are never saved to unencrypted storage or printed in console logs.

---

*For contributions, always create feature branches off `dev` (e.g. `feat/sandbox-enhancement` or `fix/stripe-webhook`).*
