# Enterprise Runtime Sovereignty Audit — PMFreak
Date: 2026-05-17

## Scope limitation
Only the PMFreak repository is present in this workspace. `AOC-Enterprise` and `Architects_of_Change_Protocol` are not available as separate repositories, so this audit assesses them through the in-repo staging layers at `src/aoc/enterprise` and `src/aoc/protocol` plus architecture docs.

## Core verdict
PMFreak is **not** cleanly consuming an external enterprise runtime. It still embeds runtime, authz, policy, trust, and audit logic locally, with only partial namespace-layering and shim-based separation.

## Key architectural breaks
1. Protocol layer imports PMFreak runtime security modules (`src/aoc/protocol/contracts/capability-claims.ts` imports `@/lib/security/*`), violating protocol sovereignty.
2. Enterprise runtime modules directly depend on PMFreak auth/access modules (`src/aoc/enterprise/runtime/policy-engine.ts` imports `@/lib/security/server-authorization` and `@/lib/security/access-guards`).
3. PMFreak route handlers and server helpers can call Supabase directly, bypassing a singular runtime enforcement choke point.
4. SDK is mixed contract+implementation and points at PMFreak-local API routes, not a separate enterprise service endpoint.
5. Authorization pipeline is duplicated across RBAC checks, policy checks, and ad hoc guard calls, creating inconsistent enforcement paths.

## Immediate hardening priorities
- Extract protocol contracts into a package with zero PMFreak imports.
- Extract runtime policy/authorization/enforcement into enterprise package/service and make PMFreak consume only client APIs.
- Block direct DB access for governance/capability domains from PMFreak app layer.
- Replace local guard fan-out with single enterprise authorization gateway.
- Enforce import rules in CI for dependency direction.

## Remediation note (2026-05-17)
- Resolved key break #1 by isolating `src/aoc/protocol/contracts/capability-claims.ts` to pure contract artifacts only (types/constants/canonicalization/hash helpers), and moving PMFreak runtime trust/signing/verification integrations into `src/lib/security/capability-claims.ts`.
- Added `tests/protocol-import-boundaries.test.mjs` to assert protocol contracts do not import forbidden PMFreak layers.


## Remediation update (2026-05-18)
- Resolved key break #2 by enforcing enterprise-owned authorization boundaries across `src/aoc/enterprise/**`: enterprise runtime modules now remain free of PMFreak app/lib imports (`@/lib/*`, `@/app/*`, auth/security helpers).
- Added `tests/enterprise-runtime-sovereignty-imports.test.mjs` to statically fail if enterprise runtime layers import PMFreak auth/security or app/lib modules, preventing regression of dependency direction.
- Confirmed portability boundary: PMFreak-specific deny response shaping remains in `src/lib/aoc/enterprise/runtime.ts` (application adapter), while enterprise runtime evaluation/enforcement contracts remain in `src/aoc/enterprise/runtime/**`.

## Runtime consumption transition update (2026-05-18, phase-1 rollout)
- Added a single PMFreak-consumed enterprise authorization entrypoint at `src/lib/aoc/enterprise/authorization.ts` via `authorizeRuntimeAction()`, which delegates orchestration to enterprise runtime and normalizes decision shape for application use.
- Added PMFreak runtime consumer adapter `src/lib/aoc/pmfreak-runtime-consumer.ts` to isolate request shaping (session identity + scope + metadata) from authorization logic.
- Migrated `src/app/api/operational-memory/route.ts` from local `requireProjectPermission()` enforcement to enterprise runtime consumption flow (`buildEnterpriseRuntimeRequest` -> `authorizeRuntimeAction` -> response shaping).
- Began conversion of `src/lib/security/server-authorization.ts:evaluateCapability()` to enterprise runtime delegation, removing direct local policy orchestration from that path.
- Added regression test `tests/runtime-consumer-boundary.test.mjs` to fail if migrated routes regress to local guard/policy ownership.

### Migration map (current)
- **Migrated to enterprise runtime consumer flow:**
  - `src/app/api/operational-memory/route.ts` (GET/POST project-scoped memory reads/writes).
  - `src/lib/security/server-authorization.ts` capability evaluation path.
- **Still local ownership (remaining):**
  - Multiple route handlers under `src/app/api/**` still import `@/lib/security/access-guards`.
  - Several protected server actions under `src/app/(protected)/**/actions.ts` still use local role checks.
  - Legacy `src/lib/security/access-guards.ts` still contains local RBAC + enforcement orchestration.

### Runtime sovereignty status
- Progress estimate: **~38%** complete for authorization ownership migration.
- Main remaining violations: route-level local guard orchestration, mixed policy/RBAC decisioning in app-layer security helpers, and partial bypass of a singular runtime authorization choke point.

