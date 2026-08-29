# Current Stage Tracker: Stage 13 (v3 — QA, Polish & Deploy)

> **Active Document:** `CURRENT_STAGE.md`
> **Target Branch:** `dev`
> **Status:** 🟡 In Progress — Stages 7-12 complete (Aug 28, 2026), Stage 13 not started

---

## 🔄 What This Site Actually Is (read this first)

> **v4 pivot (Aug 29, 2026):** The homepage no longer leads with the two-path split described below — it leads with one onboarding questionnaire (already built as `ProjectEstimatorWizard`, now the primary CTA) plus a new "See It In Action" examples section (`components/home/ExamplesSection.tsx`) showing skill demos directly on this site. `/packages` and `/custom-projects` are unchanged underneath and still both work — they're just no longer the homepage's first decision. Full rationale: `PROJECT_BLUEPRINT.md` Section 0 v4. The two-path description just below is the pre-pivot (v3) framing, kept for stage-history context.
>
> **i18n (Aug 29, 2026):** The site is now bilingual (English + Spanish) via `next-intl`, with every route moved under `app/[locale]/` and locale-prefixed URLs (`/es/...`; English keeps its existing unprefixed paths). All visitor-facing copy lives in `messages/en.json`/`messages/es.json`. See `PROJECT_BLUEPRINT.md` Section 0's i18n entry for the full rundown, and `lib/schemas.ts`'s file header for why the request email to Emilio stays English-only regardless of the visitor's locale.

IxMaOperations exists to get contract work, two ways:

1. **Individuals & small teams** — browse 6 pre-scoped, fixed-turnaround packages. No price is shown; a "Request This" button submits a brief and Emilio replies with price + timeline.
2. **Businesses** — no public pricing; submit a brief describing the project, then book a call (Calendly) to settle a price + timeline.

Both paths share the same request flow underneath (`app/api/request/route.ts`) — the difference is scope (pick a defined package vs. describe an open-ended need), not self-serve checkout vs. consultation. **No price is shown publicly anywhere on the site**, verified end-to-end.

This is **v3** of the plan. v1 (dual-funnel Enterprise/Solopreneur) and v2 (single-funnel minimalist, built through Stage 9) are both retired **and deleted from disk** as of Stage 12 (Aug 28, 2026) — only findable in git history now. See `PROJECT_BLUEPRINT.md` Section 0/6.

---

## ✅ Stages 7–12 — Complete (Aug 28, 2026)

- **Stage 7 (Content):** `lib/packages.ts`, `lib/capabilities.ts` written. Blocked only on the pending portfolio URL (doesn't block anything else).
- **Stage 8 (Layout & Nav):** `Header.tsx`/`Footer.tsx` — Packages / Custom Projects / Contact, single `Get Started` CTA.
- **Stage 9 (Homepage):** Two-path `Hero.tsx` + `CapabilityStrip.tsx`.
- **Stage 10 (Packages Catalog):** `/packages` + `/packages/[slug]`, no price rendered anywhere.
- **Stage 11 (Request Flow):** `/custom-projects` (shared by both paths via `?package=`) → `app/api/request/route.ts` → Resend → `OWNER_EMAIL`. **Tested end-to-end with a real submission — Emilio confirmed inbox delivery by screenshot.**
- **Stage 12 (Cleanup):** All of v1 and the v2-only files deleted from disk — `app/(enterprise)/`, `app/(solopreneur)/`, `app/api/vault/`, `app/api/sandbox/*`, `app/api/checkout/`, `app/api/webhooks/*`, `components/enterprise/`, `components/solopreneur/`, `components/sandboxes/*`, `lib/crypto.ts`, `lib/store.ts`, `lib/stripe.ts`, `lib/mock-data.ts`. `zustand`/`stripe`/`@stripe/stripe-js`/`@radix-ui/react-dialog` removed from `package.json` (21 packages pruned). The 4 sandbox components were **deleted, not converted to placeholder cards** as originally planned — `CapabilityStrip.tsx` already covers that role without their fake-backend-simulation baggage (see `PROJECT_BLUEPRINT.md` Section 6 for the full reasoning).

Full detail in `PLAN_PROGRESS.md`.

---

## 🎯 Current Focus: Stage 13 — QA, Polish & Deploy (not started)

- [ ] **Task 13.1:** `STANDARDS.md` audit — confirm no pricing anywhere, sober palette, two-path hero is the one sanctioned second-CTA exception. (Largely already true by construction, but not formally re-audited against the live pages.)
- [ ] **Task 13.2:** Full request-flow walkthrough — a package's "Request This" → pre-filled brief form → submission email → Calendly booking, and the same for an open-ended custom brief with no package selected. (The package-request half of this is done — see Stage 11 above. The open-ended/no-package half and the Calendly booking itself haven't been separately tested.)
- [ ] **Task 13.3:** Responsive/cross-browser + accessibility pass.
- [ ] **Task 13.4:** Deploy to Vercel.

### Current build health
✅ `npx tsc --noEmit` → 0 errors. ✅ `npm run build` → completes end-to-end, route tree is exactly the v3 site. ✅ `grep -riE "vault|AES|zustand|stripe" app components lib` → no matches.

### Still Needed
- [ ] Portfolio site URL (`lib/capabilities.ts`'s `portfolioUrl` field) — pending.
- [ ] Swap `lib/email.ts`'s `from` address off Resend's shared sandbox sender (`onboarding@resend.dev`) to a verified domain — sandbox mode can only ever reach `emilio.a.ramirezl@gmail.com`, not real client emails.
- [ ] **`npm audit`: 2 vulnerabilities (1 high, 1 critical) — in Next.js 14.2.15 itself** (a long list of Server Actions DoS / middleware SSRF / cache-poisoning CVEs), not in any unused dep. Only fix is `next@16.3.3` (`npm audit fix --force` would apply it) — a breaking major-version jump: Next 15+ made `params`/`searchParams` `Promise`-wrapped in Server Components, which would break `app/packages/[slug]/page.tsx` and `app/custom-projects/page.tsx` as currently written, among other likely changes. **Deliberately not done** — needs a real upgrade pass (migrate the async-params API, retest everything), not a `--force` before deploy. Decide before Task 13.4 (Vercel deploy) whether to do this now or ship on 14 and schedule it after.
