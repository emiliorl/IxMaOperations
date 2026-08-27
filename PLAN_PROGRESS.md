# IxMaOperations — Master Development Plan & Progress Tracker

> **Tracking File:** `PLAN_PROGRESS.md`
> **Active Branch:** `dev`
> **Last Updated:** August 27, 2026

This document tracks execution of the **v2 repositioning**: from the dual-funnel enterprise platform to a single, minimalist services site built around 5 practical automation offers, a contact/quote form, and a scheduling link.

---

## 📈 Overall Project Progress: Repositioning In Progress

```
Legacy Build (Stages 1-6):        [██████████] 100% — Superseded, see note below
Stage 7  (Content & IA):          [██████████] 100%
Stage 8  (Nav & Layout):          [██████████] 100%
Stage 9  (Homepage + Examples):   [██████████] 100%
Stage 10 (Service Detail Pages):  [          ] 0%
Stage 11 (Contact + Scheduling):  [          ] 0%
Stage 12 (Remove Dead Weight):    [          ] 0%
Stage 13 (Polish, QA, Deploy):    [          ] 0%
```

---

## ⚠️ Why This Pivot

The v1 build shipped a fully working dual-funnel platform (Enterprise B2B track + Solopreneur micro-sprint track, Stripe checkout, AES-256 credential vault, 4 industrial CV sandboxes, async client portal). Functionally complete, but it doesn't match what's actually being sold: **done-for-you automation for solo operators and creators**, positioned simply, with a contact-and-book-a-call path rather than a self-serve checkout. The site felt disconnected from the actual offer and from how clients want to reach out. See `PROJECT_BLUEPRINT.md` Section 0 for the full rationale and what's being kept vs. retired.

---

## 🗄️ Legacy Build: Stages 1–6 (Superseded, Reference Only)

All 6 original stages were completed and verified (dual-funnel routing, 4 interactive sandboxes, Stripe checkout, AES-256 vault, async onboarding, client portal). This work is not being thrown away wholesale — two of the four sandboxes and the before/after simulator carry forward into v2 (recopied, not rebuilt). Everything else in this section is being retired per Section 3 of `PROJECT_BLUEPRINT.md`.

Full original breakdown preserved in git history / previous version of this file if needed for reference.

---

## 🗺️ v2 Stage-by-Stage Breakdown

### ✅ Stage 7: Content & Information Architecture — Complete (Aug 27, 2026)
**Goal:** Lock down the 5 service offers as a canonical content model before touching any UI.
- [x] **Task 7.1:** Get pain point 4's full value-offer text and all of pain point 5 from Emilio — confirmed Aug 27, 2026. Offer #4 tagline drafted and approved; Offer #5 ("AI Inbox Copilot") drafted fresh and approved since it wasn't in the original source notes at all. Full text in `PROJECT_BLUEPRINT.md` Section 1.
- [x] **Task 7.2:** Wrote `lib/services.ts` — array of all 5 offers (`ServiceOffer` type), each with slug, name, one-line pitch, `painPoint` (description + hours/week), `howItWorks` (plain-English steps), and an `example` (live-demo or static, matching the 2 offers that get a recopied sandbox in Stage 10). Includes `getServiceBySlug()` helper for the Stage 10 detail pages.
- [x] **Task 7.3:** Copy rewritten in plain, client-facing language directly in `lib/services.ts` — no TensorRT/LayoutLM/PLC/OPC-UA or other industrial-B2B jargon; verified by inspection.
- [x] **Task 7.4:** Sitemap confirmed: `/`, `/services/[slug]` (5 pages), `/examples`, `/contact`. Nav = Home / Services / Examples / Contact (4 links, per `STANDARDS.md`). Site-wide default CTA confirmed as **"Book a Call"** (Aug 27, 2026) — routes to `/contact`.
- **Stage 7 Verification:** ✅ Every offer in `lib/services.ts` has real, plain-language copy — no lorem ipsum, no placeholders. All 5 offers confirmed, none hidden.

---

