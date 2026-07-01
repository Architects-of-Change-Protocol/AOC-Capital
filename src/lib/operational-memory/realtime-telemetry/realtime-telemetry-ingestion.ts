import type { OperationalTelemetrySignal } from "./realtime-telemetry-types";
export const ingestTelemetrySignals = (signals: OperationalTelemetrySignal[]): OperationalTelemetrySignal[] => [...signals].sort((a,b)=>a.at.localeCompare(b.at));