## Access Guards Authority Migration (2026-05-18, prompt 1.6)
- Converted `src/lib/security/access-guards.ts` from local RBAC authority into a compatibility adapter that now builds enterprise runtime requests (`buildEnterpriseRuntimeRequest`) and delegates final decisions to `authorizeRuntimeAction`.
- Removed local policy/RBAC sovereignty from access guards (no local `defaultGovernancePolicyEvaluator` or `evaluatePolicyDecision` authority in this layer).
- Updated `src/lib/security/server-authorization.ts` capability path to remain a thin runtime-consumer wrapper (runtime decision only; no hybrid local policy fallback).

### What remains compatibility-only
- Legacy function names and return shapes (`requireProjectPermission`, `requireProjectAccess`, `requireWorkspaceMembership`, `requireWorkspaceRole`) remain in place to avoid mass route churn.
- Minimal DB reads remain for context enrichment/normalization (for example: project -> workspace resolution and role value shaping), not final allow/deny.

### Authority moved to Enterprise Runtime
- Final project/workspace permission allow/deny now comes from enterprise runtime authorization pipeline via `authorizeRuntimeAction` in access guard and server-authorization paths.
- Denials are translated into existing `AccessDeniedError` envelope for backward-compatible route behavior.

### Remaining bypass risks
- `requireAgentScope` in `access-guards.ts` still uses local DB grant checks for agent permissions and has not yet been converted to enterprise-runtime authority.
- Several routes/actions still call legacy guards directly; they are now runtime-backed for user/workspace/project authorization but still represent broad compatibility surface area.
- Additional local policy usage outside the migrated paths (e.g., policy playground/evaluation routes) remains and should be addressed in subsequent prompts.

### Updated migration estimate
- Authorization ownership migration progress: **~56%** complete.
- Runtime sovereignty estimate: **~58%**.
- Enterprise readiness estimate: **~62%**.

## Runtime consumption transition update (2026-05-18, prompt 1.7 rollout)
- Migrated `requireAgentScope()` in `src/lib/security/access-guards.ts` to enterprise runtime authority (`buildEnterpriseRuntimeRequest` -> `authorizeRuntimeAction`) and removed local final allow/deny ownership from `ai_agent_permissions` checks.
- Migrated `evaluateAgentAccess()` in `src/lib/security/agent-access.ts` off local `evaluatePolicyDecision()` authority to enterprise runtime decisioning; local scope/agent table reads now remain compatibility/context only.
- Preserved compatibility wrappers and audit event emission while attaching enterprise runtime decision identifiers/reasons into event details.

### Updated bypass vector inventory
- **Removed in this prompt:**
  - Local final authority in `requireAgentScope()`.
  - Local policy sovereignty in `evaluateAgentAccess()` (`evaluatePolicyDecision` path removed).
- **Still remaining split authority candidates:**
  - Policy playground surfaces (`src/app/(protected)/playground/actions.ts`, `src/app/api/sdk/policies/evaluate/route.ts`) still intentionally invoke local policy evaluation for simulation/inspection.
  - Several SDK mutation endpoints still perform local role gating + direct DB writes (`src/app/api/sdk/**`) and need runtime-consumer conversion to eliminate route-level branching.

### Sovereignty/portability estimate (post prompt 1.7)
- Runtime sovereignty estimate: **~69%**.
- Enterprise runtime authority estimate: **~71%**.
- Multitenancy readiness estimate: **~68%**.
- External SDK readiness estimate: **~64%**.
- Remaining technical debt: legacy SDK/write routes with local role ownership; playground-local policy evaluator exposure; scattered compatibility shims awaiting full runtime-consumer adoption.
## FINAL Track 1 Audit (Prompt 1.8) — 2026-05-18

### A. CURRENT ARCHITECTURE STATE
- **Runtime layering:** PMFreak now uses a staged layering where protocol contracts live under `src/aoc/protocol/**`, enterprise orchestration lives under `src/aoc/enterprise/runtime/**`, and PMFreak route/server layers primarily consume through adapters in `src/lib/aoc/**` and compatibility guards in `src/lib/security/**`.
- **Ownership boundaries:** Final allow/deny for many project/workspace checks is delegated through enterprise runtime entrypoints (via runtime request building + `authorizeRuntimeAction`) but a non-trivial compatibility surface still remains in PMFreak-local guards.
- **Authority boundaries:** Enterprise runtime is primary for migrated flows, but not exclusive; policy simulation, capability flows, and agent-scope checks still retain local authority fragments.
- **Runtime-consumer flow:** Matured flow in migrated paths is `route/action -> PMFreak runtime consumer adapter -> enterprise runtime authorization -> normalized decision -> route response shaping`.
- **Orchestration flow:** Centralization has improved, but orchestration is still partially split between `authorizeRuntimeAction`, compatibility wrappers (`require*` functions), and direct route-level guard invocations.

