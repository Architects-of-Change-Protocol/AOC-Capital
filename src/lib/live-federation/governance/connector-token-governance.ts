import type {
  OAuthProvider,
  ConnectorTokenState,
} from "../types/live-federation-types.js";

export interface TokenGovernanceResult {
  connectorId: string;
  provider: OAuthProvider;
  compliant: boolean;
  violations: string[];
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
  checkedAt: string;
}

const TOKEN_GOVERNANCE_BOUNDARIES = [
  "tokens must never be exposed client-side",
  "tokens must not appear in application logs",
  "tokens must not appear in error messages",
  "tokens must not be transmitted in query parameters",
  "tokens must be encrypted at rest",
  "tokens must be tenant and workspace scoped",
  "token propagation must be governance-safe",
];

export function evaluateTokenGovernance(token: ConnectorTokenState): TokenGovernanceResult {
  const now = new Date().toISOString();
  const violations: string[] = [];

  if (token.clientSideExposed) {
    violations.push("CRITICAL: token is client-side exposed");
  }

  if (token.present && !token.encrypted) {
    violations.push("token is present but not encrypted — violates encryption-at-rest contract");
  }

  if (token.encryptionStatus === "encryption_failed") {
    violations.push("token encryption failed — token must not be persisted until resolved");
  }

  if (!token.tenantScope) {
    violations.push("token missing tenant scope — isolation contract violated");
  }

  if (!token.workspaceScope) {
    violations.push("token missing workspace scope — isolation contract violated");
  }

  return {
    connectorId: token.connectorId,
    provider: token.provider,
    compliant: violations.length === 0,
    violations,
    governanceBoundaries: TOKEN_GOVERNANCE_BOUNDARIES,
    tenantScope: token.tenantScope,
    workspaceScope: token.workspaceScope,
    evidence: [
      `token present: ${token.present}`,
      `encrypted: ${token.encrypted}`,
      `encryptionStatus: ${token.encryptionStatus}`,
      `clientSideExposed: ${token.clientSideExposed}`,
      `tenantScope: ${token.tenantScope}`,
      `workspaceScope: ${token.workspaceScope}`,
    ],
    uncertainty: [
      "log safety requires external log governance validation",
      "query parameter safety requires HTTP layer governance validation",
    ],
    checkedAt: now,
  };
}

export function assertTokenGovernanceCompliance(token: ConnectorTokenState): void {
  const result = evaluateTokenGovernance(token);
  if (!result.compliant) {
    throw new Error(
      `Token governance violation for connector ${token.connectorId}: ${result.violations.join("; ")}`
    );
  }
}
