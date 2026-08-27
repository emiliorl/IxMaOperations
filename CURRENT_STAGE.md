# Current Stage Tracker: Stage 8 (Repositioning — Nav & Layout Simplification)

> **Active Document:** `CURRENT_STAGE.md`
> **Target Branch:** `dev`
> **Status:** 🟡 In Progress — v2 Repositioning

---

## 🔄 What Changed

The v1 build (dual-funnel Enterprise/Solopreneur platform, Stripe checkout, AES-256 vault, 4 industrial CV sandboxes) is **superseded**, not deleted yet — code removal happens in Stage 12 once the new pages exist to replace it. See `PROJECT_BLUEPRINT.md` Section 0 and `PLAN_PROGRESS.md` for the full rationale and stage breakdown.

**New direction:** one minimalist site built around 5 practical automation offers for solo operators/creators, each shown as a before/after example, with a single conversion path: contact form (quote request) + scheduling embed (book a call). No pricing tiers, no checkout, no credential vault.

---

## ✅ Stage 7 — Content & Information Architecture (Complete, Aug 27, 2026)

All 5 offers confirmed and modeled in `lib/services.ts` (`ServiceOffer[]`, plus `getServiceBySlug()`). Copy is plain-language, no industrial jargon. Sitemap and nav locked: `/`, `/services/[slug]`, `/examples`, `/contact` — nav = Home / Services / Examples / Contact, single site-wide CTA = **"Book a Call"** (routes to `/contact`). Full detail in `PLAN_PROGRESS.md` Stage 7.

---

## 🎯 Current Focus: Stage 8 — Navigation & Layout Simplification

Collapse the dual-funnel header/layout into one simple site shell:
1. Replace `app/(enterprise)/layout.tsx` and `app/(solopreneur)/layout.tsx` with a single `app/layout.tsx` — one header, one footer, no track switcher.
2. Header: logo, 4 nav links (Home / Services / Examples / Contact), one primary CTA button — **"Book a Call"** (confirmed default, per Stage 7).
3. Footer: contact links + a repeated link to `/contact`.

### Immediate Next Steps (Task 8.1–8.3 in `PLAN_PROGRESS.md`)
- [ ] Build `app/layout.tsx` as the single root shell.
- [ ] Build the header component (logo, 4 links, "Book a Call" CTA).
- [ ] Build the footer component.
- [ ] Remove references to the old Enterprise/Solopreneur toggle from any page still using it.

### Also Needed Before Stage 11 Can Finish
- [x] Calendly confirmed — booking link stored in `.env.local` as `NEXT_PUBLIC_CALENDLY_URL`, ready for `ScheduleEmbed.tsx`.
- [x] Email provider — Resend confirmed, account created, API key in `.env.local` as `RESEND_API_KEY` (never committed or pasted into chat/docs).
