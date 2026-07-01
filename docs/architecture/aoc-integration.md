# PMFreak ↔ AOC Integration Boundary

## Current Consumption Mode (May 15, 2026)

PMFreak now consumes AOC surfaces through package names:
- `@aoc/protocol/contracts`
- `@aoc-enterprise/runtime`

These package names are currently linked locally via `file:` dependencies (`src/aoc/protocol` and `src/aoc/enterprise`) so PMFreak behaves as a **vertical consumer** while we keep migration-safe compatibility wrappers.

## Linkage Strategy

- `package.json` uses local package links:
  - `"@aoc/protocol": "file:src/aoc/protocol"`
  - `"@aoc-enterprise/runtime": "file:src/aoc/enterprise"`
- `tsconfig.json` adds temporary path aliases for TypeScript/editor resolution.
- Product code is still required to consume AOC through `src/lib/aoc/*`.

This keeps runtime/build stable now and allows future swap to published/GitHub packages with minimal churn.

## Ownership Boundaries

### PMFreak owns
- PM workflows, UX, business semantics
- product routes and SDK UX contracts

### AOC Protocol owns
- capability/delegation/policy/audit contracts

### AOC Enterprise owns
- authorization evaluation/enforcement pipeline runtime surface

## Integration Boundary in PMFreak

Primary entry points:
- `src/lib/aoc/protocol/types.ts` – thin bridge to `@aoc/protocol/contracts`
- `src/lib/aoc/enterprise/runtime.ts` – thin runtime wrapper over `@aoc-enterprise/runtime`
- `src/lib/aoc/compatibility/*` – temporary payload adapters

## Migrated Vertical Slice

Migrated slice: **governance action enforcement for billing + upload APIs**.

- `src/app/api/billing/create-checkout-session/route.ts` now calls `enforceRuntimeAuthorization` from `src/lib/aoc/enterprise/runtime`.
- `src/app/api/upload/route.ts` now calls `enforceRuntimeAuthorization` from the same boundary.

This bypasses direct product imports from `src/lib/security/governance-runtime` for this slice while preserving behavior.

## Legacy Runtime Quarantine

`src/lib/security/governance-runtime.ts` is explicitly marked as **LEGACY GOVERNANCE RUNTIME** with migration TODO comments. It remains for compatibility while additional routes are migrated.

## Remaining Compatibility Shims

Still active and intentionally retained:
- `src/lib/aoc/compatibility/legacy-policy-map.ts`
- `src/lib/aoc/compatibility/legacy-audit-map.ts`
- `src/lib/aoc/compatibility/legacy-delegation-map.ts`

## Remaining Drift / Debt

1. `Policy` + `Agent` shapes are still local compatibility types in `src/lib/aoc/protocol/types.ts`.
2. Copilot and other routes still import legacy security runtime/services directly.
3. `@aoc-enterprise/runtime` currently wraps existing governance implementation; future step is replacing internals with upstream enterprise package sources.

## Removal Roadmap

1. Continue route-by-route migration to `src/lib/aoc/enterprise/runtime`.
2. Replace remaining compatibility `Policy`/`Agent` with protocol contracts or enterprise-owned representations.
3. Restrict direct imports from `src/lib/security/*` in product layers via lint rules.
4. Swap local `file:` links to published or git-based package refs when multi-repo release flow is finalized.

## Future Publish / Package Strategy

Target progression:
1. Local `file:` links (current)
2. monorepo workspace links
3. git/tag or registry-published `@aoc/*` packages
4. remove TS path alias fallbacks once package publishing is stable

## Import Boundary Guardrail

Forbidden in product/API/SDK code:
- `@/lib/security/governance-runtime`
- `src/lib/security/governance-runtime`
- relative imports that resolve to `security/governance-runtime`

Allowed only for internal ownership:
- `src/aoc/enterprise/runtime/index.ts`
- `src/lib/security/governance-runtime.ts`

Enforced by: `npm run lint:aoc-boundaries` (also run inside `npm run lint`).

## Route Migration Policy