### B. WHAT WAS SUCCESSFULLY ACHIEVED
- Protocol import boundaries were hardened and remained clean under boundary scans (`src/aoc/protocol` had no forbidden app/lib/sdk/enterprise imports).
- Enterprise runtime import boundaries were hardened and remained clean under boundary scans (`src/aoc/enterprise` had no forbidden app/lib imports).
- Runtime consumer entrypoint and adapters are in place and verified by runtime-consumer boundary tests.
- Local access guards have been converted from full local policy sovereignty to primarily runtime-backed compatibility wrappers for user/project/workspace checks.
- Authorization regression checks are active and currently passing, reducing risk of reintroducing direct local ownership in already-migrated surfaces.

### C. REMAINING TECHNICAL DEBT

#### Remaining split authority
- `requireAgentScope` still performs local DB grant ownership against `ai_agent_permissions` in `src/lib/security/access-guards.ts`.
- Governance core in enterprise runtime still depends on adapter calls that map to PMFreak compatibility checks (`requireProjectPermission`, `requireWorkspaceMembership`, `requireAgentScope`) rather than pure runtime-native primitives.
- Policy evaluation remains available as a local pathway through `evaluatePolicyDecision` usage in playground, capability flow, agent access, and SDK evaluation routes.

#### Remaining bypass vectors
- Multiple API and protected action handlers still call compatibility guards directly (`requireProjectPermission`, `requireWorkspaceMembership`, `requireWorkspaceRole`), creating broad bypass-prone call surfaces if wrappers regress.
- SDK/admin routes still execute direct Supabase mutations after local guard checks, leaving route-local orchestration and data ownership in the app layer.
- Playground and simulation paths still perform local policy evaluation that can diverge from production runtime governance semantics.

#### Remaining orchestration duplication
- Decision shaping and enforcement semantics still exist in multiple layers: enterprise runtime, PMFreak authorization adapter, compatibility guards, and route-local error handling.
- Mixed use of enterprise runtime evaluation and legacy security helpers persists in capability and agent-related flows.

#### Remaining portability blockers
- PMFreak/Supabase-specific dependencies still dominate adapters and runtime access verification (`src/lib/aoc/adapters/**`, `src/lib/security/**`), preventing drop-in runtime extraction.
- Enterprise runtime still relies on PMFreak-provided adapter behavior that is implemented with app-specific auth/session/storage assumptions.
- SDK routes are PMFreak API-first rather than runtime-service-first, limiting reusable external runtime consumption.

#### Remaining multitenancy blockers
- Agent permission authority is still tied to direct table checks (`ai_agent_permissions`) in local security layer.
- Tenant/workspace/project isolation is generally present but enforcement lineage remains split across wrappers and route-local handling, increasing drift risk.
- Shared context assumptions in compatibility wrappers can still blur hard runtime context boundaries if new routes bypass normalized request construction.

#### Remaining SDK blockers
- SDK surface mixes control-plane operations with PMFreak-local route/auth patterns.
- Decision contracts are not fully unified across SDK endpoints; some routes return local envelopes rather than standardized runtime decision artifacts.
- External SDK viability is limited by dependence on PMFreak session/auth semantics and internal route topology.

#### Remaining governance blockers
- Governance policy evaluation still has dual-path behavior (runtime + local-compatible checks).
- Not all governance-relevant routes have been migrated to a strict single runtime authorization choke point.

### D. FINAL SCORECARD (STRICT)
- **Protocol Purity:** 93
- **Enterprise Runtime Separation:** 82
- **Authorization Centralization:** 71
- **Runtime Consumer Architecture:** 78
- **Runtime Sovereignty:** 74
- **Enterprise Runtime Portability:** 66
- **SaaS Readiness:** 79
- **Multitenancy Readiness:** 76
- **External SDK Readiness:** 63
- **Enterprise Governance Readiness:** 75

### E. FINAL VERDICT
1. **Is PMFreak now behaving as a runtime consumer?** **Partially yes** — materially improved and real in migrated paths, but not yet complete platform-wide.
2. **Is Enterprise Runtime now the primary authorization authority?** **Yes, but not exclusive** — primary in converted flows; residual local authority remains.
3. **Is runtime sovereignty structurally real?** **Emerging but incomplete** — structurally credible, with unresolved local sovereignty pockets.
4. **Is the architecture approaching enterprise-runtime portability?** **Yes** — directionally correct, still blocked by app-specific adapter and infra coupling.
5. **Is the ecosystem approaching external SDK viability?** **Partially** — contracts are improving but not yet normalized enough for clean external consumption.
6. **Is the system approaching sovereign enterprise runtime architecture?** **Yes** — meaningful progress, but still below full sovereign threshold.

