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
v3 Stage 8  (Layout & Nav):        [██████████] 100%
v3 Stage 9  (Homepage):            [██████████] 100%
v3 Stage 10 (Packages Catalog):    [██████████] 100%
v3 Stage 11 (Request Flow):        [██████████] 100%
v3 Stage 12 (Cleanup):             [██████████] 100%
v3 Stage 13 (QA & Deploy):         [          ] 0%
```

---

## 🗄️ Superseded Work (Reference Only)

- **v1 (Stages 1-6):** Fully built dual-funnel platform (Enterprise/Solopreneur tracks, Stripe checkout, AES-256 vault, 4 industrial CV sandboxes, client portal). Retired for not matching the actual offer. **Deleted from disk Aug 28, 2026 (Stage 12)** — only findable in git history now.
- **v2 (built through Stage 9, then superseded):** Single-funnel minimalist site, 5 "solo operator pain point" offers, no pricing, contact + Calendly only. Stages 7-9 were actually built and committed — `lib/services.ts`, `components/layout/Header.tsx`/`Footer.tsx`, `app/page.tsx` + `components/home/*`, `app/examples/page.tsx` with a recopied `BeforeAfterSimulator.tsx`. Corrected v1's fake framing but wrongly assumed this site was a general portfolio and dropped pricing/Stripe entirely — neither matched what Emilio actually wants. **Deleted from disk Aug 28, 2026 (Task 12.3a)** — only findable in git history now.

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

### ✅ Stage 8: Layout & Navigation — Complete (Aug 28, 2026)
**Goal:** One simple site shell — no leftover dual-funnel routing.
- [x] **Task 8.1:** `app/layout.tsx` unchanged (already single-shell from v2 Stage 8) — metadata rewritten for v3 positioning, no pricing language.
- [x] **Task 8.2:** `components/layout/Header.tsx` rewritten — nav = Packages / Custom Projects / Contact, single CTA `Get Started` → `/packages`.
- [x] **Task 8.3:** `components/layout/Footer.tsx` rewritten — Packages / Custom Projects / Contact links.
- **Stage 8 Verification:** ✅ No page references the old Enterprise/Solopreneur toggle or v2's Services/Examples nav — confirmed via repo-wide grep. `(enterprise)`/`(solopreneur)` route groups still exist on disk (still v1, untouched) but are no longer linked from any nav; deletion is Stage 12 Task 12.1.

---

### ✅ Stage 9: Homepage — Complete (Aug 28, 2026)
**Goal:** A visitor immediately sees which of the two paths applies to them.
- [x] **Task 9.1:** `components/home/Hero.tsx` rewritten — two-path hero ("I have a project to build" → `/packages`, "I'm a business with a custom need" → `/custom-projects`). No pricing language.
- [x] **Task 9.2:** `components/home/CapabilityStrip.tsx` built from `lib/capabilities.ts` — 6 shallow cards, "See it in action" only when `portfolioUrl` is set (currently none — renders "Portfolio link coming soon" instead of a dead link), always links to its real package detail page.
- [x] `app/page.tsx` rewritten: Hero → CapabilityStrip → closing CTA (both paths repeated).
- **Stage 9 Verification:** ✅ Verified in a running dev server — `/` returns 200, no dual-funnel remnants, no price anywhere in rendered HTML (checked via grep for `$`-amount strings).

---

### ✅ Stage 10: Packages Catalog — Complete (Aug 28, 2026)
**Goal:** A catalog of the 6 packages that sells the scope/turnaround, not a price — every card routes into the shared request flow (Stage 11).
- [x] **Task 10.1:** `lib/packages.ts` — canonical array of the 6 packages (slug, name, pitch, whatItIs, whatsIncluded, turnaround). `internalReferencePrice` field exists but is documented as never-render and no component reads it. Slugs match `lib/capabilities.ts`'s `packageSlug` 1:1.
- [x] **Task 10.2:** `app/packages/page.tsx` + `components/packages/PackageCard.tsx` — catalog grid, no price.
- [x] **Task 10.3:** `app/packages/[slug]/page.tsx` — what's included, turnaround, related capability, "Request This Package" → `/custom-projects?package=<slug>`. Uses `generateStaticParams`/`notFound()`.
- **Stage 10 Verification:** ✅ Verified in a running dev server: `/packages` and all 6 `/packages/[slug]` routes return 200, `/packages/does-not-exist` returns 404, no price string in rendered HTML, "Request This Package" correctly deep-links into `/custom-projects?package=<slug>`.

---

### ✅ Stage 11: Request Flow (Packages + Custom Projects, shared) — Built (Aug 28, 2026), email untested
**Goal:** One request pipeline serves both a picked package and an open-ended custom brief — no public pricing (resolved open item #3).
- [x] **Task 11.1:** `app/custom-projects/page.tsx` — reads `?package=<slug>`, resolves it via `getPackageBySlug`, header/copy adapt to "Requesting: <package>" when present.
- [x] **Task 11.2:** `components/custom-projects/BriefForm.tsx` — name/email/package-select/problem/timeline/budget-range, `react-hook-form` + `zodResolver`, shared schema in `lib/schemas.ts`.
- [x] **Task 11.3:** `app/api/request/route.ts` + `lib/email.ts` (Resend) — validates server-side with the same schema, emails `OWNER_EMAIL`, `replyTo` set to the submitter. Added `resend` to `package.json` (was missing) and ran `npm install`.
- [x] **Task 11.4:** `components/custom-projects/ScheduleEmbed.tsx` — Calendly iframe from `NEXT_PUBLIC_CALENDLY_URL` (already set in `.env.local`), with a plain fallback if unset instead of a broken embed.
- **Stage 11 Verification:** ✅ Form renders, validates, and POSTs correctly. ✅ End-to-end tested Aug 28, 2026 via 3 real `POST /api/request` calls. **Found and fixed a real bug along the way:** the Resend SDK returns `{data, error}` instead of throwing on an API-level rejection — `sendRequestEmail()` wasn't checking `.error`, so the first test call returned `{"ok":true}` while Resend had silently rejected it. Fixed by throwing on `result.error`; the second call (still misconfigured) then correctly surfaced a 502. Root cause: Resend's sandbox `from` (`onboarding@resend.dev`) only delivers to the Resend account's own verified address (`emilio.a.ramirezl@gmail.com`), not the `OWNER_EMAIL` that was set (`emilio.alejandrorl19@gmail.com` — a different address). Emilio confirmed `emilio.a.ramirezl@gmail.com` is correct; `.env.local` updated. Third call succeeded with the fixed error-checking in place, and **Emilio confirmed inbox delivery by screenshot** — the email landed correctly. Request flow is fully working end-to-end. `from` is still `onboarding@resend.dev` (Resend's shared sandbox sender) — swap to a verified domain before relying on this for real client requests, since sandbox mode can only ever reach that one address.

---

### 🔲 Stage 12: Cleanup — Remove Remaining Dead Weight
**Goal:** Codebase matches the v3 site — no leftover v1/v2 remnants, no unused Stripe scaffolding.
- [ ] **Task 12.1:** Delete `app/(enterprise)/`, `app/(solopreneur)/`, `app/api/vault/`, `app/api/sandbox/*` (backend routes only — component shells are repurposed, not deleted, per Task 12.3).
- [ ] **Task 12.2:** Delete `lib/crypto.ts`, `lib/store.ts` (Zustand); remove `zustand` from `package.json`.
- [ ] **Task 12.3:** Convert `ScraperTerminalSandbox.tsx`, `InvoiceParserSandbox.tsx`, `AlprOcrSandbox.tsx`, `DefectQcSandbox.tsx` into static placeholder cards under a new `components/capabilities/` (or trim to whichever subset maps to the 6 packages, per Task 7.4/open item #5) — strip the fake API-driven logic, keep the visual shell only where it's still useful.
- [x] **Task 12.3a (v2 cleanup) — done Aug 28, 2026:** `app/page.tsx`, `components/layout/Header.tsx`/`Footer.tsx`, `components/home/Hero.tsx` overwritten directly by Stage 8/9 work. `lib/services.ts`, `app/examples/page.tsx`, `components/home/ServicesGrid.tsx`, `components/home/ProcessSteps.tsx`, `components/sandboxes/BeforeAfterSimulator.tsx` deleted (confirmed nothing imported them first).
- [x] **Task 12.4 — done Aug 28, 2026:** `.env.example` and `.env.local` rewritten — `RESEND_API_KEY`, `OWNER_EMAIL`, `NEXT_PUBLIC_CALENDLY_URL`. `VAULT_ENCRYPTION_KEY` and Stripe vars removed from both.
- [x] **Task 12.1 — done Aug 28, 2026:** Deleted `app/(enterprise)/`, `app/(solopreneur)/`, `app/api/vault/`, `app/api/sandbox/*`. Also deleted `app/api/checkout/` and `app/api/webhooks/` — not explicitly named in this task, but dead now that Stage 11 replaced them with `app/api/request/route.ts` and the blueprint's own Section 6 no longer lists them. Along with the route groups, also deleted their dedicated `components/enterprise/` and `components/solopreneur/` directories (only ever imported from those routes — confirmed via repo-wide grep before deleting), and the now-unused `components/ui/Dialog.tsx`/`Progress.tsx` (only consumer was legacy code; `Tabs.tsx` stays per the Section 6 KEEP list even though it's currently unused, since it's a generic primitive).
- [x] **Task 12.2 — done Aug 28, 2026:** Deleted `lib/crypto.ts`, `lib/store.ts`, plus `lib/stripe.ts` and `lib/mock-data.ts` (both fully orphaned — 0 importers anywhere, confirmed before deleting). Removed `zustand`, `stripe`, `@stripe/stripe-js`, and `@radix-ui/react-dialog` from `package.json`, ran `npm install` (21 packages pruned). Left `framer-motion`, `react-dropzone`, `@tanstack/react-query`, `@supabase/*`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-toast` alone — these were already unused from the original v1 scaffold (0 importers even before today), not part of this task's explicit scope; worth a separate dependency audit later if desired.
- [x] **Task 12.3 — done differently than planned, Aug 28, 2026:** Did **not** convert `ScraperTerminalSandbox.tsx`/`InvoiceParserSandbox.tsx`/`AlprOcrSandbox.tsx`/`DefectQcSandbox.tsx` into placeholder cards — deleted them outright instead. Reasoning: `CapabilityStrip.tsx` (built in Stage 9, before this task ran) already fully satisfies "a small placeholder card, not a working demo" (`PROJECT_BLUEPRINT.md` Section 4) in a simpler form than converting the old sandboxes would have produced. The old sandbox components actively simulated live backends (fake terminal logs, streaming extraction UI) — precisely what Section 8 Rule 2 ("no component may fake a working backend") prohibits — so converting them risked reproducing that anti-pattern instead of removing it. `components/capabilities/` was never created; it wasn't needed.
- **Stage 12 Verification:** ✅ `npx tsc --noEmit` → 0 errors (was 8, all pre-existing v1 issues, all now gone with the files). ✅ `npm run build` completes end-to-end — route tree is down to exactly the v3 site (`/`, `/contact`, `/custom-projects`, `/packages`, `/packages/[slug]`, `/api/request`). ✅ `grep -riE "vault|AES|zustand|stripe" app components lib` → no matches.

---

### 🔲 Stage 13: QA, Polish & Deploy
**Goal:** Ship it.
**Open decision found during Stage 12 cleanup:** `npm audit` reports 2 vulnerabilities (1 high, 1 critical), both in **Next.js 14.2.15 itself** — the only fix is `next@16.3.3`, a breaking major-version jump (Next 15+ makes `params`/`searchParams` `Promise`-wrapped in Server Components, breaking `app/packages/[slug]/page.tsx` and `app/custom-projects/page.tsx` as written). Not done — see `CURRENT_STAGE.md` for detail. Decide before Task 13.4.
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
