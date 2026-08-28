# IxMaOperations — Master Development Plan & Progress Tracker

> **Tracking File:** `PLAN_PROGRESS.md`
> **Active Branch:** `dev`
> **Last Updated:** August 27, 2026

This document tracks execution of **v3**, the final direction: a contract-work storefront with two paths — pre-scoped packages (individuals/small teams) and custom projects (businesses) — both request-first, with **no public pricing anywhere**. See `PROJECT_BLUEPRINT.md` Section 0 for the full version history — v1 (built, dual-funnel enterprise platform) and v2 (built through Stage 9, single-funnel, then superseded) are both retired.

---

## 📈 Overall Project Progress: v3 In Progress

```
Legacy Build (Stages 1-6, v1):     [██████████] 100% — Superseded
v2 (Stages 7-9 built, 10-13 not):  [███       ] ~30% — Superseded, needs rework not just deletion
v3 Stage 7  (Content & Packages):  [█████████ ] ~90% — blocked only on portfolio URL
v3 Stage 8  (Layout & Nav):        [          ] 0%
v3 Stage 9  (Homepage):            [          ] 0%
v3 Stage 10 (Packages Catalog):    [          ] 0%
v3 Stage 11 (Request Flow):        [          ] 0%
v3 Stage 12 (Cleanup):             [          ] 0%
v3 Stage 13 (QA & Deploy):         [          ] 0%
```

---

## 🗄️ Superseded Work (Reference Only)

- **v1 (Stages 1-6):** Fully built dual-funnel platform (Enterprise/Solopreneur tracks, Stripe checkout, AES-256 vault, 4 industrial CV sandboxes, client portal). Retired for not matching the actual offer.
- **v2 (built through Stage 9, then superseded):** Single-funnel minimalist site, 5 "solo operator pain point" offers, no pricing, contact + Calendly only. Stages 7-9 were actually built and committed — `lib/services.ts`, `components/layout/Header.tsx`/`Footer.tsx`, `app/page.tsx` + `components/home/*`, `app/examples/page.tsx` with a recopied `BeforeAfterSimulator.tsx`. Corrected v1's fake framing but wrongly assumed this site was a general portfolio and dropped pricing/Stripe entirely — neither matched what Emilio actually wants. This code needs to be reworked/replaced in Stage 12 (see Task 12.3a), not treated as nothing-to-clean-up.

---

## 🗺️ v3 Stage-by-Stage Breakdown

