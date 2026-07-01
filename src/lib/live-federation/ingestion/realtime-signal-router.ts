import type { FederatedOperationalEvent } from "./event-normalizer";

export type SignalRouteTarget =
  | "operational-memory"
  | "telemetry-runtime"
  | "continuity-retrieval"
  | "cross-domain-correlation"
  | "executive-command-runtime"
  | "organizational-digital-twin";

export type RealtimeSignalDomain =
  | "stakeholder_intelligence"
  | "delivery_intelligence"
  | "risk_intelligence"
  | "executive_context"
  | "operational_memory"
  | "governance";

export type RoutedSignal = {
  target: SignalRouteTarget;
  eventId: string;
  workspaceId: string;
  deliveredAt: string;
};

export function classifyRealtimeSignalDomain(event: FederatedOperationalEvent): RealtimeSignalDomain {
  const eventType = event.eventType.toLowerCase();
  if (/governance|policy|audit|compliance/.test(eventType)) return "governance";
  if (/exec|leadership|brief/.test(eventType)) return "executive_context";
  if (/incident|risk|failure|outage|blocked/.test(eventType)) return "risk_intelligence";
  if (/delivery|deploy|release|milestone|sprint/.test(eventType)) return "delivery_intelligence";
  if (/stakeholder|customer|partner|feedback/.test(eventType)) return "stakeholder_intelligence";
  return "operational_memory";
}

export function routeOperationalSignal(event: FederatedOperationalEvent): RoutedSignal[] {
  const targets: SignalRouteTarget[] = [
    "operational-memory",
    "telemetry-runtime",
    "continuity-retrieval",
    "cross-domain-correlation",
    "executive-command-runtime",
    "organizational-digital-twin",
  ];

  return targets.map((target) => ({
    target,
    eventId: event.lineage.ingressId,
    workspaceId: event.workspaceId,
    deliveredAt: new Date().toISOString(),
  }));
}

export function routeRealtimeSignal(event: FederatedOperationalEvent): RoutedSignal[] {
  return routeOperationalSignal(event);
}
