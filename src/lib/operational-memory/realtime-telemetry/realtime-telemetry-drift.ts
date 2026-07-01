import type { OperationalTelemetryDelta, OperationalTelemetrySignal } from "./realtime-telemetry-types";
export const detectOperationalDeltas = (signals: OperationalTelemetrySignal[], previous: OperationalTelemetryDelta[]): OperationalTelemetryDelta[] => signals.map((signal) => {
  const prev = previous.find((d) => d.metric === signal.metric)?.current ?? (signal.value - (signal.deltaHint ?? 0));
  const delta = signal.value - prev;
  return { ...signal, metric: signal.metric, previous: prev, current: signal.value, delta, direction: delta === 0 ? "flat" : delta > 0 ? "up" : "down", material: Math.abs(delta) >= 5 };
});
