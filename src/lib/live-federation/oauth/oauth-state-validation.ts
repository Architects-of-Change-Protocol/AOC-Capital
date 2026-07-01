import type {
  OAuthProvider,
  OAuthStateValidationResult,
} from "../types/live-federation-types.js";

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

interface OAuthStateRecord {
  connectorId: string;
  provider: OAuthProvider;
  tenantId: string;
  workspaceId: string;
  createdAt: number;
  used: boolean;
}

const stateStore = new Map<string, OAuthStateRecord>();

export function registerOAuthState(
  state: string,
  connectorId: string,
  provider: OAuthProvider,
  tenantId: string,
  workspaceId: string,
): void {
  stateStore.set(state, {
    connectorId,
    provider,
    tenantId,
    workspaceId,
    createdAt: Date.now(),
    used: false,
  });
}

export function validateOAuthState(
  state: string,
  tenantId: string,
  workspaceId: string,
): OAuthStateValidationResult {
  const now = new Date().toISOString();
  const record = stateStore.get(state);

  if (!record) {
    return {
      valid: false,
      connectorId: "unknown",
      provider: "jira",
      tenantScope: tenantId,
      workspaceScope: workspaceId,
      expirationStatus: "unknown",
      replayRisk: "high",
      rejectionReasons: ["state not found — potential replay or CSRF attack"],
      governanceBoundaries: [
        "OAuth state validation enforces anti-replay semantics",
        "Unknown states are rejected at governance boundary",
      ],
      evidence: ["state token not found in active state store"],
      uncertainty: ["attacker may be probing with fabricated states"],
      checkedAt: now,
    };
  }

  if (record.used) {
    stateStore.delete(state);
    return {
      valid: false,
      connectorId: record.connectorId,
      provider: record.provider,
      tenantScope: tenantId,
      workspaceScope: workspaceId,
      expirationStatus: "valid",
      replayRisk: "high",
      rejectionReasons: ["state already consumed — replay attack detected"],
      governanceBoundaries: [
        "Consumed states are rejected to prevent callback replay",
      ],
      evidence: ["state token marked as already used"],
      uncertainty: [],
      checkedAt: now,
    };
  }

  const ageMs = Date.now() - record.createdAt;
  if (ageMs > STATE_EXPIRY_MS) {
    stateStore.delete(state);
    return {
      valid: false,
      connectorId: record.connectorId,
      provider: record.provider,
      tenantScope: tenantId,
      workspaceScope: workspaceId,
      expirationStatus: "expired",
      replayRisk: "low",
      rejectionReasons: [`state expired after ${Math.round(ageMs / 1000)}s (limit: ${STATE_EXPIRY_MS / 1000}s)`],
      governanceBoundaries: [
        "Expired OAuth states are rejected to prevent stale authorization reuse",
      ],
      evidence: [`state age: ${ageMs}ms`, `expiry limit: ${STATE_EXPIRY_MS}ms`],
      uncertainty: [],
      checkedAt: now,
    };
  }

  if (record.tenantId !== tenantId) {
    return {
      valid: false,
      connectorId: record.connectorId,
      provider: record.provider,
      tenantScope: tenantId,
      workspaceScope: workspaceId,
      expirationStatus: "valid",
      replayRisk: "high",
      rejectionReasons: ["state tenant mismatch — cross-tenant callback leakage detected"],
      governanceBoundaries: [
        "Tenant-bound state validation prevents cross-tenant callback leakage",
      ],
      evidence: [
        `expected tenant: ${record.tenantId}`,
        `received tenant: ${tenantId}`,
      ],
      uncertainty: [],
      checkedAt: now,
    };
  }

  if (record.workspaceId !== workspaceId) {
    return {
      valid: false,
      connectorId: record.connectorId,
      provider: record.provider,
      tenantScope: tenantId,
      workspaceScope: workspaceId,
      expirationStatus: "valid",
      replayRisk: "high",
      rejectionReasons: ["state workspace mismatch — invalid connector binding"],
      governanceBoundaries: [
        "Workspace-bound state validation prevents invalid connector binding",
      ],
      evidence: [
        `expected workspace: ${record.workspaceId}`,
        `received workspace: ${workspaceId}`,
      ],
      uncertainty: [],
      checkedAt: now,
    };
  }

  record.used = true;
  stateStore.delete(state);

  return {
    valid: true,
    connectorId: record.connectorId,
    provider: record.provider,
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    expirationStatus: "valid",
    replayRisk: "none",
    rejectionReasons: [],
    governanceBoundaries: [
      "State validated and consumed — anti-replay enforced",
      "Tenant and workspace boundaries confirmed",
    ],
    evidence: [
      "state token found and matched",
      "tenant and workspace verified",
      "state consumed to prevent reuse",
    ],
    uncertainty: [],
    checkedAt: now,
  };
}

export function purgeExpiredStates(): number {
  const cutoff = Date.now() - STATE_EXPIRY_MS;
  let purged = 0;
  for (const [key, record] of stateStore.entries()) {
    if (record.createdAt < cutoff) {
      stateStore.delete(key);
      purged++;
    }
  }
  return purged;
}
