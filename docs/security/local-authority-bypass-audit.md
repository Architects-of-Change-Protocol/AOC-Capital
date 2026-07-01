# Local Authority Bypass Audit

**Track:** Productionization & Governance Hardening  
**Prompt:** Eliminate Remaining Local Authority Bypasses  
**Date:** 2026-05-19  
**Status:** Hardening pass complete. Follow-up items documented below.

---

## Objective

Identify and eliminate all locations where PMFreak may be making final authorization decisions
locally rather than delegating to the AOC Enterprise Runtime as the sovereign authority.

---

## Files Inspected

| File | Category |
|------|----------|
| `src/lib/security/access-guards.ts` | Primary auth guards |
| `src/lib/security/agent-access.ts` | Agent scope evaluation |
| `src/lib/security/capability-flow.ts` | Capability request/grant flow |
| `src/lib/security/server-authorization.ts` | Route-level auth helpers |
| `src/lib/security/rbac.ts` | Role/permission matrix |
| `src/lib/security/policy-engine.ts` | Legacy shim (re-export) |
| `src/lib/security/agent-attestation.ts` | Agent token verification |
| `src/lib/security/telemetry.ts` | Security event logging |
| `src/lib/security/deny-response.ts` | Unified denial helper |
| `src/lib/security/governance-runtime.ts` | Legacy shim (re-export) |
| `src/lib/aoc/enterprise/authorization.ts` | Runtime delegation entrypoint |
| `src/lib/aoc/pmfreak-runtime-consumer.ts` | Runtime request builder |
| `src/lib/aoc/adapters/policy-evaluation.ts` | PolicyEvaluatorPort adapter |
| `src/lib/aoc/adapters/access-verification.ts` | AccessVerificationPort adapter |
| `src/aoc/enterprise/runtime/governance-core.ts` | Governance policy registry |
| `src/aoc/enterprise/runtime/delegated-capabilities.ts` | Delegation chain logic |
| `src/aoc/enterprise/runtime/execution-grants.ts` | Single-use execution grants |
| `src/app/(protected)/capabilities/actions.ts` | Server actions for capabilities |
| `src/app/(protected)/playground/actions.ts` | Playground demo actions |
| `src/app/api/sdk/capabilities/requests/route.ts` | SDK capability request API |
| `src/app/api/sdk/policies/evaluate/route.ts` | Policy simulation API |
| `src/app/api/runtime/authority/route.ts` | Runtime authority view |
| `src/app/api/copilot/route.ts` | Copilot agent route |
| `src/app/api/billing/create-checkout-session/route.ts` | Billing checkout route |

---

## Risky Patterns Found

### CRITICAL — Fixed in this prompt

#### 1. `evaluateCapabilityAccess` — local DB grant fallback overrode runtime denial

**File:** `src/lib/security/capability-flow.ts` (lines 40–61, pre-fix)  
**Severity:** Critical  
**Description:**  
`evaluateCapabilityAccess` called `requireProjectPermission` or `requireWorkspaceRole` (both of
which invoke `authorizeRuntimeAction`) inside a `try` block. When the runtime **denied** access,
an `AccessDeniedError` was thrown and **caught** by the `catch` block. The catch block then
performed a direct Supabase query on `capability_grants` and called `evaluatePolicyDecision`
(the local adapter) as the final authority. If the local policy returned `"allow"`, access was
granted — overriding the runtime's explicit denial.

This created the dangerous pattern:

```
runtime denies
→ catch block runs
→ local DB grant found
→ evaluatePolicyDecision returns "allow"
→ access granted (bypassing runtime)
```

**Fix applied:**  
Replaced `try/catch` with a direct `authorizeRuntimeAction` call. Local DB grant evidence is now
consumed by the runtime through its registered `PmfreakPolicyEvaluatorAdapter` (the
`PolicyEvaluatorPort`). If the runtime throws (unavailable), the function throws
`AccessDeniedError("runtime_unavailable")` — fail closed. No local fallback.

---

#### 2. `createCapabilityRequest` — local `evaluatePolicyDecision` drove auto-approval of grants

**File:** `src/lib/security/capability-flow.ts` (lines 18–38, pre-fix)  
**Severity:** Critical  
**Description:**  
`createCapabilityRequest` called `evaluatePolicyDecision` (the local adapter) to evaluate whether
a capability request should be immediately approved. If the local policy returned `"allow"`, a
`capability_grants` row was inserted directly — without any call to `authorizeRuntimeAction`.
This allowed an actor to obtain a capability grant purely through local policy evaluation,
bypassing the AOC Enterprise Runtime entirely.

**Fix applied:**  
Replaced `evaluatePolicyDecision` with `authorizeRuntimeAction`. Auto-approval is now gated on
`runtimeDecision.allowed`. If the runtime is unavailable (throws), `runtimeDecision` is set to
`null` and the request status is set to `"denied"` — fail closed. If the runtime returns a
denial with a `requiredApprovalType`, the request is set to `"pending"` for human review.