### 🟡 Stage 7: Content & Package Definition (In Progress)
**Goal:** Lock the package catalog and business-path content before any UI work.
- [x] **Task 7.1:** Define the 6 starter packages — names, descriptions, internal reference prices (not shown publicly), turnaround times. See `PROJECT_BLUEPRINT.md` Section 2.
- [x] **Task 7.2:** ~~Confirm/adjust the 6 package prices before Stripe products are created~~ — **moot:** no Stripe products are being created; prices stay internal-only. Revisit only as Emilio's own quoting reference after the first few real projects.
- [x] **Task 7.3:** ~~Decide if a public pricing anchor appears on `/custom-projects`~~ — **Resolved Aug 27, 2026: no pricing shown anywhere, for either path** (open item #3). Custom Projects brief form fields confirmed: problem description, timeline, optional budget range, plus an optional "which package (if any)?" selector shared with the Packages path.
- [x] **Task 7.4:** `lib/capabilities.ts` written — 6 capability entries, 1:1 with the 6 packages (resolves open item #5). Shallow, plain-language, no case studies. `portfolioUrl` left `undefined` per-entry with a `TODO(open item #2)` comment — `CapabilityStrip.tsx` (Stage 9) must render each card without a working link until Emilio's portfolio URL arrives.
- [x] **Task 7.5 (partial):** Emilio's Calendly link confirmed: `https://calendly.com/emilio-a-ramirezl`. Portfolio site URL still **pending** — confirmed still pending as of this update.
- **Stage 7 Verification:** `lib/packages.ts` can be written with real names/turnaround (no price field rendered anywhere), no placeholders left in the content itself. `lib/capabilities.ts` is already written and only needs `lib/packages.ts`'s slugs to line up with its `packageSlug` field once Stage 10 creates it.

---

### 🔲 Stage 8: Layout & Navigation
**Goal:** One simple site shell — no leftover dual-funnel routing.
- [ ] **Task 8.1:** Single `app/layout.tsx`. No `(enterprise)`/`(solopreneur)` route groups.
- [ ] **Task 8.2:** Header: `Packages` / `Custom Projects` / `Contact` (3 links + logo, under the 4-link max), single CTA button (`Get Started` → `/packages`).
- [ ] **Task 8.3:** Footer with contact links.
- **Stage 8 Verification:** No page references the old Enterprise/Solopreneur toggle or v2's single-funnel nav draft.

---

### 🔲 Stage 9: Homepage
**Goal:** A visitor immediately sees which of the two paths applies to them.
- [ ] **Task 9.1:** `components/home/Hero.tsx` — one-sentence positioning, two clear buttons: "I have a project to build" → `/packages`, "I'm a business with a custom need" → `/custom-projects`. This is the one place a second CTA is allowed per `STANDARDS.md`. No pricing language in the hero.
- [ ] **Task 9.2:** `components/home/CapabilityStrip.tsx` — shallow placeholder cards for the underlying skill areas (scraping, OCR, data auditing, integrations, CV). No live demos, no fake backends.
- **Stage 9 Verification:** A first-time visitor can tell within one scroll whether they should browse packages or submit a custom brief — and that either way, they'll hear back with a price rather than pay on the spot.

---

### 🔲 Stage 10: Packages Catalog
**Goal:** A catalog of the 6 packages that sells the scope/turnaround, not a price — every card routes into the shared request flow (Stage 11).
- [ ] **Task 10.1:** `lib/packages.ts` — canonical array (slug, name, description, turnaround). Internal reference prices from `PROJECT_BLUEPRINT.md` Section 2 may live in the file as a comment/internal field but must never be rendered by any component.
- [ ] **Task 10.2:** `app/packages/page.tsx` — catalog grid via `PackageCard.tsx` (name, description, turnaround, "Request This" link — no price).
- [ ] **Task 10.3:** `app/packages/[slug]/page.tsx` — detail page: what's included, turnaround, capability placeholder, "Request This Package" button linking to `/custom-projects?package=<slug>`.
- **Stage 10 Verification:** No price renders anywhere on `/packages` or any `/packages/[slug]` page; every "Request This" link correctly pre-selects its package on `/custom-projects`.

---

### 🔲 Stage 11: Request Flow (Packages + Custom Projects, shared)
**Goal:** One request pipeline serves both a picked package and an open-ended custom brief — no public pricing (resolved open item #3).
- [ ] **Task 11.1:** `app/custom-projects/page.tsx` — explains custom project work; reads a `?package=<slug>` query param (from Stage 10) to pre-select that package in the form below.
- [ ] **Task 11.2:** `components/custom-projects/BriefForm.tsx` — problem/timeline/budget-range intake, optional package selector (defaults to the picked package or "Custom / not listed"), Zod-validated.
- [ ] **Task 11.3:** `app/api/request/route.ts` — emails the brief (including selected package, if any) to Emilio via Resend. Replaces the old `checkout`/`webhooks/stripe`/`custom-project-request` routes from the v3 draft — there's no Stripe flow to wire up.
- [ ] **Task 11.4:** `components/custom-projects/ScheduleEmbed.tsx` — Calendly embed using `https://calendly.com/emilio-a-ramirezl`.
- **Stage 11 Verification:** Submitting a brief (with or without a pre-selected package) sends a real email; the Calendly widget loads and a test booking can be made.

---

### 🔲 Stage 12: Cleanup — Remove Remaining Dead Weight
**Goal:** Codebase matches the v3 site — no leftover v1/v2 remnants, no unused Stripe scaffolding.
- [ ] **Task 12.1:** Delete `app/(enterprise)/`, `app/(solopreneur)/`, `app/api/vault/`, `app/api/sandbox/*` (backend routes only — component shells are repurposed, not deleted, per Task 12.3).
- [ ] **Task 12.2:** Delete `lib/crypto.ts`, `lib/store.ts` (Zustand); remove `zustand` from `package.json`.
- [ ] **Task 12.3:** Convert `ScraperTerminalSandbox.tsx`, `InvoiceParserSandbox.tsx`, `AlprOcrSandbox.tsx`, `DefectQcSandbox.tsx` into static placeholder cards under a new `components/capabilities/` (or trim to whichever subset maps to the 6 packages, per Task 7.4/open item #5) — strip the fake API-driven logic, keep the visual shell only where it's still useful.
- [ ] **Task 12.3a (v2 cleanup):** `app/page.tsx`, `components/layout/Header.tsx`/`Footer.tsx`, and `components/home/Hero.tsx` get overwritten directly by v3 Stage 8/9 work, not deleted separately. But `lib/services.ts`, `app/examples/page.tsx`, `components/home/ServicesGrid.tsx`, `components/home/ProcessSteps.tsx`, and `components/sandboxes/BeforeAfterSimulator.tsx` have no v3 equivalent (no "examples" concept in the v3 blueprint) — delete them once nothing still imports them.
- [ ] **Task 12.4:** Update `.env.example` — `RESEND_API_KEY`, `NEXT_PUBLIC_CALENDLY_URL`. Remove `VAULT_ENCRYPTION_KEY` and any Stripe vars (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) — not part of this build.
- **Stage 12 Verification:** `npm run build` succeeds; `grep -r "vault\|AES\|zustand\|stripe" app components lib` returns nothing.

---

### 🔲 Stage 13: QA, Polish & Deploy
**Goal:** Ship it.
- [ ] **Task 13.1:** `STANDARDS.md` audit — sober minimalist palette, two-path hero is the one sanctioned exception to "one CTA," no pricing anywhere.
- [ ] **Task 13.2:** Full request-flow walkthrough: a package's "Request This" → pre-filled brief form → submission email → Calendly booking, and the same for an open-ended custom brief with no package selected.
- [ ] **Task 13.3:** Responsive/cross-browser + accessibility pass.
- [ ] **Task 13.4:** Deploy to Vercel.
- **Stage 13 Verification:** A first-time visitor can go from homepage to a submitted request (package or custom) and a booked call, without ever seeing a price, and without confusion.

---

## 🧭 Open Questions Blocking Full Completion

1. ~~**Emilio's Calendly booking link**~~ — **Resolved:** `https://calendly.com/emilio-a-ramirezl`.
2. **Portfolio site URL** — still pending; needed so capability placeholders can link out (Stage 9/12).
3. ~~**Public vs. internal-only pricing anchor for Custom Projects**~~ — **Resolved:** no pricing shown anywhere, for either path (now also settled for Packages).
4. **Final review of the 6 package internal reference prices** — no longer blocking (no Stripe products); confirm whenever, purely for Emilio's own quoting reference.
5. ~~**Which packages get a capability placeholder card**~~ — **Resolved:** all 6, 1:1 (`lib/capabilities.ts`, Task 7.4).
