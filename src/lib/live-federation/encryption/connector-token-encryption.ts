import type {
  OAuthProvider,
  ConnectorTokenState,
  ConnectorTokenPersistenceResult,
} from "../types/live-federation-types.js";

export interface TokenEncryptionContract {
  connectorId: string;
  provider: OAuthProvider;
  wrappingRequired: boolean;
  encryptionAlgorithmExpectation: string;
  keyRotationExpected: boolean;
  keyRotationIntervalDays: number;
  kmsIntegrationRequired: boolean;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
}

export interface TokenWrappingSemantics {
  connectorId: string;
  provider: OAuthProvider;
  wrappedTokenOpaque: true;
  encryptionBoundaryEnforced: boolean;
  keyOwnership: "tenant_scoped" | "platform_managed";
  governanceBoundaries: string[];
  evidence: string[];
  uncertainty: string[];
}

export function buildTokenEncryptionContract(
  connectorId: string,
  provider: OAuthProvider,
  tenantId: string,
  workspaceId: string,
): TokenEncryptionContract {
  return {
    connectorId,
    provider,
    wrappingRequired: true,
    encryptionAlgorithmExpectation: "AES-256-GCM",
    keyRotationExpected: true,
    keyRotationIntervalDays: 90,
    kmsIntegrationRequired: true,
    governanceBoundaries: [
      "tokens must be wrapped with AES-256-GCM or equivalent",
      "encryption keys must not be co-located with encrypted tokens",
      "key rotation must not break session continuity",
      "encryption must be tenant-scoped",
      "decryption must be server-side only",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      "encryption contract defined at runtime contract layer",
      "no live KMS integration — contract semantics only",
    ],
    uncertainty: [
      "live encryption requires KMS or equivalent key management integration",
      "key rotation cadence depends on operational security policy",
    ],
  };
}

export function buildTokenWrappingSemantics(
  connectorId: string,
  provider: OAuthProvider,
): TokenWrappingSemantics {
  return {
    connectorId,
    provider,
    wrappedTokenOpaque: true,
    encryptionBoundaryEnforced: false,
    keyOwnership: "platform_managed",
    governanceBoundaries: [
      "wrapped token must be opaque to all non-authorized consumers",
      "wrapping key must be platform-managed with tenant-scoped access",
      "wrapped token must never traverse client-side boundaries",
    ],
    evidence: [
      "token wrapping semantics defined at contract layer",
      "live wrapping requires KMS integration",
    ],
    uncertainty: [
      "wrapping enforcement depends on persistence layer implementation",
    ],
  };
}

export function evaluateTokenEncryptionSurvivability(
  token: ConnectorTokenState,
): { survivable: boolean; blockers: string[]; evidence: string[] } {
  const blockers: string[] = [];

  if (!token.encrypted && token.present) {
    blockers.push("token present but unencrypted — encryption boundary not enforced");
  }

  if (token.encryptionStatus === "encryption_failed") {
    blockers.push("encryption failed — token must not be persisted");
  }

  return {
    survivable: blockers.length === 0,
    blockers,
    evidence: [
      `encryption status: ${token.encryptionStatus}`,
      `encrypted: ${token.encrypted}`,
      `present: ${token.present}`,
    ],
  };
}

export function buildTokenPersistenceResult(
  connectorId: string,
  provider: OAuthProvider,
  token: ConnectorTokenState,
  tenantId: string,
  workspaceId: string,
): ConnectorTokenPersistenceResult {
  const now = new Date().toISOString();
  const encryptedAtRest = token.encrypted;
  const replaySafe = encryptedAtRest && !token.clientSideExposed;
  const survivabilitySafe = encryptedAtRest && token.encryptionStatus !== "encryption_failed";
  const governanceSafe = encryptedAtRest && !token.clientSideExposed && !!tenantId && !!workspaceId;

  return {
    connectorId,
    provider,
    persistenceStatus: encryptedAtRest ? "persisted" : "pending",
    encryptedAtRest,
    replaySafe,
    survivabilitySafe,
    governanceSafe,
    governanceBoundaries: [
      "tokens must be encrypted before persistence",
      "persistence layer must be tenant-scoped",
      "persistence must not expose tokens in query logs",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `encryptedAtRest: ${encryptedAtRest}`,
      `replaySafe: ${replaySafe}`,
      `governanceSafe: ${governanceSafe}`,
    ],
    uncertainty: [
      "persistence semantics are contract-layer only — live DB persistence requires implementation",
    ],
    checkedAt: now,
  };
}
