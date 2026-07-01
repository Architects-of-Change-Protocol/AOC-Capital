import type { FederatedOperationalEvent } from "@/lib/live-federation/ingestion/event-normalizer";

export function ConnectorEventTimeline({ events }: { events: FederatedOperationalEvent[] }) {
  return (
    <ul>
      {events.map((event) => (
        <li key={event.lineage.ingressId}>
          {event.timestamp} | {event.sourceSystem} | {event.severity} | {event.lineage.rawEventId} | operational-memory
        </li>
      ))}
    </ul>
  );
}
