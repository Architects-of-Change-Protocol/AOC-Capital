import type { OperationCategory, OperationalUsageDelta, OrchestrationIntensity } from '../domain/metering-types';
import { DEFAULT_OPERATIONAL_CONSUMPTION_POLICY, type OperationalConsumptionPolicy } from '../policies/consumption-policies';
import { evaluateOperationalConsumption } from '../engine/consumption-engine';
import { buildOperationalMeteringEvent } from '../events/metering-events';
import { createMeteringRuntimeState, createUsageSnapshot, hashMeteringRuntimeState, type MeteringRuntimeState, type MeteringStateTransition } from '../state/metering-state';
import { detectMeteringAnomalies } from '../guards/metering-guards';
import { createOperationalTelemetryEvent } from '../telemetry/telemetry';
import { createCapabilitySnapshotHash } from '../../activation/utils/deterministic';
import { evaluateQuotaPosture } from '../../activation/utils/quota-posture';

export const registerOperationalUsage = (state: MeteringRuntimeState, input: {
  companyId: string; workspaceId: string; userId: string; runtimeCorrelationId: string; category: OperationCategory;
  intensity: OrchestrationIntensity; delta: OperationalUsageDelta; occurredAt: string; sourceRuntime: string; capabilityKeys?: string[];
  policy?: OperationalConsumptionPolicy;
  runtimeVersion?: string;
  quotaProfileVersion?: string;
  lifecycleContextVersion?: string;
}) => {
  const policy = input.policy ?? DEFAULT_OPERATIONAL_CONSUMPTION_POLICY;
  const evaluated = evaluateOperationalConsumption({ category: input.category, intensity: input.intensity, delta: input.delta, capabilityKeys: input.capabilityKeys, policy });
  const event = buildOperationalMeteringEvent({
    eventType: 'usage_registered', companyId: input.companyId, workspaceId: input.workspaceId, userId: input.userId,
    runtimeCorrelationId: input.runtimeCorrelationId, operationCategory: input.category, orchestrationIntensity: input.intensity,
    usageDelta: input.delta, operationalCreditsConsumed: evaluated.netCredits, occurredAt: input.occurredAt, sourceRuntime: input.sourceRuntime,
    lineageMetadata: {}, telemetryMetadata: { diagnostics: {}, tags: [], source: input.sourceRuntime }, attribution: { capabilityKeys: input.capabilityKeys ?? [] },
    versionContext: {
      meteringContractVersion: 'operational-metering-v1',
      policyId: policy.id,
      policyVersion: policy.version,
      runtimeVersion: input.runtimeVersion ?? 'runtime-v1',
      capabilitySnapshotHash: createCapabilitySnapshotHash((input.capabilityKeys ?? []).map((key) => ({ key, enabled: true }))),
      quotaProfileId: state.quotaProfile.id,
      quotaProfileVersion: input.quotaProfileVersion ?? state.quotaProfile.version,
      lifecycleContextVersion: input.lifecycleContextVersion ?? 'lifecycle-v1',
    },
  });
  const anomalies = detectMeteringAnomalies(state, event);
  if (state.dedupeHashes.has(event.replaySafeHash)) return { state, event, deduped: true, anomalies };
  const fromStateHash = hashMeteringRuntimeState(state);
  const baseNextState: MeteringRuntimeState = {
    ...state,
    dedupeHashes: new Set([...state.dedupeHashes, event.replaySafeHash]),
    events: [...state.events, event],
    categoryUsage: { ...state.categoryUsage, [input.category]: state.categoryUsage[input.category] + input.delta.units },
    credits: {
      ...state.credits,
      available: Math.max(0, state.credits.available - evaluated.netCredits),
      consumed: state.credits.consumed + evaluated.netCredits,
      hardDepleted: Math.max(0, state.credits.available - evaluated.netCredits) <= 0,
    },
    eventIndex: {
      ...state.eventIndex,
      lastEventId: event.eventId,
      lastReplaySafeHash: event.replaySafeHash,
      eventSequence: state.eventIndex.eventSequence + 1,
      eventsByCategory: { ...state.eventIndex.eventsByCategory, [input.category]: [...state.eventIndex.eventsByCategory[input.category], event.eventId] },
      eventsByCorrelationId: { ...state.eventIndex.eventsByCorrelationId, [event.runtimeCorrelationId]: [...(state.eventIndex.eventsByCorrelationId[event.runtimeCorrelationId] ?? []), event.eventId] },
      eventsByWindow: { ...state.eventIndex.eventsByWindow, ['default-window']: [...(state.eventIndex.eventsByWindow['default-window'] ?? []), event.eventId] },
      dedupeHashIndex: { ...state.eventIndex.dedupeHashIndex, [event.replaySafeHash]: event.eventId },
      latestEventAt: event.occurredAt,
    },
    cursor: { cursorPosition: state.cursor.cursorPosition + 1, windowId: state.cursor.windowId ?? 'default-window' },
  };
  const transition: MeteringStateTransition = {
    transitionId: `transition-${event.eventId}`,
    fromStateHash,
    toStateHash: hashMeteringRuntimeState({ ...baseNextState, transitions: [...state.transitions] }),
    eventId: event.eventId,
    transitionType: 'usage_registered',
    occurredAt: event.occurredAt,
    reason: 'usage_registered',
    accountingDelta: { availableCreditsDelta: -evaluated.netCredits, consumedCreditsDelta: evaluated.netCredits, categoryUnitsDelta: input.delta.units },
    integritySignals: { immutableInputPreserved: true, replaySafe: true, deterministicCursorAdvance: true },
    metadata: { policyId: policy.id },
  };
  const nextState: MeteringRuntimeState = {
    ...baseNextState,
    transitions: [...state.transitions, transition],
  };
  return { state: nextState, event, transition, deduped: false, anomalies, telemetry: createOperationalTelemetryEvent(event, { anomalies, evaluated }) };
};

