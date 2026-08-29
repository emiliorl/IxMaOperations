# IxMaOperations — Contract Work Site (Packages + Custom Projects)

> **Developer & Architecture Blueprint — v3 (Final Direction)**
> *Target Branch:* `dev` | *Primary Tech Stack:* Next.js 15 (React 19) / TypeScript / Tailwind CSS / Stripe

---

## 0. Version History (why this doc keeps changing)

- **v1 (Legacy, Stages 1-6, built):** Dual-funnel "Enterprise vs. Solopreneur" platform — Stripe checkout, AES-256 credential vault, 4 industrial CV sandboxes, client portal. Fully built but didn't match the actual offer — industrial/enterprise framing, fabricated case studies, a vault nobody needed.
- **v2 (built through Stage 9, then superseded):** Single-funnel minimalist site — 5 "solo operator pain point" service offers, no pricing shown, contact form + Calendly only. `lib/services.ts`, the site shell (`Header`/`Footer`), and the homepage + examples gallery were fully built and committed (Stages 7-9) before this pivot — Stage 10 (service detail pages + 2 recopied live demos) was next when the direction changed. Corrected the fake-industrial framing, but overcorrected: dropped Stripe and fixed pricing entirely, and assumed the site was a general portfolio when it isn't. Its code needs to be reworked or removed in Stage 12, not skipped as unbuilt scaffolding.
- **v3 (this version, current direction):** This site is **not** a portfolio — Emilio has a separate dedicated portfolio site for that. This site exists purely to **get contract work**, two ways:
  1. **Individuals & small teams** who have an idea and need it built — browse fixed-price packages, pay directly via Stripe.
  2. **Businesses** — larger custom-scoped work, no public pricing, submit a brief and book a call for a quote.

  A light skills/capabilities section supports both paths but stays shallow on purpose — deep case studies and full project write-ups belong on the portfolio site, not here. Interactive "sandbox" elements are **placeholders only**: Emilio is building the real projects himself; this codebase should not simulate working backends for them.
- **v4 (pivot, Aug 29, 2026 — current direction):** Emilio flagged that the v3 storefront still felt disconnected from the actual goal: onboard a possible client through a short questionnaire that gives Emilio context and gets a meeting on the calendar, with proof-of-skill (animations/graphs, added over time) shown on the same page — not a catalog to shop. Changes from v3:
  1. **One unified flow replaces the two-path hero.** The homepage no longer splits visitors into "Individuals/Small Teams → /packages" vs. "Businesses → /custom-projects" as the first decision. The Project Estimator Wizard (built Stage 14, previously framed as a "not sure?" fallback under the two-path hero) is now the primary, only front-door CTA — "Tell Me What You Need" scrolls to it. `/packages` and `/custom-projects` still exist and still work exactly as before (Stage 10/11 untouched), just demoted from top-level hero choices to a secondary reference path (nav link + footer link) for someone who already knows what they want.
  2. **Examples now live on this site, not just linked out.** `CapabilityStrip.tsx` (shallow cards linking to a pending external portfolio URL) is replaced by `components/home/ExamplesSection.tsx` ("See It In Action") — same six capability entries from `lib/capabilities.ts`, but each card now carries a real animation/graph slot instead of a portfolio hand-off link. Emilio hasn't dropped the real media in yet, so each slot renders a labeled "coming soon" placeholder, not a working demo (Section 8 Rule 2 still applies — no faked backends). This supersedes Section 4's "not a portfolio, links out" framing below.
  3. **No pricing/Stripe/request-flow changes.** Sections 2, 3, 5, 6 (packages, custom projects, stack, request flow) are unchanged — the pivot is about what leads the homepage and where examples live, not the underlying commerce model.

---

## 1. Project Mission & Executive Goal

**IxMaOperations** is Emilio's contract-work storefront: individuals and small teams get a catalog of fixed-price, fixed-turnaround automation packages they can buy directly; businesses get a path to describe a custom project and book a call for a quote. One site, two clearly separated paths, no portfolio duplication.

