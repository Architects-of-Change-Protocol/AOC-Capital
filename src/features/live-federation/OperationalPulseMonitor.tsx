import type { FederatedOperationalEvent } from "@/lib/live-federation/ingestion/event-normalizer";
import { computeOperationalPulse, detectPulseAnomalies } from "@/lib/live-federation/ingestion/operational-pulse";

export function OperationalPulseMonitor({ events }: { events: FederatedOperationalEvent[] }) {
  const pulse = computeOperationalPulse(events);
  const anomalies = detectPulseAnomalies(pulse);
  return (
    <section>
      <p>pulse velocity: {pulse.mutationVelocity.toFixed(2)}</p>
      <p>ingestion health: {pulse.freshness}</p>
      <p>anomaly drift: {pulse.signalDrift.toFixed(2)}</p>
      <p>stale connectors: {anomalies.includes("no live connectors") ? "all" : "none"}</p>
    </section>
  );
}