export const consumeOperationalCredits = (state: MeteringRuntimeState, amount: number) => {
  const available = Math.max(0, state.credits.available - amount);
  return { ...state, credits: { ...state.credits, available, consumed: state.credits.consumed + amount, hardDepleted: available <= 0 } };
};
export const reserveOperationalCredits = (state: MeteringRuntimeState, amount: number) => ({ ...state, credits: { ...state.credits, reserved: state.credits.reserved + amount, available: Math.max(0, state.credits.available - amount) } });
export const replenishOperationalCredits = (state: MeteringRuntimeState, amount: number) => ({ ...state, credits: { ...state.credits, available: state.credits.available + amount, hardDepleted: false } });
export const validateOperationalAllowance = (state: MeteringRuntimeState, expectedConsumption: number) => ({ allowed: state.credits.available >= expectedConsumption, softExhausted: state.credits.available <= state.credits.softThreshold, hardExhausted: state.credits.available <= 0 });
export const evaluateOperationalQuotaPosture = (state: MeteringRuntimeState) =>
  evaluateQuotaPosture({
    available: state.credits.available,
    consumed: state.credits.consumed,
    softLimit: state.quotaProfile.softLimit,
    hardLimit: state.quotaProfile.hardLimit,
    burstAllowance: state.quotaProfile.burstAllowance,
    temporaryExpansion: state.quotaProfile.temporaryExpansion,
  });
export const generateUsageSnapshot = (state: MeteringRuntimeState, input: { companyId: string; workspaceId: string; window: { windowId: string; windowType: 'rolling' | 'fixed' | 'replenishment'; startsAt: string; endsAt: string; resetAt: string }; lastEventId: string | null; generatedAt: string; }) => createUsageSnapshot(state, input);
export const createOperationalMeteringService = (startingCredits: number) => createMeteringRuntimeState(startingCredits);