```
                         [ IxMaOperations ]
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                     ▼
   [ Individuals / Small Teams ]           [ Businesses ]
   Route: /packages                        Route: /custom-projects
   ─────────────────────────────           ─────────────────────────────
   Pre-scoped, fixed-turnaround offers     Open-ended, custom-scoped work
   Primary CTA: Request This → brief form  Primary CTA: Submit a brief → Book a call
   No price shown — priced after reply     Quote given after a call
```

> **No public pricing anywhere (locked Aug 27, 2026).** Neither path shows a price. Packages show name, description, and turnaround only; "Request This" routes into the same brief-form/email flow Custom Projects uses (optionally pre-tagged with which package). This replaces the original "direct Stripe checkout, no consultation" plan for Packages — see Section 7 item 3 (resolved) and Section 5 for what that means for the Stripe line in the stack.

---

## 2. The 6 Starter Packages (Individuals / Small Teams)

**No price is shown publicly for any package** (locked Aug 27, 2026) — the table below is Emilio's internal reference for what to quote once someone requests one, not catalog copy. Public package cards show only name, description, and turnaround. Every package routes to the same "Request This" → brief form → Emilio replies with price + timeline flow as Custom Projects, rather than self-serve checkout.

Internal reference prices are starting points — informed by general freelance/agency market rates for this kind of work, not a guarantee of what any client will pay. Adjust after the first few real projects.

| # | Package | Internal Ref. Price (not shown publicly) | Turnaround | What It Is |
|---|---|---|---|---|
| 1 | **Custom Lead Scraper + Enrichment List** | $549 | 3–5 days | Scrape a defined source, enrich records, hand back a clean list |
| 2 | **Receipt/Invoice OCR Pipeline Setup** | $599 | 3–5 days | Upload receipts/invoices → structured, exportable data |
| 3 | **Content Repurposing Automation** | $499 | 2–4 days | One video/transcript → multi-platform post drafts |
| 4 | **Small-Scope Data QA/Audit Script** | $749 | 4–6 days | Rule + LLM-based checking of a defined dataset, with a measurable accuracy score |
| 5 | **Custom API/Workflow Integration** | $649 | 3–6 days | Connect 2+ tools/systems with a custom automation script |
| 6 | **Custom-Trained Vision Model (small scope)** | Starting around $1,200 | Varies | Bespoke computer-vision model when off-the-shelf OCR/CV isn't accurate enough |

Anything bigger or not covered by these six also routes to the same "Request This" flow — package #6 isn't structurally different from the other five anymore now that none of them show a price or checkout.

---

## 3. Businesses Path — Custom Projects

