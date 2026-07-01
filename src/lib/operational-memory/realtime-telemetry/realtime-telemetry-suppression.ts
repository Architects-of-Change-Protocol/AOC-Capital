import type { OperationalTelemetryDelta, TelemetrySuppressionResult } from "./realtime-telemetry-types";
export const suppressTelemetryNoise = (deltas: OperationalTelemetryDelta[]): TelemetrySuppressionResult => {
  const retained = deltas.filter((d) => d.material).map((d) => d.metric);
  const suppressed = deltas.filter((d) => !d.material).map((d) => d.metric);
  return { suppressedIds: suppressed, retainedIds: [...new Set(retained)], reason: "non-material-delta", evidence: ["significance-threshold"], confidence: 0.84, uncertainty: ["threshold-tuned"], causalityRationale: ["material deltas retained"], significanceRationale: ["anti-noise filter"], governanceBoundaries: ["bounded alerting"] };
};
