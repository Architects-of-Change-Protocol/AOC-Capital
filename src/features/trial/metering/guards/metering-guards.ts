import type { MeteringRuntimeState } from '../state/metering-state';
import type { OperationalMeteringEvent } from '../domain/metering-types';

export const detectMeteringAnomalies = (state: MeteringRuntimeState, event: OperationalMeteringEvent) => {
  const diagnostics: string[] = [];
  if (event.orchestrationIntensity === 'critical' && event.usageDelta.units > 200) diagnostics.push('runaway_orchestration_detection');
  if (event.operationCategory === 'ingestion' && event.usageDelta.operationCount > 50) diagnostics.push('ingestion_explosion_detection');
  if (state.events.filter((e) => e.runtimeCorrelationId === event.runtimeCorrelationId).length > 20) diagnostics.push('abnormal_usage_spike');
  if (state.dedupeHashes.has(event.replaySafeHash)) diagnostics.push('repeated_replay_attempt');
  return diagnostics;
};
