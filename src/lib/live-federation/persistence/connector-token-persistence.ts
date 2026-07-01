import type {
  OAuthProvider,
  ConnectorTokenState,
  ConnectorTokenPersistenceResult,
} from "../types/live-federation-types.js";

export interface TokenPersistenceContract {
  connectorId: string;
  provider: OAuthProvider;
  storageBackend: "encrypted_db" | "encrypted_kv" | "not_configured";
  encryptionRequired: true;
  tenantScopedStorage: boolean;
  workspaceScopedStorage: boolean;
  replaySafeStorage: boolean;
  survivabilitySafeStorage: boolean;
  governanceBoundaries: string[];
  tenantScope: string;
  workspaceScope: string;
  evidence: string[];
  uncertainty: string[];
}

export function buildTokenPersistenceContract(
  connectorId: string,
  provider: OAuthProvider,
  tenantId: string,
  workspaceId: string,
): TokenPersistenceContract {
  return {
    connectorId,
    provider,
    storageBackend: "not_configured",
    encryptionRequired: true,
    tenantScopedStorage: true,
    workspaceScopedStorage: true,
    replaySafeStorage: true,
    survivabilitySafeStorage: true,
    governanceBoundaries: [
      "tokens must be encrypted before writing to any storage backend",
      "storage must enforce tenant-scoped row-level isolation",
      "storage queries must never log token values",
      "storage must support token expiry and cleanup",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      "persistence contract defined at semantic layer",
      "no live DB persistence — contract semantics only",
    ],
    uncertainty: [
      "live persistence requires encrypted DB implementation",
      "storage backend selection depends on deployment environment",
    ],
  };
}

export function evaluateTokenPersistenceReadiness(
  token: ConnectorTokenState,
  tenantId: string,
  workspaceId: string,
): ConnectorTokenPersistenceResult {
  const now = new Date().toISOString();
  const encryptedAtRest = token.encrypted && token.encryptionStatus === "encrypted";
  const replaySafe = encryptedAtRest && !token.clientSideExposed;
  const survivabilitySafe = encryptedAtRest;
  const governanceSafe = encryptedAtRest && !token.clientSideExposed && !!tenantId && !!workspaceId;

  return {
    connectorId: token.connectorId,
    provider: token.provider,
    persistenceStatus: encryptedAtRest ? "persisted" : token.present ? "pending" : "not_applicable",
    encryptedAtRest,
    replaySafe,
    survivabilitySafe,
    governanceSafe,
    governanceBoundaries: [
      "tokens must be encrypted before DB write",
      "persistence must be tenant-isolated",
      "replay access requires authorization boundary",
    ],
    tenantScope: tenantId,
    workspaceScope: workspaceId,
    evidence: [
      `encryptedAtRest: ${encryptedAtRest}`,
      `replaySafe: ${replaySafe}`,
      `survivabilitySafe: ${survivabilitySafe}`,
      `governanceSafe: ${governanceSafe}`,
    ],
    uncertainty: [
      "live persistence requires encrypted DB backend — contract semantics only",
    ],
    checkedAt: now,
  };
}