---

### HIGH — Assessed, partially mitigated

#### 3. `decideCapabilityRequestAction` — admin-approved grants not runtime-reviewed for content

**File:** `src/app/(protected)/capabilities/actions.ts` (lines 31–34)  
**Severity:** High  
**Fixed in this prompt:** No — documented as follow-up  
**Description:**  
When an owner/admin approves a pending capability request, `requireWorkspaceRole` is called (which
invokes `authorizeRuntimeAction` to verify the admin's own workspace role). However, the grant row
is then inserted into `capability_grants` without a separate runtime call to authorize the grant
content (target resource, permission, expiry) against current policies.

**Risk:** An admin could approve a request for a resource or permission that a policy update has
since restricted. The grant would be persisted without runtime validation at time of approval.

**Mitigation in place:** `requireWorkspaceRole` enforces runtime authorization for the admin's
action. The grant records the `granted_by_user_id` for audit. The `capability_grants` table is
subject to RLS. This is an admin-only path.

**Recommended follow-up:** Add a `authorizeRuntimeAction` call at grant-creation time in
`decideCapabilityRequestAction` to validate the grant content against current runtime policies
before persisting.

---

#### 4. `evaluatePolicyDecision` called from playground `evaluatePolicyAction`

**File:** `src/app/(protected)/playground/actions.ts` (line 13)  
**Severity:** Low (playground only)  
**Fixed in this prompt:** No — allowlisted  
**Description:**  
The playground calls `evaluatePolicyDecision` directly for demo/UX purposes. The result is used
only to redirect the user to a result page — it does not create grants or authorize real actions.

**Risk:** Low. No grant creation or access decision flows from this path. However, if a UI
consumer ever treated this result as authoritative, it would be a bypass.

**Mitigation in place:** The `sdk/policies/evaluate/route.ts` returns `authoritative: false`
and `decisionSource: "policy-simulation"`. The playground action does not create grants.

**Recommended follow-up:** Add a comment to `evaluatePolicyAction` making it explicit that the
result is non-authoritative and must not be treated as a runtime authorization decision.

---

### MEDIUM — Assessed, no fix required

#### 5. `requireWorkspaceRole` in `access-guards.ts` — local DB role lookup after runtime auth

**File:** `src/lib/security/access-guards.ts` (lines 116–122)  
**Severity:** Medium  
**Fixed in this prompt:** No — not a bypass  
**Description:**  
After the runtime authorizes workspace membership (`requireWorkspaceMembership`), the
`requireWorkspaceRole` function performs a local DB read to retrieve the user's role, then checks
`if (!allowedRoles.includes(ctx.role))` as an additional gate. This is a local check that can
**deny** access even after runtime authorization, but cannot independently **allow** it.

**Risk:** The local role check is additive restriction, not a bypass. It cannot grant access that
the runtime denied.

**No fix required.** Local role checks used for additional restriction (deny-only) are acceptable.

---

#### 6. `requireWorkspaceRole` in `server-authorization.ts` delegates to `evaluateCapability`

**File:** `src/lib/security/server-authorization.ts` (lines 30–32)  
**Severity:** Low  
**Fixed in this prompt:** No — already correct  
**Description:**  
`requireWorkspaceRole` calls `evaluateCapability`, which calls `authorizeRuntimeAction`. The
`_allowedRoles` parameter is unused — the runtime is the sole authority.

**Risk:** None. This is a clean delegation.

---

### LOW — Comment / naming issues

#### 7. Duplicate `GOVERNANCE_ACTION_BY_PERMISSION` map in three files

**Files:** `src/lib/security/access-guards.ts`, `src/lib/security/agent-access.ts`,
`src/lib/security/server-authorization.ts` (as `ACTION_BY_PERMISSION`)  
**Severity:** Low  
**Fixed in this prompt:** No — not a bypass risk  
**Description:**  
Three files define identical or near-identical `Permission → GovernanceAction` mappings locally.
Divergence could cause a route to map a permission to a different governance action than others.

**Recommended follow-up:** Export a single canonical `PERMISSION_TO_GOVERNANCE_ACTION` map from a
shared location (e.g., `src/lib/aoc/pmfreak-runtime-consumer.ts` or `src/lib/security/rbac.ts`)
and import it in all three files.

---

## Notes on `requireAgentScope`

`requireAgentScope` exists in two files:

1. **`src/lib/security/access-guards.ts`** — the primary guard used by API routes. Calls
   `authorizeRuntimeAction` directly. Fails closed. Logs `revoked_agent_access` on denial.
   **No bypass. Correct.**

2. **`src/lib/security/agent-access.ts`** — exports a `requireAgentScope` wrapper around
   `evaluateAgentAccess`. The `evaluateAgentAccess` function reads agent status and scope from
   Supabase (evidence), then calls `authorizeRuntimeAction` for the final decision. The local
   DB reads are evidence only — the runtime makes the allow/deny call. **No bypass. Correct.**

The `evaluateAgentAccess` local DB reads (`ai_agents`, `ai_agent_scopes`) that return early with
`"deny"` or `"no_scope"` before the runtime call are acceptable: they are fail-closed early
returns (deny, not allow) for clearly invalid agent states (agent not found, revoked, disabled,
no matching scope). They cannot grant access — only deny it earlier.

---

## Notes on Local DB Grants

Local `capability_grants` DB reads are evidence that the runtime's `PolicyEvaluatorPort` adapter
consumes. After the fix to `capability-flow.ts`:

- `evaluateCapabilityAccess` no longer reads `capability_grants` directly — the runtime adapter
  does so internally.
- `createCapabilityRequest` creates grants only when `runtimeDecision.allowed` is true.
- `decideCapabilityRequestAction` creates grants after admin approval (see HIGH finding #3).

The pattern **local DB grant → final allow** has been eliminated from `capability-flow.ts`.

---

## Notes on Route-Level Authorization

API routes and server actions reviewed:

| Route | Auth Method | Status |
|-------|-------------|--------|
| `copilot/route.ts` | `verifyAgentAttestation` + `requireAgentScope` | Correct |
| `billing/create-checkout-session/route.ts` | `authorizeRuntimeAction("billing.manage")` | Correct |
| `sdk/capabilities/requests/route.ts` | `createCapabilityRequest` (now runtime-gated) | Fixed |
| `sdk/policies/evaluate/route.ts` | `evaluatePolicyDecision` (non-authoritative, labeled) | Allowlisted |
| `governance/approvals/[id]/approve/route.ts` | `requireGovernancePermission` → runtime | Correct |
| `governance/delegations/issue/route.ts` | Delegation rules via enterprise runtime | Correct |
| `capabilities/actions.ts` `decideCapabilityRequestAction` | `requireWorkspaceRole` → runtime | See HIGH #3 |

No route independently implements capability logic — all delegate to shared runtime enforcement
helpers.

---

## Notes on Fallback Behavior

Pre-fix fallback patterns that allowed access:

| Location | Fallback type | Status |
|----------|---------------|--------|
| `capability-flow.ts` `evaluateCapabilityAccess` catch block | Local DB grant allow | **Eliminated** |
| `capability-flow.ts` `createCapabilityRequest` `evaluatePolicyDecision` | Local policy auto-approve | **Eliminated** |

Post-fix fallback behavior:

| Location | Fallback type | Behavior |
|----------|---------------|----------|
| `evaluateCapabilityAccess` catch | Runtime unavailable | Throws `AccessDeniedError("runtime_unavailable")` — fail closed |
| `createCapabilityRequest` catch | Runtime unavailable | `runtimeDecision = null` → `status = "denied"` — fail closed |
| `authorizeGuard` in `access-guards.ts` | Runtime denial | Throws `AccessDeniedError` — fail closed |
| `requireAgentScope` in `access-guards.ts` | Runtime denial | Throws `AccessDeniedError`, logs `revoked_agent_access` — fail closed |

---

## Remaining Follow-Up Items

1. **HIGH**: Add `authorizeRuntimeAction` call at grant-creation time in
   `decideCapabilityRequestAction` (`capabilities/actions.ts`) to validate grant content against
   current runtime policies at the moment of admin approval.

2. **MEDIUM**: Consolidate the three duplicate `Permission → GovernanceAction` mappings into a
   single exported constant to prevent drift.

3. **LOW**: Add an explicit non-authoritative comment to the playground `evaluatePolicyAction`
   to guard against future misuse.

4. **LOW**: Consider wiring `check:no-local-auth-bypass` into the CI `lint` script once the
   allowlist has been validated in staging.

---

## What Changed in This Prompt

| File | Change |
|------|--------|
| `src/lib/security/capability-flow.ts` | Rewrote `evaluateCapabilityAccess` to delegate directly to `authorizeRuntimeAction` without local DB fallback. Replaced `evaluatePolicyDecision` auto-approval in `createCapabilityRequest` with `authorizeRuntimeAction`. Both paths now fail closed on runtime error. |
| `tests/local-authority-bypass-hardening.test.mjs` | New regression test file asserting source-code-level contracts: no local policy engine in critical auth files, fail-closed patterns enforced, runtime delegation required. |
| `scripts/check-no-local-authority-bypass.mjs` | New governance guard script that flags forbidden local-authority-bypass patterns across `src/`. |
| `package.json` | Added `check:no-local-auth-bypass` script entry. |
| `docs/security/local-authority-bypass-audit.md` | This file. |