### ✅ Stage 8: Navigation & Layout Simplification — Complete (Aug 27, 2026)
**Goal:** Collapse the dual-funnel header/layout into one simple site shell.
- [x] **Task 8.1:** Deleted `app/(enterprise)/layout.tsx` and `app/(solopreneur)/layout.tsx`. `app/layout.tsx` is now the single root shell — imports `Header`/`Footer`, wraps `{children}` in `<main className="flex-1">`, and carries new v2 metadata (title/description/keywords rewritten, no more TensorRT/YOLOv8 keyword list).
- [x] **Task 8.2:** New `components/layout/Header.tsx` — logo (links to `/`), nav = Services (`/#services`) / Examples (`/examples`) / Contact (`/contact`) (3 links, matches the exact mockup in `STANDARDS.md` Section 4 — logo doubles as Home), one primary CTA — **"Book a Call"**, routing to `/contact` everywhere via `buttonVariants` (added an export to `Button.tsx` so the CTA renders as a real `<Link>` styled like a button, avoiding an invalid nested `<a>`/`<button>`).
- [x] **Task 8.3:** New `components/layout/Footer.tsx` — brand blurb, Services/Examples links, and two `/contact` links ("Get a Quote" and "Book a Call") so there's always a second way to reach it besides the header CTA.
- **Stage 8 Verification:** ✅ No page references the old Enterprise/Solopreneur toggle — both group layouts (the only place the switcher link lived) are deleted; confirmed via repo-wide grep. `tsc --noEmit` shows zero new errors (the 11 remaining are pre-existing legacy issues in v1 code slated for Stage 12 removal — missing `stripe` package, a stale `Badge` `"cyan"` variant, `lib/crypto.ts` buffer typing — none touched by this stage).

> Note: `app/(enterprise)/page.tsx` and the other legacy route-group pages still render under the new shell as-is (old copy, old components) since they no longer have their own layout — that's expected; Stage 9/10 replace their content and Stage 12 deletes the route groups outright.

---

### ✅ Stage 9: Homepage + Practical Examples Rebuild — Complete (Aug 27, 2026)
**Goal:** One clear homepage that shows what you do and who it's for within one scroll.
- [x] **Task 9.1:** `components/home/Hero.tsx` — repurposed from `enterprise/HeroSection.tsx`; drops the enterprise/sprints track switcher entirely, one sentence on who it's for + what it does, single "Book a Call" CTA plus a secondary link to `/examples`.
- [x] **Task 9.2:** `components/home/ServicesGrid.tsx` — repurposed from `enterprise/ServicesMatrix.tsx` into a 5-card grid pulling live from `lib/services.ts` (name, pitch, hours/week, grind description, link to `/services/[slug]`) instead of a hardcoded list.
- [x] **Task 9.3:** `components/home/ProcessSteps.tsx` — new 3-step strip: Discover → Build → Deliver.
- [x] **Task 9.4:** `app/examples/page.tsx` — gallery view using `components/sandboxes/BeforeAfterSimulator.tsx`. **Correction to the original plan:** the file's `SCENARIOS` data was still 100% v1 industrial-B2B content (document/PLC/SAML/Okta scenarios) — not actually reusable "as-is" without violating the no-jargon standard. Recopied it instead: kept the exact tabs + simulate mechanic, replaced all 6 old scenarios with 5 new ones matching `lib/services.ts` slugs 1:1, and dropped its Zustand/`FeasibilityModal` dependency in favor of a plain `/contact` link.
- `app/page.tsx` (new) assembles Hero → ServicesGrid → ProcessSteps → closing CTA, replacing `app/(enterprise)/page.tsx` as the homepage (that file is deleted — it would otherwise collide with the new `/` route; the rest of the legacy `(enterprise)`/`(solopreneur)` route groups are untouched and still reachable at their own paths until Stage 12).
- **Stage 9 Verification:** ✅ Homepage loads with no dual-funnel remnants — no track switcher, no Zustand-driven feasibility modal on the new pages. `tsc --noEmit` shows zero new errors (same 11 pre-existing legacy errors as Stage 8, none in any Stage 9 file).

---

### 🔲 Stage 10: Service Detail Pages + Recopied Demos
**Goal:** One detail page per offer with a concrete, interactive-feeling example.
- [ ] **Task 10.1:** `app/services/[slug]/page.tsx` — dynamic page rendering problem → solution → example → CTA from `lib/services.ts`.
- [ ] **Task 10.2:** Recopy `ScraperTerminalSandbox.tsx` for the **Lead Intelligence** offer — same SSE terminal UI, log lines rewritten from generic scraping to "enriching a sample lead list" framing.
- [ ] **Task 10.3:** Recopy `InvoiceParserSandbox.tsx` for the **Visual Asset Vault** offer — same split-pane extraction UI, framed as receipt/invoice OCR rather than enterprise document intelligence.
- [ ] **Task 10.4:** Content Engine and Onboarding Automation offers ship with static before/after examples (no live sandbox needed yet) — flag as a possible Stage 14 enhancement if Emilio wants live demos for those too.
- **Stage 10 Verification:** Every one of the 5 service cards links to a working detail page; the 2 recopied demos run without referencing industrial/manufacturing use cases.