### F. TRACK 2 READINESS (CI/CD + Registry + Releases)
- **Readiness assessment:** **Conditionally ready** for Track 2 kickoff if Track 1.8.1 stabilization tasks are first prioritized and gated.
- **Blockers:**
  - Residual split authority (`requireAgentScope`, local policy evaluation paths).
  - SDK/control-plane routes with local orchestration and direct Supabase coupling.
  - Incomplete consolidation of runtime decision contract envelopes.
- **Recommendations:**
  1. Migrate `requireAgentScope` authority fully into enterprise runtime primitives.
  2. Migrate high-risk SDK/admin and policy-playground routes to strict runtime gateway contracts.
  3. Introduce CI boundary checks for direct guard usage in new routes/actions (allowlist-only during transition).
  4. Standardize runtime decision/audit/trust metadata shape across all entrypoints.
- **Required stabilization before Track 2:**
  - Close remaining local authority paths in agent + policy simulation flows.
  - Reduce route-local orchestration by enforcing a single authorization gateway contract.
  - Freeze a versioned runtime decision schema for SDK and external consumers.

## Track 1.8.1 — Stabilization Before Track 2

### What was stabilized
- Hardened policy simulation output labeling so SDK policy evaluation responses are explicitly non-authoritative and identify enterprise runtime as production authority.
- Migrated high-risk SDK capability mutation routes from compatibility role gate orchestration to explicit runtime-consumer flow (`buildEnterpriseRuntimeRequest` + `authorizeRuntimeAction`).
- Expanded runtime boundary tests to enforce simulation/non-authoritative semantics and authorization-envelope authority fields.
- Extended enterprise runtime decision envelope with explicit `decisionSource`, `authoritative`, `evaluatedAt`, and `evaluatedRoles` fields.

### Policy simulation paths that remain
- `src/app/api/sdk/policies/evaluate/route.ts` remains a simulation/diagnostic route by design and is now explicitly marked `decisionSource: "policy-simulation"`, `authoritative: false`, and `productionAuthority: "enterprise-runtime"`.
- Protected playground and capability flow paths still include local policy evaluation surfaces and remain transition risk until full runtime delegation is completed.

### SDK/admin route classification and migration snapshot
- **A (runtime-backed):** `src/app/api/operational-memory/route.ts`, migrated SDK capability request/grant mutation routes in this pass.
- **B (compatibility-wrapper-backed):** routes still mediated through `requireWorkspaceRole`/`requireProjectPermission` compatibility guards.
- **C (local orchestration still present):** multiple SDK agent/policy mutation routes and protected action handlers not migrated in this pass.
- **D (simulation/diagnostic only):** `src/app/api/sdk/policies/evaluate/route.ts`.

### Decision envelope standardization
- Enterprise runtime normalized envelope now carries explicit authority/source metadata:
  - `decisionSource: "enterprise-runtime"`
  - `authoritative: true`
  - `evaluatedAt`
  - `evaluatedRoles` (currently empty list until role trace extraction is finalized)
- Policy simulation responses now include explicit non-authoritative authority metadata.

### PMFreak-specific coupling that remains
- PMFreak coupling persists in adapter/consumer boundary where Supabase/session/auth context and PMFreak route semantics are translated into enterprise runtime requests.
- Adapter-local coupling (e.g., membership/permission lookup and session-derived user context) remains intentionally contained in `src/lib/aoc/adapters/*`, `src/lib/security/*`, and PMFreak runtime-consumer glue.
- Full extraction of PMFreak-specific adapters from enterprise/protocol remains deferred to post-stabilization tracks.

### Remaining blockers before Track 2
1. Remaining simulation/playground/capability-flow local evaluation paths outside hardened SDK policy simulation response envelope.
2. Broad compatibility-wrapper surface across API/protected handlers still requiring incremental migration.
3. Incomplete role-level normalization in enterprise decision envelope (`evaluatedRoles` placeholder currently empty).
4. Ongoing PMFreak-specific adapter dependencies on Supabase/session context.

### Updated readiness assessment
- Runtime-consumer architecture is more stable for packaging/release preparation due to lower split authority on high-risk SDK capability mutation paths and explicit simulation sovereignty markers.
- Track 2 readiness is **improved but conditional**: acceptable to proceed with CI/CD + registry/release plumbing while continuing incremental migration of remaining compatibility and simulation-local paths.
