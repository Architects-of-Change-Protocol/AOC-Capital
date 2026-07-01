# Runtime-First SDK Route Hardening

**Track:** Productionization & Governance  
**Date:** 2026-05-19  
**Status:** Complete

## Summary

This document records the hardening pass that eliminated remaining partial local authorization authority patterns from PMFreak's SDK routes and capability issuance layer. After this pass, the AOC Enterprise Runtime is the sole terminal authority for all governance-sensitive operations. PMFreak no longer makes final allow/deny decisions locally.

---

## Enforcement Pattern

### Before

```
request → requireAuth() → [optional: requireWorkspaceRole(["owner","admin"])] → DB query → response
```

SDK governance reads had no runtime call at all. Mutations used local role checks as the terminal gate, with the runtime (if called at all) used only for audit logging rather than as an enforcement boundary.

### After

```
request → requireAuth() → authorizeRuntimeAction(SDK_GOVERNANCE_ACTIONS.X) → decision.allowed? → DB query → { data, decisionId }
```

Every governance-sensitive route now:
1. Calls `authorizeRuntimeAction` with a canonical `SDK_GOVERNANCE_ACTIONS` constant before touching the DB.
2. Returns a 403 with the runtime's denial reason when `!decision.allowed`.
3. Propagates `decisionId` in the response body for lineage tracing.

---

## Routes Hardened

| Route | Method | Action Before | Runtime Action After | Decision Lineage |
|---|---|---|---|---|
| `sdk/agents` | GET | auth only | `AGENTS_READ` → `ai.manage` | ✓ |
| `sdk/agents` | POST | `requireWorkspaceRole(["owner","admin"])` | `AGENTS_MANAGE` → `ai.manage` | ✓ |
| `sdk/agents/[id]` | PATCH | `requireWorkspaceRole(["owner","admin"])` | `AGENTS_MANAGE` → `ai.manage` | ✓ |
| `sdk/agents/scopes` | POST | auth only + agent scope check | `AGENTS_MANAGE` → `ai.manage` | ✓ |
| `sdk/audit/agents` | GET | auth only | `AUDIT_READ` → `executive.view` | ✓ |
| `sdk/audit/capabilities` | GET | auth only | `AUDIT_READ` → `executive.view` | ✓ |
| `sdk/audit/resources` | GET | auth only | `AUDIT_READ` → `executive.view` | ✓ |
| `sdk/audit/timeline` | GET | auth only | `AUDIT_READ` → `executive.view` | ✓ |
| `sdk/capabilities/grants` | GET | auth only | `CAPABILITIES_READ` → `executive.view` | ✓ |
| `sdk/capabilities/requests` | GET | auth only | `CAPABILITIES_READ` → `executive.view` | ✓ |
| `sdk/policies` | GET | auth only | `POLICIES_READ` → `executive.view` | ✓ |
| `sdk/policies` | POST | `requireWorkspaceRole(["owner","admin"])` | `POLICIES_MANAGE` → `ai.manage` | ✓ |
| `sdk/policies/[id]` | PATCH | `requireWorkspaceRole(["owner","admin"])` | `POLICIES_MANAGE` → `ai.manage` | ✓ |

---

## Canonical Action Mapping (`src/lib/aoc/runtime/governance-actions.ts`)

A new canonical module was introduced as the single source of truth for all governance action mappings. Previously, four different files each maintained their own copy of the `Permission → GovernanceAction` map.

**`PERMISSION_TO_GOVERNANCE_ACTION`** — maps PMFreak permissions to valid `GovernanceAction` values from `GOVERNANCE_POLICY_REGISTRY`.

**`CAPABILITY_PERMISSION_TO_GOVERNANCE_ACTION`** — maps capability-level permission strings.

**`SDK_GOVERNANCE_ACTIONS`** — maps SDK route operation categories to canonical governance actions:

```typescript
AGENTS_READ:          "ai.manage"        // requiredPermission: manage_ai
AGENTS_MANAGE:        "ai.manage"
AUDIT_READ:           "executive.view"   // requiredPermission: view_executive
CAPABILITIES_READ:    "executive.view"
CAPABILITIES_MANAGE:  "workspace.manage" // requiredPermission: manage_workspace
POLICIES_READ:        "executive.view"
POLICIES_MANAGE:      "ai.manage"
```

All previously duplicated maps in `access-guards.ts`, `agent-access.ts`, `server-authorization.ts`, and `capability-flow.ts` now import from this canonical module.

---

## Capability Issuance (`capabilities/actions.ts`)

`decideCapabilityRequestAction` and `revokeCapabilityGrantAction` previously used `requireWorkspaceRole(["owner","admin"])` as the terminal authority gate. Both functions now:

1. Call `authorizeRuntimeAction(SDK_GOVERNANCE_ACTIONS.CAPABILITIES_MANAGE)` before any DB write.
2. Return early with an authorization error on `!decision.allowed`.
3. Include `runtimeDecisionId` and `runtimeAuthoritative: true` in the audit event `detail` payload for lineage.

