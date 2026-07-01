import type { FederatedOperationalEvent } from "./event-normalizer";

export type OperationalPulse = {
  eventDensity: number;
  freshness: "fresh" | "warming" | "stale";
  signalDrift: number;
  ingestionLatencyMs: number;
  connectorLiveness: Record<string, number>;
  mutationVelocity: number;
};

export function computeOperationalPulse(events: FederatedOperationalEvent[]): OperationalPulse {
  const now = Date.now();
  const connectorLiveness: Record<string, number> = {};
  let latencyTotal = 0;
  for (const e of events) {
    connectorLiveness[e.connectorId] = (connectorLiveness[e.connectorId] ?? 0) + 1;
    latencyTotal += Math.max(0, now - Date.parse(e.timestamp));
  }
  const eventDensity = events.length;
  const ingestionLatencyMs = events.length ? Math.round(latencyTotal / events.length) : 0;
  const freshness = ingestionLatencyMs < 120_000 ? "fresh" : ingestionLatencyMs < 1_800_000 ? "warming" : "stale";

  return {
    eventDensity,
    freshness,
    signalDrift: Math.min(1, events.filter((e) => e.freshness === "stale").length / Math.max(1, events.length)),
    ingestionLatencyMs,
    connectorLiveness,
    mutationVelocity: events.filter((e) => now - Date.parse(e.timestamp) < 5 * 60_000).length / 5,
  };
}

export function evaluatePulseHealth(pulse: OperationalPulse): "healthy" | "degraded" | "critical" {
  if (pulse.freshness === "stale" || pulse.signalDrift > 0.6) return "critical";
  if (pulse.freshness === "warming" || pulse.signalDrift > 0.3) return "degraded";
  return "healthy";
}

export function detectPulseAnomalies(pulse: OperationalPulse): string[] {
  const anomalies: string[] = [];
  if (pulse.ingestionLatencyMs > 900_000) anomalies.push("high ingestion latency");
  if (pulse.signalDrift > 0.5) anomalies.push("signal drift anomaly");
  if (Object.keys(pulse.connectorLiveness).length === 0) anomalies.push("no live connectors");
  return anomalies;
}
