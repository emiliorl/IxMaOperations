# Current Stage Tracker: Stage 7 (v3 — Content & Package Definition)

> **Active Document:** `CURRENT_STAGE.md`
> **Target Branch:** `dev`
> **Status:** 🟡 In Progress — v3 Direction Locked, No Public Pricing Anywhere

---

## 🔄 What This Site Actually Is (read this first)

This is **not** a portfolio site — Emilio has a separate dedicated site for that. IxMaOperations exists to get contract work, two ways:

1. **Individuals & small teams** — browse 6 pre-scoped, fixed-turnaround packages. No price is shown; a "Request This" button submits a brief and Emilio replies with price + timeline.
2. **Businesses** — no public pricing; submit a brief describing the project, then book a call (Calendly) to settle a price + timeline.

Both paths share the same request flow underneath — the difference is scope (pick a defined package vs. describe an open-ended need), not self-serve checkout vs. consultation. **No price is shown publicly anywhere on the site** (locked Aug 27, 2026).

A shallow skills/capabilities strip supports both paths but is intentionally light — deep case studies belong on the portfolio site, not here. Any "sandbox" or interactive-looking element on this site is a **placeholder only**: Emilio is building the real working projects himself; this codebase should never fake a working backend for them.

This is **v3** of the plan. v1 (dual-funnel Enterprise/Solopreneur, fully built) and v2 (single-funnel minimalist, built through Stage 9 — homepage, nav, examples gallery, 5-offer content model — then superseded before Stage 10) are both retired — see `PROJECT_BLUEPRINT.md` Section 0 for why each one missed the mark and what v2 code still needs cleanup in Stage 12.

---

## 🎯 Current Focus: Stage 7 — Content & Package Definition

- [x] The 6 starter packages are defined with names, descriptions, internal reference turnaround times (`PROJECT_BLUEPRINT.md` Section 2). Prices are internal-only — they are never rendered on the site.
- [x] ~~Confirm/adjust the 6 package prices before Stripe products get created~~ — moot, no Stripe products.
- [x] Custom Projects brief form fields defined: problem description, timeline, optional budget range, optional "which package?" selector. Public pricing anchor decision **resolved: none, anywhere.**
- [x] `lib/capabilities.ts` written — shallow copy, 6 entries, 1:1 with the 6 packages.
- [x] Calendly link confirmed. Portfolio site URL still pending.

### Still Needed Before the Rest Can Finish
- [ ] Portfolio site URL (for capability placeholders to link out to) — pending. `lib/capabilities.ts`'s `portfolioUrl` field is left `undefined` until then; `CapabilityStrip.tsx` (Stage 9) must render cards without a broken/placeholder link in the meantime.

### Resolved (Aug 27, 2026)
- Calendly booking link: `https://calendly.com/emilio-a-ramirezl`.
- No public pricing anywhere, for either path — Packages lost their direct-Stripe-checkout model and now route into the same request flow as Custom Projects.
- All 6 packages get a capability card, 1:1 (`lib/capabilities.ts`).

Stage 7 is now effectively done except for the pending portfolio URL, which doesn't block starting Stage 8/9/10.
