/**
 * Regression tests for local-authority-bypass hardening (TRACK: Productionization & Governance).
 *
 * These tests assert source-code-level contracts that prevent PMFreak from acting as a
 * final authorization authority instead of delegating to the AOC Enterprise Runtime.
 *
 * They use fs.readFileSync checks (the same pattern as existing contract tests in this repo)
 * because the runtime pipeline requires a live database and is not unit-testable in isolation.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const capabilityFlow  = readFileSync("src/lib/security/capability-flow.ts", "utf8");
const accessGuards    = readFileSync("src/lib/security/access-guards.ts", "utf8");
const agentAccess     = readFileSync("src/lib/security/agent-access.ts", "utf8");
const serverAuth      = readFileSync("src/lib/security/server-authorization.ts", "utf8");
const governanceActions = readFileSync("src/lib/aoc/runtime/governance-actions.ts", "utf8");

// ── capability-flow.ts ────────────────────────────────────────────────────────

test("capability-flow: evaluateCapabilityAccess calls authorizeRuntimeAction, not local policy engine", () => {
  assert.match(capabilityFlow, /authorizeRuntimeAction/, "must call authorizeRuntimeAction");
  assert.match(capabilityFlow, /buildEnterpriseRuntimeRequest/, "must build runtime request");
  assert.doesNotMatch(capabilityFlow, /evaluatePolicyDecision/, "must not call local policy engine");
  assert.doesNotMatch(capabilityFlow, /resolveUserAocActorContext/, "must not resolve local actor context for policy eval");
});

test("capability-flow: evaluateCapabilityAccess has no try/catch fallback to local DB grants", () => {
  // The old bypass pattern: catch { ... evaluatePolicyDecision ... capability_grants }
  // After the fix there must be no capability_grants DB read inside evaluateCapabilityAccess.
  // We verify by checking the function has no catch block that queries capability_grants.
  const evalFn = capabilityFlow.slice(capabilityFlow.indexOf("export async function evaluateCapabilityAccess"));
  // The function must throw (fail closed) when the runtime denies, not fall back to DB.
  assert.match(evalFn, /throw new AccessDeniedError/, "must throw when runtime denies");
  // The old catch block queried capability_grants to allow access — must not exist.
  assert.doesNotMatch(
    evalFn.slice(0, 600),
    /from\("capability_grants"\)/,
    "evaluateCapabilityAccess must not read capability_grants as a local authority fallback",
  );
});

test("capability-flow: createCapabilityRequest uses runtime for auto-approval, not local policy engine", () => {
  // The old bypass: evaluatePolicyDecision was used to auto-approve grants locally.
  // After fix: authorizeRuntimeAction drives the auto-approval decision.
  assert.match(capabilityFlow, /runtimeDecision\.allowed/, "auto-approval must be gated on runtime decision");
  assert.doesNotMatch(capabilityFlow, /evaluation\.decision === "allow"/, "must not auto-approve on local policy evaluation result");
});

test("capability-flow: createCapabilityRequest fails closed when runtime is unavailable", () => {
  // Verify the null-runtime guard path sets status to 'denied'.
  assert.match(capabilityFlow, /runtimeDecision === null[\s\S]{0,40}denied/, "runtime_unavailable must produce denied status");
});

test("governance-actions: canonical PERMISSION_TO_GOVERNANCE_ACTION covers all sensitive permissions", () => {
  // After refactor, the canonical map lives in governance-actions.ts.
  // capability-flow.ts imports it; check the source of truth directly.
  const sensitivePermissions = [
    "manage_billing",
    "manage_workspace",
    "manage_members",
    "execute_ai_action",
    "manage_ai",
  ];
  for (const perm of sensitivePermissions) {
    assert.match(governanceActions, new RegExp(perm), `PERMISSION_TO_GOVERNANCE_ACTION must include ${perm}`);
  }
  // capability-flow.ts must import from governance-actions (no local copy allowed)
  assert.match(capabilityFlow, /from "@\/lib\/aoc\/runtime\/governance-actions"/, "capability-flow must import canonical action mapping");
});

// ── access-guards.ts ──────────────────────────────────────────────────────────

test("access-guards: requireAgentScope routes through authorizeRuntimeAction", () => {
  assert.match(accessGuards, /requireAgentScope/, "requireAgentScope must exist");
  assert.match(accessGuards, /authorizeRuntimeAction/, "must call authorizeRuntimeAction");
  assert.match(accessGuards, /buildEnterpriseRuntimeRequest/, "must build runtime request");
  // Must not use local RBAC policy evaluator
  assert.doesNotMatch(accessGuards, /defaultGovernancePolicyEvaluator/, "must not call local RBAC policy evaluator");
  assert.doesNotMatch(accessGuards, /evaluatePolicyDecision/, "must not call local policy engine");
});

test("access-guards: requireAgentScope fails closed — throws AccessDeniedError on denial", () => {
  const agentScopeFn = accessGuards.slice(accessGuards.indexOf("export async function requireAgentScope"));
  assert.match(agentScopeFn.slice(0, 1500), /throw new AccessDeniedError/, "must throw when runtime denies agent scope");
  assert.match(agentScopeFn.slice(0, 1500), /revoked_agent_access/, "must log security event on agent denial");
});

test("access-guards: authorizeGuard helper fails closed on runtime denial without local fallback", () => {
  // authorizeGuard must throw if decision.allowed is false — no alternative allow path.
  const guardFn = accessGuards.slice(accessGuards.indexOf("async function authorizeGuard"));
  assert.match(guardFn.slice(0, 1200), /if \(!decision\.allowed\)/, "must check allowed flag");
  assert.match(guardFn.slice(0, 1200), /throw new AccessDeniedError/, "must throw on denial");
  // There must be no else-branch that allows access via a local check.
  assert.doesNotMatch(guardFn.slice(0, 1200), /ROLE_PERMISSION_MAP/, "must not consult local RBAC map as fallback");
});

// ── agent-access.ts ───────────────────────────────────────────────────────────

test("agent-access: evaluateAgentAccess delegates final decision to authorizeRuntimeAction", () => {
  assert.match(agentAccess, /authorizeRuntimeAction/, "must call authorizeRuntimeAction");
  assert.match(agentAccess, /buildEnterpriseRuntimeRequest/, "must build runtime request");
  assert.match(agentAccess, /runtimeDecision\.allowed/, "final allow/deny must come from runtime decision");
  // Local DB grant is evidence, not authority.
  assert.match(agentAccess, /from\("ai_agent_scopes"\)/, "may read agent scopes as evidence");
  // But the scope alone must not produce 'allow' — runtime must confirm.
  assert.doesNotMatch(agentAccess, /return \{ decision: "allow"[\s\S]{0,5}\}/, "must not allow without runtime confirmation");
});

test("agent-access: requireAgentScope throws when evaluateAgentAccess returns non-allow", () => {
  const requireFn = agentAccess.slice(agentAccess.indexOf("export async function requireAgentScope"));
  assert.match(requireFn.slice(0, 300), /throw new Error/, "must throw on non-allow decision");
  assert.match(requireFn.slice(0, 300), /agent_access_/, "error message must reference agent_access_");
});

// ── server-authorization.ts ───────────────────────────────────────────────────

test("server-authorization: evaluateCapability routes through authorizeRuntimeAction", () => {
  assert.match(serverAuth, /authorizeRuntimeAction/, "must call authorizeRuntimeAction");
  assert.match(serverAuth, /buildEnterpriseRuntimeRequest/, "must build runtime request");
  assert.doesNotMatch(serverAuth, /evaluatePolicyDecision/, "must not run local policy engine");
  assert.doesNotMatch(serverAuth, /ROLE_PERMISSION_MAP/, "must not consult local RBAC map");
});

test("server-authorization: fails closed — throws AccessDeniedError when runtime denies", () => {
  assert.match(serverAuth, /throw new AccessDeniedError/, "must throw AccessDeniedError on denial");
  assert.doesNotMatch(serverAuth, /return.*allowed.*true.*fallback/, "must not have a fallback allow path");
});

// ── cross-cutting: no broad local-authority bypass ────────────────────────────

test("capability-flow does not import from policy-engine (legacy shim must not be re-introduced)", () => {
  assert.doesNotMatch(capabilityFlow, /from "@\/lib\/security\/policy-engine"/, "must not import local policy-engine shim");
  assert.doesNotMatch(capabilityFlow, /from "@\/lib\/aoc\/adapters\/policy-evaluation"/, "must not import local policy-evaluation adapter directly");
});

test("local DB grants are evidence, not authority: runtime call always precedes grant creation in capability-flow", () => {
  // After the fix, every capability_grants insert must be gated on runtimeDecision.allowed.
  const insertIdx = capabilityFlow.indexOf('from("capability_grants").insert');
  assert.ok(insertIdx !== -1, "capability_grants insert must exist");
  // Look back up to 600 chars to find the runtimeDecision gate (the if-block wrapping the insert).
  const precedingCtx = capabilityFlow.slice(Math.max(0, insertIdx - 600), insertIdx);
  assert.match(precedingCtx, /runtimeDecision/, "capability_grants insert must be preceded by runtime decision check");
});
