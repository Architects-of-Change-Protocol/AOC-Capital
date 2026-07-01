import type { OperationalMeteringEvent } from '../domain/metering-types';

export type OperationalTelemetryEvent = {
  telemetryType: 'usage_diagnostic' | 'orchestration_diagnostic' | 'consumption_diagnostic' | 'capability_diagnostic';
  eventId: string;
  emittedAt: string;
  diagnostics: Record<string, unknown>;
};

export const createOperationalTelemetryEvent = (event: OperationalMeteringEvent, diagnostics: Record<string, unknown>): OperationalTelemetryEvent => ({
  telemetryType: 'usage_diagnostic',
  eventId: event.eventId,
  emittedAt: event.occurredAt,
  diagnostics,
});
