# IxMaOperations — Contract Work Storefront

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Branch](https://img.shields.io/badge/Active%20Branch-dev-emerald)](https://github.com/)

> **Two ways to work with Emilio: pick one of six pre-scoped automation packages, or bring a custom project — either way, submit a request and get a price + timeline back.**
> Built with Next.js App Router and Tailwind CSS. No pricing is shown anywhere on the site.

---

## 🎯 Main Goal of the Project

**IxMaOperations is not a portfolio** — that lives on a separate, dedicated site. This one exists purely to get contract work, two ways:

1. **Individuals & small teams** (`/packages`) — 6 pre-scoped, fixed-turnaround automation packages (lead scraping, OCR pipelines, content repurposing, data auditing, API integrations, custom vision models). No price shown; "Request This" submits a brief and Emilio replies with price + timeline.
2. **Businesses** (`/custom-projects`) — no public pricing; submit a brief, then book a call via Calendly to settle a price + timeline.

Both paths share the same request flow underneath — the split is about scope (pick a defined package vs. describe an open-ended need), not self-serve checkout vs. consultation.

A shallow skills/capabilities strip supports both paths without duplicating the portfolio site's deep case studies. Any interactive-looking capability card on this site is a placeholder — Emilio builds and links the real working projects himself.

> ⚠️ This is **v3** of the plan. The site was previously built as a dual-funnel Enterprise/Solopreneur platform (v1, fully built, retired) and then rebuilt as a single-funnel portfolio-style site (v2, built through Stage 9 — homepage, nav, examples gallery — then retired before Stage 10). See `PROJECT_BLUEPRINT.md` Section 0 for the full history.

---

## 📖 Detailed Blueprint & Stage Roadmap

👉 **[`PROJECT_BLUEPRINT.md`](./PROJECT_BLUEPRINT.md)** — full architecture, the 6 packages (internal reference pricing only, not shown publicly), tech stack.
👉 **[`CURRENT_STAGE.md`](./CURRENT_STAGE.md)** — what's active right now and open questions.
👉 **[`PLAN_PROGRESS.md`](./PLAN_PROGRESS.md)** — full stage-by-stage task checklist.

---

## 🚀 Quickstart Guide

```bash
git checkout dev
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 📊 Development Stages & Milestones (v3)

| Stage | Focus Area | Status |
|---|---|---|
| **Legacy 1–6 (v1)** | Dual-funnel platform, Stripe, vault, 4 industrial sandboxes | ✅ Complete — superseded |
| **v2 (7–9 built, 10–13 not)** | Single-funnel minimalist site | ⛔ Superseded — Stages 7-9 built, need rework in Stage 12 |
| **v3 Stage 7** | Content & package definition | 🔄 ~90% — blocked on portfolio URL |
| **v3 Stage 8** | Layout & navigation | ✅ Complete |
| **v3 Stage 9** | Homepage (two-path hero) | ✅ Complete |
| **v3 Stage 10** | Packages catalog (no pricing) | ✅ Complete |
| **v3 Stage 11** | Shared request flow (Packages + Custom Projects) | ✅ Complete — tested end-to-end, delivery confirmed |
| **v3 Stage 12** | Cleanup — remove remaining dead weight | ✅ Complete — all v1/v2 code deleted from disk |
| **v3 Stage 13** | QA, polish & deploy | 🔄 In Progress |

---

*For contributions, always create feature branches off `dev` (e.g. `feat/packages-catalog` or `feat/custom-projects-form`).*
