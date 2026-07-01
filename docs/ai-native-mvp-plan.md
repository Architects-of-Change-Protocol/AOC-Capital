# Privana AI-Native PM Copilot — Phase 1 Implementation Plan

## 1) Repo Audit (Current State)

### Product surface found
- Auth + protected workspace scaffold.
- Existing PMO Copilot chat at `/copilot` with project context + methodology selector.
- Billing/pricing and plan gating (Free/Pro/Enterprise).
- Upload + analysis endpoints and project memory primitives.
- Supabase-backed tenant model and state tables.

### Strong foundations to reuse
- Multi-tenant auth + organization identity.
- Existing protected layout/sidebar.
- Existing design language (dark gradient + cards + chips).
- Existing copilot API route conventions.
- Existing plan access checks and usage limits.

### Gaps for AI-native PM platform
- No module-oriented IA for stakeholder/politics/escalation workflows.
- Copilot is single generic chat surface, not task-specialized experiences.
- No explicit meeting transcript pipeline (ingest → parse → action map).
- No risk alerting stream or structured escalation guidance UX.
- No persistent “project memory” timeline view for decision traceability.

---

## 2) Target Phase 1 Architecture

## Product IA (clickable MVP)
Protected app navigation:
- Dashboard (executive rollup)
- Stakeholder Intel
- Meetings
- Political Risk
- Escalation Guide
- Message Nudges
- Project Memory
- Copilot (existing, kept as cross-module assistant)

### Module-first architecture
Each module ships with:
- `page.tsx` (UI shell + state)
- `types.ts` (module contracts)
- `mock.ts` (mock AI output factory)
- optional `components/*` (module-specific cards)

Common shared layer:
- `src/features/ai-core/` for reusable AI response envelopes, confidence labels, citation chips, and fallback states.
- `src/features/navigation/` for module registry (single source for sidebar and breadcrumbs).
- `src/features/project-memory/` for append/read timeline events.

### API pattern
- Keep route handlers under `src/app/api/...`.
- Add module routes with normalized response contract:
  - `POST /api/ai/stakeholder-intel`
  - `POST /api/ai/meeting-analyzer`
  - `POST /api/ai/political-risk`
  - `POST /api/ai/escalation-guide`
  - `POST /api/ai/message-nudges`
  - `GET|POST /api/ai/project-memory`
- Phase 1 returns deterministic mocks with realistic schema and latency simulation.

---

## 3) Proposed Folder Architecture

```txt
src/
  app/
    (protected)/
      dashboard/
      copilot/
      stakeholder-intel/
      meetings/
      political-risk/
      escalation-guide/
      message-nudges/
      project-memory/
    api/
      ai/
        stakeholder-intel/route.ts
        meeting-analyzer/route.ts
        political-risk/route.ts
        escalation-guide/route.ts
        message-nudges/route.ts
        project-memory/route.ts
  features/
    navigation/
      module-registry.ts
    ai-core/
      response-types.ts
      mock-latency.ts
      confidence.ts
    stakeholder-intel/
      types.ts
      mock.ts
      components/
    meetings/
      types.ts
      mock.ts
      components/
    political-risk/
      types.ts
      mock.ts
      components/
    escalation-guide/
      types.ts
      mock.ts
      components/
    message-nudges/
      types.ts
      mock.ts
      components/
    project-memory/
      types.ts
      mock.ts
      components/
```

---

## 4) What to Keep

- `src/app/(protected)/layout.tsx` as main shell (extend nav via registry).
- `src/app/(protected)/copilot/page.tsx` as horizontal assistant experience.
- `src/lib/auth.ts`, `src/lib/plan-access.ts`, `src/lib/usage-limits.ts`.
- Supabase client/server/admin helpers.
- Existing billing + pricing + webhook flows.
- Existing visual primitives (cards, chips, borders, gradients).

## 5) What to Remove / Refactor

- Hardcoded nav item array in protected layout → replace with module registry.
- Monolithic copilot-only positioning in dashboard redirect → dashboard should become a real command center.
- Any module logic embedded directly in page files (move to `src/features/*`).
- Duplicate API shape patterns across routes (converge to shared envelope).

---

## 6) Phase 1 Build Sequence (Ship Clickable MVP Fast)

## Sprint A — IA + UI skeleton (Day 1)
1. Add module registry and generate sidebar from it.
2. Create 6 new protected routes with production-grade empty/loading/error states.
3. Create Dashboard rollup cards linking to each module.

## Sprint B — Mock intelligence (Day 2)
4. Implement typed mock providers per module (`mock.ts`).
5. Wire each page to call module API route and render structured cards.
6. Add “last updated”, confidence badge, and source tags for realism.

## Sprint C — Memory + orchestration (Day 3)
7. Add project memory timeline page with append/read mock events.
8. Connect module actions to memory writes (e.g., “Create escalation memo” logs event).
9. Add global quick actions (top of dashboard) to jump into high-risk workflows.

## Sprint D — Hardening (Day 4)
10. Accessibility pass (keyboard, aria labels, contrast).
11. Empty/error recovery patterns and optimistic UI feedback.
12. Lint, type-check, build, and basic interaction QA.

---

## 7) Module-by-Module MVP Definition

1. Stakeholder Intelligence Dashboard
- Stakeholder map cards (influence/stance/volatility).
- Relationship risk summary.
- Recommended next touchpoint.

2. Meeting Transcript Analyzer
- Input: transcript text blob (paste-first MVP).
- Output: decisions, blockers, owners, due dates, sentiment drift.

3. Political Risk Alerts
- Emerging risk feed with severity and confidence.
- Trigger rationale + suggested mitigation.

4. Escalation Guidance Engine
- Escalation readiness score.
- Who to escalate to, when, and suggested script.

5. Smart Message Nudges
- Persona-aware draft suggestions (exec/client/team).
- Tone variants: concise, diplomatic, assertive.

6. Project Memory Layer
- Event timeline (decision, risk, escalation, commitment).
- Semantic search placeholder (mock results first).

---

## 8) Immediate First Commits

Commit 1: `feat(nav): introduce module registry and protected nav expansion`
- Add registry + update layout nav rendering.

Commit 2: `feat(modules): add phase-1 protected pages with production UX shells`
- Add six route pages with consistent loading/empty/error components.

Commit 3: `feat(api-mocks): add typed mock AI endpoints for phase-1 modules`
- Add API routes and shared response contracts.

Commit 4: `feat(memory): add project memory timeline and module event logging`
- Add timeline UI + mock persistence adapter.

Commit 5: `chore(quality): tighten lint/types and normalize module boundaries`
- Refactor page logic into `src/features/*`, cleanup dead code.

---

## 9) Acceptance Criteria for Clickable MVP

- Users can navigate all 6 modules from sidebar.
- Every module renders meaningful mock AI output in <2s perceived latency.
- Dashboard surfaces cross-module health snapshot.
- Actions in at least 3 modules write an event to Project Memory timeline.
- Works on Free plan with mock gating labels; Pro/Enterprise badges preserved.

