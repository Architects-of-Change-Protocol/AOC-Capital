import type { FederatedOperationalEvent } from "@/lib/live-federation/ingestion/event-normalizer";
import { computeOperationalPulse, evaluatePulseHealth } from "@/lib/live-federation/ingestion/operational-pulse";
import { evaluateEventSurvivability } from "@/lib/live-federation/ingestion/event-survivability";

export function LiveFederationDashboard({ events }: { events: FederatedOperationalEvent[] }) {
  const pulse = computeOperationalPulse(events);
  const survivability = evaluateEventSurvivability(events);
  return (
    <section>
      <h2>Live Federation Dashboard</h2>
      <p>active connectors: {Object.keys(pulse.connectorLiveness).length}</p>
      <p>event throughput: {pulse.eventDensity}</p>
      <p>pulse health: {evaluatePulseHealth(pulse)}</p>
      <p>connector freshness: {pulse.freshness}</p>
      <p>federation survivability: {survivability.survivable ? "stable" : "degraded"}</p>
      <p>realtime mutation stream: {events.length}</p>
    </section>
  );
}