---

### 🔲 Stage 11: Contact Form + Scheduling
**Goal:** Make it trivial for a visitor to request a quote or book a call.
- [ ] **Task 11.1:** `components/contact/ContactForm.tsx` — name, email, which offer they're interested in (dropdown from `lib/services.ts`), project details, budget range. Validated with Zod.
- [ ] **Task 11.2:** `app/api/contact/route.ts` — sends the submission to Emilio's email via **Resend** (account created Aug 27, 2026 — API key to be added to `.env.local` as `RESEND_API_KEY`, not committed).
- [ ] **Task 11.3:** `components/contact/ScheduleEmbed.tsx` — embed **Calendly** (confirmed Aug 27, 2026) on `/contact`. Still need Emilio's actual Calendly booking link/username to finish this task.
- [ ] **Task 11.4:** Add a secondary "Book a Call" / "Get a Quote" CTA to the homepage hero and every service detail page, all pointing to `/contact`.
- **Stage 11 Verification:** Submitting the form sends a real email; the scheduling widget loads and a test booking can be made.

---

### 🔲 Stage 12: Remove Dead Weight
**Goal:** Delete what no longer serves the new direction so the codebase matches the site.
- [ ] **Task 12.1:** Delete `app/(enterprise)/`, `app/(solopreneur)/`, `app/api/checkout/`, `app/api/webhooks/`, `app/api/vault/`, `app/api/sandbox/alpr/`, `app/api/sandbox/qc/`.
- [ ] **Task 12.2:** Delete `components/enterprise/FeasibilityModal.tsx`, `ArchitectureDiagram.tsx`, `ROIStatsGrid.tsx`, all of `components/solopreneur/`, `components/sandboxes/AlprOcrSandbox.tsx`, `DefectQcSandbox.tsx`.
- [ ] **Task 12.3:** Delete `lib/crypto.ts`, `lib/stripe.ts`, `lib/store.ts`; remove `stripe`, `@stripe/stripe-js`, and `zustand` from `package.json` (confirm nothing else still imports them first).
- [ ] **Task 12.4:** Update `.env.example` — remove `STRIPE_*` and `VAULT_ENCRYPTION_KEY`, add `RESEND_API_KEY` (or chosen email provider) and `NEXT_PUBLIC_CALENDLY_URL`.
- **Stage 12 Verification:** `npm run build` succeeds with zero references to removed modules; `grep -r "stripe\|vault\|AES" app components lib` returns nothing.

---

### 🔲 Stage 13: Visual Simplification Pass, QA & Deploy
**Goal:** Confirm the site actually reads as simple and minimalist, not just restructured.
- [ ] **Task 13.1:** Audit against `STANDARDS.md` — no neon glows, no gradient text, no pill-badge clutter, max 3-4 badges per card, generous whitespace.
- [ ] **Task 13.2:** Simplify the "IDE/dashboard" chrome on the 2 remaining sandboxes if it now reads as too industrial for a solo-creator audience (window control dots, terminal framing) — keep only if it still fits the offer.
- [ ] **Task 13.3:** Cross-browser/responsive check (desktop, tablet, mobile).
- [ ] **Task 13.4:** Lighthouse/accessibility pass.
- [ ] **Task 13.5:** Deploy to Vercel.
- **Stage 13 Verification:** A first-time visitor on mobile can find a relevant example and reach the contact form in under 2 taps from the homepage.

---

## 🧭 Open Questions Blocking Full Completion

1. ~~Pain point 4 (full text) and pain point 5~~ — ✅ Resolved Aug 27, 2026. See `PROJECT_BLUEPRINT.md` Section 1.
2. ~~Calendly vs. Cal.com~~ — ✅ Resolved Aug 27, 2026: **Calendly**, booking link confirmed and stored in `.env.local` as `NEXT_PUBLIC_CALENDLY_URL`. Ready for `ScheduleEmbed.tsx` in Stage 11.
3. ~~Email delivery provider~~ — ✅ Resolved Aug 27, 2026: **Resend** (account created). API key goes in `.env.local` as `RESEND_API_KEY` — never commit it or paste it into chat/docs.
4. **Whether to keep a computer-vision offer at all** — `AlprOcrSandbox`/`DefectQcSandbox` are being retired as industrial-only; confirm there's no creator/e-commerce CV offer (e.g., product photo cleanup) that should keep one of them alive instead.
