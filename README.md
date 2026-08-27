# IxMaOperations — Automation Services for Solo Operators & Creators

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Branch](https://img.shields.io/badge/Active%20Branch-dev-emerald)](https://github.com/)

> **Simple, minimalist site showing solo operators and creators practical examples of what automation can do for them — then making it easy to get a quote or book a call.**
> Built with Next.js App Router and Tailwind CSS.

---

## 🎯 Main Goal of the Project

**IxMaOperations** shows potential clients — solo operators, freelancers, VAs, and content creators — concrete before/after examples of the repetitive work automation can take off their plate, then gives them one clear path to reach out: a contact/quote form and a book-a-call link. No dual funnel, no self-serve checkout, no credential vault.

It provides:
1. **A homepage** stating who it's for and what the offers are, in one scroll.
2. **5 service pages**, one per offer, each with a plain-language explanation and a practical example (2 of the 5 include a live interactive demo).
3. **An examples gallery** showing before/after for each offer in one place.
4. **A contact page** with a quote request form and an embedded scheduling widget.

> ⚠️ This is a **v2 repositioning** of a prior build. The site previously ran as a dual-funnel Enterprise/Solopreneur platform with Stripe checkout and an AES-256 credential vault — that direction is being retired because it didn't match the actual offer. See `PROJECT_BLUEPRINT.md` Section 0 and `PLAN_PROGRESS.md` for the full rationale, what's being kept, and what's being removed.

---

## 📖 Detailed Blueprint & Stage Roadmap

For the complete technical blueprint, component breakdown, and architecture specifications, please refer to:
👉 **[`PROJECT_BLUEPRINT.md`](./PROJECT_BLUEPRINT.md)**

For the current stage and open questions blocking completion:
👉 **[`CURRENT_STAGE.md`](./CURRENT_STAGE.md)**

For the full stage-by-stage task checklist:
👉 **[`PLAN_PROGRESS.md`](./PLAN_PROGRESS.md)**

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
Open [http://localhost:3000](http://localhost:3000) to view the site.

---

## 📊 Development Stages & Milestones (v2)

| Stage | Focus Area | Status |
|---|---|---|
| **Legacy 1–6** | Dual-funnel platform (Stripe, vault, 4 industrial sandboxes) | ✅ Complete — superseded |
| **Stage 7** | Content & information architecture — lock down 5 offers | ✅ Complete |
| **Stage 8** | Navigation & layout simplification | 🔄 In Progress |
| **Stage 9** | Homepage + practical examples rebuild | ⬜ Not started |
| **Stage 10** | Service detail pages + recopied demos | ⬜ Not started |
| **Stage 11** | Contact form + scheduling embed | ⬜ Not started |
| **Stage 12** | Remove dead weight (Stripe, vault, dual-funnel routes) | ⬜ Not started |
| **Stage 13** | Visual simplification pass, QA & deploy | ⬜ Not started |

---

*For contributions, always create feature branches off `dev` (e.g. `feat/contact-form` or `chore/remove-vault`).*
