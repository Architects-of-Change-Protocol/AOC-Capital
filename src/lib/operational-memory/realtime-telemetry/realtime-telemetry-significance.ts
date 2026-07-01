import type { OperationalTelemetryDelta } from "./realtime-telemetry-types";
export const evaluateTelemetrySignificance = (deltas: OperationalTelemetryDelta[]): OperationalTelemetryDelta[] => deltas.map((d)=>({ ...d, material: d.material || Math.abs(d.delta) >= 8 }));
