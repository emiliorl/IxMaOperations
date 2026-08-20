# Current Stage Tracker: Stage 3 & 4 (Dual-Funnel Pages & Components)

> **Active Document:** `CURRENT_STAGE.md`  
> **Current Focus:** Completing Page Routes & Component Wiring for Enterprise and Solopreneur Funnels  
> **Target Branch:** `dev`  
> **Status:** 🟡 In Active Execution

---

## 🎯 Current Milestone Goals

Assemble all page views, interactive sandbox visualizers, and conversion mechanisms across both tracks so that developers can test the complete end-to-end user journey:

1. **Enterprise Track (`/(enterprise)`):**
   - [x] `components/sandboxes/AlprOcrSandbox.tsx`
   - [ ] `components/sandboxes/DefectQcSandbox.tsx`
   - [ ] `components/sandboxes/InvoiceParserSandbox.tsx`
   - [ ] `components/sandboxes/ScraperTerminalSandbox.tsx`
   - [ ] `components/enterprise/HeroSection.tsx`
   - [ ] `components/enterprise/ROIStatsGrid.tsx`
   - [ ] `components/enterprise/ArchitectureDiagram.tsx`
   - [ ] `components/enterprise/FeasibilityModal.tsx`
   - [ ] `app/(enterprise)/layout.tsx`
   - [ ] `app/(enterprise)/page.tsx`
   - [ ] `app/(enterprise)/audit/page.tsx`
   - [ ] `app/(enterprise)/case-studies/page.tsx`
   - [ ] `app/(enterprise)/sandbox/page.tsx`

2. **Solopreneur Track (`/(solopreneur)`):**
   - [ ] `components/solopreneur/MicroSprintCard.tsx`
   - [ ] `components/solopreneur/AsyncIntakeForm.tsx`
   - [ ] `components/solopreneur/ApiKeyVault.tsx`
   - [ ] `components/solopreneur/MicroCheckoutButton.tsx`
   - [ ] `app/(solopreneur)/layout.tsx`
   - [ ] `app/(solopreneur)/tools/page.tsx`
   - [ ] `app/(solopreneur)/tools/[slug]/page.tsx`
   - [ ] `app/(solopreneur)/onboarding/[orderId]/page.tsx`
   - [ ] `app/(solopreneur)/portal/page.tsx`

---

## 📝 Immediate Action Checklist (Next 3 Steps)

1. **Implement remaining 3 Sandbox Components:**
   - `DefectQcSandbox.tsx` (YOLOv8 / PatchCore dual-canvas heatmap overlay)
   - `InvoiceParserSandbox.tsx` (LayoutLM document split-pane parser)
   - `ScraperTerminalSandbox.tsx` (Live SSE Playwright log terminal)
2. **Implement Enterprise Conversion Suite:**
   - `HeroSection.tsx`, `ROIStatsGrid.tsx`, `ArchitectureDiagram.tsx`, `FeasibilityModal.tsx`
   - Connect `app/(enterprise)/page.tsx` & `/case-studies`
3. **Implement Solopreneur Async Suite:**
   - `ApiKeyVault.tsx` with client-side AES-256 encryption
   - `AsyncIntakeForm.tsx` + `MicroCheckoutButton.tsx`
   - Connect `app/(solopreneur)/tools` & `/onboarding/[orderId]`

---

## 🔍 Validation & Definition of Done for this Stage

- [ ] All routes (`/`, `/audit`, `/case-studies`, `/sandbox`, `/tools`, `/tools/[slug]`, `/onboarding/[orderId]`, `/portal`) load without 404s.
- [ ] Top navigation toggle smoothly transitions between Enterprise and Solopreneur funnels.
- [ ] All 4 sandboxes execute simulated inference and render visual feedback (heatmaps, bboxes, logs).
- [ ] AES-256 Vault encrypts tokens before POSTing to `/api/vault`.

---

*Once all items in this file are checked off, update `PLAN_PROGRESS.md` and transition `CURRENT_STAGE.md` to Stage 6.*