The `requireWorkspaceRole` import was removed entirely from `capabilities/actions.ts`.

---

## Audit Taxonomy Fix

**Bug:** `governance-core.ts` logged allowed decisions with `policy.denyEventType` when `result.allowed` was true. For example, an allowed `members.manage` action would emit a `"governance_violation"` audit event.

**Root cause:** The ternary `result.allowed ? "governance_violation" : policy.denyEventType` was inverted.

**Fix:**
- Added `"governance_action_allowed"` to `AocGovernanceEventType` in `src/aoc/protocol/ports/security-audit.ts`.
- Added `"governance_action_allowed"` to `SecurityEventType` in `src/lib/security/telemetry.ts`.
- Changed `governance-core.ts` to use `allowedEventType = "governance_action_allowed"` for allowed decisions.

---

## Governance Guard (`scripts/check-no-local-authority-bypass.mjs`)

The guard was expanded with two new check categories:

**SDK governance route enforcement:** Validates that every file in `SDK_GOVERNANCE_ROUTES` calls `authorizeRuntimeAction`, checks `decision.allowed`, uses `SDK_GOVERNANCE_ACTIONS` constants, and does not use `requireWorkspaceRole` as terminal authority. Failure is an error (CI-blocking).

**Existing rules retained:**
- `evaluatePolicyDecision` outside allowlist → error
- `defaultGovernancePolicyEvaluator` outside rbac.ts → error
- Catch block returning allow → error
- `capability_grants` insert without runtime auth → warning
- Critical auth files missing `authorizeRuntimeAction` → error

---

## Regression Tests

**`tests/runtime-first-sdk-enforcement.test.mjs`** — 27 conformance tests covering:
- Canonical governance-actions module exports and SDK_GOVERNANCE_ACTIONS coverage
- Runtime-before-DB ordering for every SDK read route
- Canonical action constant used in every route
- `requireWorkspaceRole` absent from all hardened routes
- `capabilities/actions.ts` runtime before grant insert, `runtimeDecisionId` in audit, `requireWorkspaceRole` removed
- Decision lineage (`decisionId`) in key route responses
- Audit taxonomy: `governance_action_allowed` in both type unions
- `governance-core.ts` no longer emits `governance_violation` for allowed decisions
- All governance read routes check `decision.allowed`

**`tests/local-authority-bypass-hardening.test.mjs`** — updated to read canonical `governance-actions.ts` for permission coverage tests, and assert that `capability-flow.ts` imports from the canonical module.

---

## Remaining Risks

| Item | Severity | Notes |
|---|---|---|
| `sdk/agents/evaluate` route has no top-level auth check | Low | `evaluateAgentAccess` (called inside) delegates to runtime; runtime is the terminal authority. Adding an explicit top-level check would improve defense-in-depth. |
| `src/lib/aoc/providers/governance.ts` `evaluateCapabilityPolicy` | Low | Fully local policy decision engine. Used only as the `PolicyEvaluatorPort` adapter consumed by the runtime — the runtime, not this adapter, is the authority. |
| `egress-policy.ts` local allow returns | Info | AI egress ACL, not an authorization gate. Warnings are expected and correct. |

---

## Files Changed

- `src/lib/aoc/runtime/governance-actions.ts` — new canonical module
- `src/lib/security/capability-flow.ts` — imports canonical map
- `src/lib/security/access-guards.ts` — imports canonical map
- `src/lib/security/agent-access.ts` — imports canonical map
- `src/lib/security/server-authorization.ts` — imports canonical map
- `src/app/api/sdk/agents/route.ts` — runtime-first enforcement
- `src/app/api/sdk/agents/[id]/route.ts` — runtime-first enforcement
- `src/app/api/sdk/agents/scopes/route.ts` — runtime-first enforcement
- `src/app/api/sdk/audit/agents/route.ts` — runtime-first enforcement
- `src/app/api/sdk/audit/capabilities/route.ts` — runtime-first enforcement
- `src/app/api/sdk/audit/resources/route.ts` — runtime-first enforcement
- `src/app/api/sdk/audit/timeline/route.ts` — runtime-first enforcement
- `src/app/api/sdk/capabilities/grants/route.ts` — runtime-first enforcement
- `src/app/api/sdk/capabilities/requests/route.ts` — runtime-first enforcement
- `src/app/api/sdk/policies/route.ts` — runtime-first enforcement
- `src/app/api/sdk/policies/[id]/route.ts` — runtime-first enforcement
- `src/app/(protected)/capabilities/actions.ts` — runtime terminal authority, requireWorkspaceRole removed
- `src/aoc/protocol/ports/security-audit.ts` — governance_action_allowed added
- `src/lib/security/telemetry.ts` — governance_action_allowed added
- `src/aoc/enterprise/runtime/governance-core.ts` — audit taxonomy fix
- `tests/runtime-first-sdk-enforcement.test.mjs` — new conformance tests
- `tests/local-authority-bypass-hardening.test.mjs` — canonical module assertions added
- `scripts/check-no-local-authority-bypass.mjs` — SDK route rules added
