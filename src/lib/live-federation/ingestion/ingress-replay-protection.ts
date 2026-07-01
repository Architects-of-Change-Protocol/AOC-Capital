const REPLAY_WINDOW_MS = 10 * 60 * 1000;

type ReplayEntry = {
  workspaceId: string;
  connectorId: string;
  nonce: string;
  payloadHash: string;
  observedAt: number;
};

const replayLedger = new Map<string, ReplayEntry>();

export type IngressReplayValidation = {
  accepted: boolean;
  reason?: string;
  replayKey: string;
};

export type ReplayDetectionResult = {
  isReplay: boolean;
  replayKey: string;
  reason?: string;
};

function buildReplayKey(workspaceId: string, connectorId: string, nonce: string): string {
  return `${workspaceId}:${connectorId}:${nonce}`;
}

export function buildReplayFingerprint(workspaceId: string, connectorId: string, nonce: string, payloadHash: string): string {
  return `${buildReplayKey(workspaceId, connectorId, nonce)}:${payloadHash}`;
}

export function validateIngressReplay(workspaceId: string, connectorId: string, nonce: string, payloadHash: string): IngressReplayValidation {
  const replayKey = buildReplayKey(workspaceId, connectorId, nonce);
  const now = Date.now();
  const existing = replayLedger.get(replayKey);
  if (!existing) {
    return { accepted: true, replayKey };
  }
  if (now - existing.observedAt > REPLAY_WINDOW_MS) {
    replayLedger.delete(replayKey);
    return { accepted: true, replayKey };
  }
  if (existing.payloadHash !== payloadHash) {
    return rejectReplayIngress(replayKey, "connector spoof replay detected");
  }
  return rejectReplayIngress(replayKey, "duplicate webhook replay blocked");
}

export function detectReplayIngress(
  workspaceId: string,
  connectorId: string,
  nonce: string,
  payloadHash: string,
  replaySet: ReadonlySet<string> = new Set(),
): ReplayDetectionResult {
  const replayKey = buildReplayKey(workspaceId, connectorId, nonce);
  const fingerprint = buildReplayFingerprint(workspaceId, connectorId, nonce, payloadHash);
  const validation = validateIngressReplay(workspaceId, connectorId, nonce, payloadHash);
  const isReplay = !validation.accepted || replaySet.has(fingerprint);

  return {
    isReplay,
    replayKey,
    reason: validation.accepted ? (isReplay ? "replay fingerprint matched" : undefined) : validation.reason,
  };
}

export function registerIngressNonce(workspaceId: string, connectorId: string, nonce: string, payloadHash: string): void {
  replayLedger.set(buildReplayKey(workspaceId, connectorId, nonce), {
    workspaceId,
    connectorId,
    nonce,
    payloadHash,
    observedAt: Date.now(),
  });
}

export function rejectReplayIngress(replayKey: string, reason: string): IngressReplayValidation {
  return { accepted: false, reason, replayKey };
}
