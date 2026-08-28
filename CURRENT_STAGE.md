# Current Stage Tracker: Stage 12 (v3 — Cleanup, In Progress)

> **Active Document:** `CURRENT_STAGE.md`
> **Target Branch:** `dev`
> **Status:** 🟡 In Progress — Stages 7-11 built (Aug 28, 2026), Stage 12 cleanup partial

---

## 🔄 What This Site Actually Is (read this first)

This is **not** a portfolio site — Emilio has a separate dedicated site for that. IxMaOperations exists to get contract work, two ways:

1. **Individuals & small teams** — browse 6 pre-scoped, fixed-turnaround packages. No price is shown; a "Request This" button submits a brief and Emilio replies with price + timeline.
2. **Businesses** — no public pricing; submit a brief describing the project, then book a call (Calendly) to settle a price + timeline.

Both paths share the same request flow underneath (`app/api/request/route.ts`) — the difference is scope (pick a defined package vs. describe an open-ended need), not self-serve checkout vs. consultation. **No price is shown publicly anywhere on the site** (locked Aug 27, 2026, verified in a running dev server Aug 28, 2026).

This is **v3** of the plan. v1 (dual-funnel Enterprise/Solopreneur, fully built) and v2 (single-funnel minimalist, built through Stage 9, then superseded) are both retired — see `PROJECT_BLUEPRINT.md` Section 0.

---

## ✅ Stages 7–11 — Built (Aug 28, 2026)

- **Stage 7 (Content):** `lib/packages.ts`, `lib/capabilities.ts` written. Blocked only on the pending portfolio URL (doesn't block anything else).
- **Stage 8 (Layout & Nav):** `Header.tsx`/`Footer.tsx` rewritten — Packages / Custom Projects / Contact, single `Get Started` CTA.
- **Stage 9 (Homepage):** `Hero.tsx` (two-path) + `CapabilityStrip.tsx`, `app/page.tsx` reassembled.
- **Stage 10 (Packages Catalog):** `/packages` + `/packages/[slug]`, no price rendered anywhere.
- **Stage 11 (Request Flow):** `/custom-projects` (shared by both paths via `?package=`), `BriefForm.tsx`, `ScheduleEmbed.tsx`, `app/api/request/route.ts` + `lib/email.ts`. **Not yet verified end-to-end** — no real test email has actually been sent/received.
- Also deleted as part of this pass: the v2-only files with no v3 equivalent (`lib/services.ts`, `app/examples/page.tsx`, `ServicesGrid.tsx`, `ProcessSteps.tsx`, `BeforeAfterSimulator.tsx`) — Task 12.3a.
- Fixed a pre-existing bug hit along the way: `package.json` pinned `lucide-react@^0.430.0`, a version that was never published, which silently blocked `npm install`. Bumped to `^0.436.0`.

Full detail in `PLAN_PROGRESS.md`.

---

## 🎯 Current Focus: Stage 12 — Cleanup (Partial)

- [x] Task 12.3a (v2 orphan files) — done.
- [x] Task 12.4 (env vars) — `.env.example`/`.env.local` updated; Stripe/vault vars removed, `OWNER_EMAIL` added.
- [ ] Task 12.1 — `app/(enterprise)/`, `app/(solopreneur)/`, `app/api/vault/`, `app/api/sandbox/*` still on disk (no longer linked from nav, but not deleted).
- [ ] Task 12.2 — `lib/crypto.ts`, `lib/store.ts`, `zustand` not yet removed.
- [ ] Task 12.3 — the 4 v1 sandbox components not yet converted to capability placeholder cards.

### ✅ Build is green (fixed Aug 28, 2026)
`npm run build` now completes end-to-end. Fixed three pre-existing v1 bugs that were blocking it (none in Stage 7-11 code): the `Badge variant="cyan"` typo (6 occurrences → `"outline"`), a `Uint8Array`/`BufferSource` typing conflict in `lib/crypto.ts` (cast to `BufferSource`, 3 call sites), and a missing `<Suspense>` boundary around `useSearchParams()` in `app/(solopreneur)/portal/page.tsx`. These were stopgap fixes to unblock the build now — Task 12.1/12.2 still deletes these files outright later.

### Still Needed
- [ ] Portfolio site URL (Task 7.4's `portfolioUrl` field) — pending.
- [ ] A real end-to-end test of the request flow (submit `/custom-projects`, confirm the email actually lands in `OWNER_EMAIL`'s inbox) — not yet done.
- [ ] Swap `lib/email.ts`'s `from` address off Resend's shared sandbox sender (`onboarding@resend.dev`) to a verified domain before relying on this for real client requests.
