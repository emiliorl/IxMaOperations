# Current Stage Tracker: Stage 10 (Repositioning — Service Detail Pages + Recopied Demos)

> **Active Document:** `CURRENT_STAGE.md`
> **Target Branch:** `dev`
> **Status:** 🟡 In Progress — v2 Repositioning

---

## 🔄 What Changed

The v1 build (dual-funnel Enterprise/Solopreneur platform, Stripe checkout, AES-256 vault, 4 industrial CV sandboxes) is **superseded**, not deleted yet — code removal happens in Stage 12 once the new pages exist to replace it. See `PROJECT_BLUEPRINT.md` Section 0 and `PLAN_PROGRESS.md` for the full rationale and stage breakdown.

**New direction:** one minimalist site built around 5 practical automation offers for solo operators/creators, each shown as a before/after example, with a single conversion path: contact form (quote request) + scheduling embed (book a call). No pricing tiers, no checkout, no credential vault.

---

## ✅ Stages 7-9 — Complete (Aug 27, 2026)

- **Stage 7 (Content & IA):** All 5 offers modeled in `lib/services.ts`. Sitemap/nav locked, CTA = "Book a Call".
- **Stage 8 (Nav & Layout):** Single `app/layout.tsx` shell, `components/layout/Header.tsx` + `Footer.tsx`, both legacy group layouts deleted.
- **Stage 9 (Homepage + Examples):** New `app/page.tsx` (Hero → ServicesGrid → ProcessSteps → CTA), `app/examples/page.tsx` using a recopied `BeforeAfterSimulator.tsx` (5 scenarios matching the 5 offers, no more v1 industrial content).

Full detail in `PLAN_PROGRESS.md`.

---

## 🎯 Current Focus: Stage 10 — Service Detail Pages + Recopied Demos

One detail page per offer, with a concrete example — 2 of the 5 get a live interactive demo.
1. `app/services/[slug]/page.tsx` — dynamic page rendering problem → solution → example → CTA from `lib/services.ts`.
2. Recopy `ScraperTerminalSandbox.tsx` for **Lead Intelligence** — same SSE terminal UI, log lines reframed as "enriching a sample lead list."
3. Recopy `InvoiceParserSandbox.tsx` for **Visual Asset Vault** — same split-pane extraction UI, framed as receipt/invoice OCR.
4. Content Engine, Client Onboarding, and Inbox Copilot ship with the static before/after already built in Stage 9's `BeforeAfterSimulator` — no live sandbox needed yet.

### Immediate Next Steps (Task 10.1–10.4 in `PLAN_PROGRESS.md`)
- [ ] Build `app/services/[slug]/page.tsx` using `getServiceBySlug()`.
- [ ] Recopy the scraper sandbox for Lead Intelligence.
- [ ] Recopy the invoice sandbox for Visual Asset Vault.
- [ ] Confirm each of the 5 service cards on the homepage links to a working detail page.

### Also Needed Before Stage 11 Can Finish
- [x] Calendly confirmed — booking link stored in `.env.local` as `NEXT_PUBLIC_CALENDLY_URL`.
- [x] Email provider — Resend confirmed, API key in `.env.local` as `RESEND_API_KEY`.