No public pricing. Flow: short brief form (what they're trying to solve, timeline, optional budget range, and — shared with the Packages path, see Section 2 — an optional "which package (if any)?" selector) → submission emailed to Emilio via Resend → Calendly booking link (https://calendly.com/emilio-a-ramirezl) to get on a call and settle a price + timeline.

**Internal quoting anchor (Emilio's reference only, never shown publicly):** ~$75–$120/hr equivalent, or a stated project minimum around $2,000+. **Resolved Aug 27, 2026:** no pricing anchor is shown on `/custom-projects` or anywhere else on the site — visitors reach out first, price and timeline are discussed by email/call. This decision now applies to Packages too (Section 2), not just Custom Projects.

---

## 4. Examples in Action Section (Shared, v4)

**Superseded Aug 29, 2026 (Section 0 v4):** this section used to describe a shallow strip that linked out to a separate portfolio site. It now describes `components/home/ExamplesSection.tsx` — a homepage section showing the skill areas behind the packages (multi-agent LLM systems, computer vision/OCR, data auditing, backend integrations) with a real animation/graph slot per capability, demonstrated directly on this site:

- **Placeholder media, not a placeholder site.** No live backend, no simulated data, no `/api/sandbox/*` routes — each card's media slot renders a clearly labeled "coming soon" placeholder until Emilio drops the real animation/graph in. The distinction that still matters (Section 8 Rule 2): the placeholder must stay honest about being one, never fake a working demo.
- Emilio is building the real, working versions of these himself; this codebase's job is to leave clean, obviously-labeled slots for him to drop the actual media into later.

---

## 5. Technical Stack & Architecture (v3)

| Layer | Technologies | Purpose | Note |
|---|---|---|---|
| **Framework** | Next.js 15 / React 19 (App Router) | Pages, route handlers | Unchanged |
| **Language** | TypeScript v5+ | Type safety | Unchanged |
| **Styling** | Tailwind CSS + CSS Variables | Sober, minimal design system | Unchanged (`STANDARDS.md`) |
| **Payments** | *(none wired into the site for now)* | — | **Deferred, not v3-in-progress.** Packages no longer have self-serve checkout (Section 2) — every path is request-first. When a price is agreed after a reply/call, Emilio sends payment via a manual Stripe Payment Link or invoice outside this codebase. Revisit real Stripe Checkout integration only if/when self-serve buying comes back as a deliberate decision. |
| **Forms & Validation** | React Hook Form + Zod | Package request form + Custom Projects brief form (shared component, Section 6) | Unchanged |
| **Scheduling** | Calendly embed | Book-a-call on `/custom-projects` | Confirmed — `https://calendly.com/emilio-a-ramirezl` |
| **Email** | Resend via `/api/request` | Package + custom-project request submissions to `OWNER_EMAIL` (shared route, Section 6) | Built Aug 28, 2026 — `from` still Resend's shared sandbox sender (`onboarding@resend.dev`); swap to a verified domain before relying on it for real requests |
| **State** | React local state | No sandbox global state needed (placeholders are static) | Zustand still not needed |
| **Credential Handling** | *(none)* | — | AES-256 vault stays removed — no client credentials collected |
| **Database** | *(none required for v1)* | — | Stripe's own dashboard tracks orders; revisit only if order volume needs a real backend |

---

## 6. Directory & File Blueprint (v3)

```
IxMaOperations/
├── app/
│   ├── page.tsx                          # Home: hero w/ two entry paths, capability strip
│   ├── packages/
│   │   ├── page.tsx                      # Catalog: 6 pre-scoped packages, no price shown
│   │   └── [slug]/page.tsx               # Package detail (what's included, turnaround) + "Request This" CTA
│   ├── custom-projects/page.tsx          # Shared request path: brief form (works for both a picked package and an open-ended brief) + Calendly embed
│   ├── contact/page.tsx                  # General fallback contact (doesn't fit the two paths above)
│   ├── api/
│   │   └── request/route.ts              # Emails the brief (package request or custom project) to Emilio via Resend
│   ├── layout.tsx                        # Root layout — single nav, no track switcher in the header
│   └── globals.css
├── components/
│   ├── home/
│   │   ├── Hero.tsx                      # Two-path hero (Individuals/Small Teams vs. Businesses)
│   │   └── CapabilityStrip.tsx           # Placeholder capability cards, shallow, links out to portfolio
│   ├── packages/
│   │   └── PackageCard.tsx               # Catalog grid item — name, description, turnaround, "Request This" link into /custom-projects?package=slug
│   ├── custom-projects/
│   │   ├── BriefForm.tsx                 # Problem / timeline / budget range intake + optional "which package?" selector (pre-filled via ?package= query param)
│   │   └── ScheduleEmbed.tsx             # Calendly iframe wrapper (calendly.com/emilio-a-ramirezl)
│   └── ui/                               # KEEP: Button, Card, Badge, Input, Tabs
├── lib/
│   ├── packages.ts                       # Canonical array of the 6 packages (source of truth for catalog; prices stay internal-only, not rendered)
│   ├── capabilities.ts                   # Written (Stage 7 Task 7.4) — 6 shallow capability entries, 1:1 with packages.ts slugs
│   ├── schemas.ts                        # Zod schema for the request form, shared by BriefForm.tsx (client) and api/request/route.ts (server)
│   ├── email.ts                          # Resend client for request emails
│   └── utils.ts                          # KEEP
```

### Deleted from disk (Stage 12, Aug 28, 2026 — see PLAN_PROGRESS.md Task 12.1-12.3)
- `app/(enterprise)/*`, `app/(solopreneur)/*` route groups and their dedicated `components/enterprise/`, `components/solopreneur/` directories, including the async onboarding wizard and client portal dashboard.
- `lib/crypto.ts` (AES-256 vault), `app/api/vault/*`.
- `app/api/sandbox/*`, `app/api/checkout/*`, `app/api/webhooks/*` — the latter two also dead once Stage 11 replaced them with `app/api/request/route.ts`.
- `lib/store.ts`, `lib/stripe.ts` (0 importers, orphaned), `lib/mock-data.ts`; `zustand`, `stripe`, `@stripe/stripe-js`, `@radix-ui/react-dialog` removed from `package.json`.
- `components/sandboxes/*` (`ScraperTerminalSandbox.tsx`, `InvoiceParserSandbox.tsx`, etc.) — **deleted outright, not converted to placeholder cards as originally planned.** `CapabilityStrip.tsx` (Stage 9) already satisfies the "shallow placeholder card" requirement (Section 4) more simply than converting these would have; the sandboxes themselves simulated live backends, which Section 8 Rule 2 prohibits, so converting them risked reproducing the exact anti-pattern this section bans instead of removing it.
- `components/ui/Dialog.tsx`, `Progress.tsx` — orphaned once their only consumers (above) were deleted.

---

## 7. Open Items Blocking Full Completion

1. ~~**Emilio's Calendly booking link**~~ — **Resolved Aug 27, 2026:** `https://calendly.com/emilio-a-ramirezl`.
2. **Portfolio site URL** — still pending. Needed so capability placeholder cards can link out to real project write-ups; leave the link slot clearly labeled/commented as pending until Emilio provides it.
3. ~~**Public vs. internal-only pricing anchor for Custom Projects**~~ — **Resolved Aug 27, 2026:** no price shown anywhere, for either path. Visitors submit a request; Emilio replies with price + timeline. This also settled what was an open question for Packages (Section 2), not just Custom Projects.
4. **Final review of the 6 package internal reference prices** (Section 2) — no longer blocking anything public-facing since prices aren't shown or wired to Stripe. Still worth confirming whenever, purely as Emilio's own quoting reference.
5. **Which packages get a capability placeholder card** — likely all 6, but confirm before building `CapabilityStrip.tsx`.

---

## 8. Coding Standards & Architectural Guardrails (v3)

1. **Two paths, two CTAs, clearly separated — but both request-first.** Never show a price anywhere on the site, for either path. The split between Packages and Custom Projects is about scope (pre-defined vs. open-ended), not about self-serve checkout vs. consultation — both funnel into the same brief-form/email/Calendly flow.
2. **Placeholders stay placeholders.** No component under `components/*` may fake a working backend for a capability that doesn't exist yet. Label it, link out to the portfolio site once that link exists, and stop there.
3. **No self-serve checkout without a new, deliberate decision.** Stripe is deferred (Section 5) — don't reintroduce Checkout, a client portal, a vault, or an account system on your own initiative.
4. **No portfolio duplication, even after v4.** The Examples in Action section (Section 4) shows short animations/graphs per capability directly on this site — that's a deliberate v4 change, not a scope creep license. Deep case studies, full project narratives, and resume-style write-ups still belong on Emilio's separate portfolio site, not here.
5. **Design system stays** — sober zinc palette, no neon/gradients, max 4 nav links, one header CTA (`STANDARDS.md`). The homepage hero is the one place a second CTA is allowed, since it's genuinely two different audiences choosing a path, not a pricing-tier switcher.

---

*Authored for the IxMaOperations project — Branch: `dev`. Supersedes v2 (never implemented) and the dual-funnel positioning of v1 (Section 0 has the full history).*
