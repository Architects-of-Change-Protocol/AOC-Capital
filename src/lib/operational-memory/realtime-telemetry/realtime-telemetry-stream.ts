import type { OperationalTelemetrySignal } from "./realtime-telemetry-types";
export const appendTelemetryStream = (existing: OperationalTelemetrySignal[], incoming: OperationalTelemetrySignal[]): OperationalTelemetrySignal[] => [...existing, ...incoming];