When migrating a route:
1. Keep PMFreak business rules in the route (feature gates, plan gating, ownership checks).
2. Replace legacy runtime imports with `@/lib/aoc/enterprise/runtime`.
3. Preserve deny payload and telemetry behavior.

Before:
- `import { enforceGovernanceAction } from "@/lib/security/governance-runtime";`

After:
- `import { enforceRuntimeAuthorization } from "@/lib/aoc/enterprise/runtime";`

## Current Migrated Routes

- `src/app/api/upload/route.ts`
- `src/app/api/billing/create-checkout-session/route.ts`
- `src/app/api/billing/create-portal-session/route.ts`
- `src/app/api/copilot/route.ts`

## Remaining Legacy Runtime Route Imports

- None in `src/app/api/*` after this pass.

Legacy runtime remains intentionally used internally by `src/aoc/enterprise/runtime/index.ts` and `src/lib/security/governance-runtime.ts` while enterprise internals are replaced incrementally.

## Legacy Runtime Collapse Status (May 15, 2026)

- Legacy runtime is still present as an internal compatibility implementation in:
  - `src/lib/security/governance-runtime.ts`
  - `src/aoc/enterprise/runtime/index.ts`
- PMFreak product/API code must consume runtime authorization through `src/lib/aoc/enterprise/runtime.ts`.
- `src/lib/aoc/enterprise/runtime.ts` intentionally exposes only:
  - `evaluateRuntimeAuthorization`
  - `enforceRuntimeAuthorization`

## Behavior-Based Testing Policy

- Prefer behavior/architecture contract tests over implementation text assertions.
- Required contract checks:
  - governed routes import `enforceRuntimeAuthorization`
  - product/API/SDK/test code does not directly import `security/governance-runtime`
  - `npm run lint:aoc-boundaries` passes
  - deny path preserves `denyResponse` semantics and metadata contract
- Avoid testing exact internal string layout in legacy runtime implementation.

## Remaining Legacy Runtime Internals

Kept for now as safety net while route migrations continue:
- `evaluateGovernanceAction` (decision construction + guard composition)
- `enforceGovernanceAction` (deny payload + approval side effects)
- `createApprovalRequestFromDecision`
- `explainGovernanceDecision`
- `GOVERNANCE_POLICY_REGISTRY`

Removal condition: only after all product/API callers are migrated to the AOC boundary and deny/approval behavior remains fully covered by behavior tests.

## Remaining Compatibility Type Consumers (`Policy` / `Agent`)

Current consumers are SDK-facing compatibility surfaces:
- `src/sdk/types.ts`
- `src/sdk/client.ts`

Removal path:
1. Replace SDK response typing with canonical protocol/enterprise contract types where available.
2. If canonical shapes differ, define PMFreak SDK-local DTO types (not protocol compatibility types) and map at boundary.
3. Remove `Policy` and `Agent` exports from `src/lib/aoc/protocol/types.ts` once callers are migrated.

## Test Migration Strategy

1. Replace brittle source-string assertions with boundary and behavior assertions.
2. Keep deterministic architecture checks for forbidden imports.
3. Keep deny-path contract checks for status/reason/event metadata shape.
4. Keep approval lifecycle behavior checks (`Already resolved`, `Expired`, etc.).

## Allowed vs Forbidden Imports

Allowed internal-only imports of legacy runtime:
- `src/lib/security/governance-runtime.ts`
- `src/aoc/enterprise/runtime/index.ts`

Forbidden outside internal ownership (product/API/SDK/tests):
- any import (static or dynamic) resolving to `security/governance-runtime`

Enforced by `scripts/lint-aoc-boundaries.mjs`.

## Next Cleanup Priorities

1. Finish migration of remaining governance-enforced routes to wrapper-only runtime calls.
2. Replace SDK `Policy`/`Agent` compatibility types with canonical or SDK-local DTO types.
3. Move more deny-semantics checks into runtime execution tests where fixture isolation permits.
4. Delete legacy runtime internals only when no direct callers remain and behavior coverage is complete.
