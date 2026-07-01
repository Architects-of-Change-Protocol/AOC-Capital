import { createHash } from 'node:crypto';

export const createCapabilitySnapshotHash = (
  capabilities: Array<{ key: string; enabled?: boolean; scope?: string; metadata?: Record<string, unknown> }>,
): string => {
  const normalized = capabilities
    .map((cap) => ({
      key: cap.key.trim().toLowerCase(),
      enabled: cap.enabled !== false,
      scope: (cap.scope ?? 'global').trim().toLowerCase(),
      metadata: cap.metadata ?? {},
    }))
    .sort((a, b) => (a.key + a.scope).localeCompare(b.key + b.scope));

  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
};

export const createTransitionChainHash = (input: {
  previousTransitionHash: string | null;
  transitionId: string;
  eventId: string;
  occurredAt: string;
}): string =>
  createHash('sha256')
    .update(`${input.previousTransitionHash ?? 'origin'}|${input.transitionId}|${input.eventId}|${input.occurredAt}`)
    .digest('hex');
