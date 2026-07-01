import type { OperationalMeteringEvent } from '../domain/metering-types';
import { createDeterministicEventId, createReplaySafeHash } from '../utils/replay-safe';

export const buildOperationalMeteringEvent = (input: Omit<OperationalMeteringEvent, 'eventId' | 'replaySafeHash'>): OperationalMeteringEvent => {
  const deterministicSeed = [
    input.companyId,input.workspaceId,input.userId,input.runtimeCorrelationId,input.operationCategory,input.orchestrationIntensity,
    input.occurredAt,JSON.stringify(input.usageDelta),input.sourceRuntime,
    JSON.stringify(input.versionContext ?? {}),
  ].join(':');
  const eventId = createDeterministicEventId(deterministicSeed);
  const replaySafeHash = createReplaySafeHash({ ...input, eventId });
  return { ...input, eventId, replaySafeHash };
};
