import type { FederatedOperationalEvent } from "./event-normalizer";

export type EventSurvivabilityState = {
  survivable: boolean;
  risks: string[];
  score: number;
};

export function evaluateEventSurvivability(events: FederatedOperationalEvent[]): EventSurvivabilityState {
  const risks: string[] = [];
  const now = Date.now();
  const connectors = new Set(events.map((e) => e.connectorId));
  if (connectors.size === 0) risks.push("connector starvation");
  if (events.some((e) => now - Date.parse(e.timestamp) > 60 * 60_000)) risks.push("stale federation");
  const classes = new Set(events.map((e) => e.eventType));
  if (classes.size < 2) risks.push("missing event classes");
  if (events.filter((e) => e.freshness === "stale").length > events.length / 2) risks.push("ingestion degradation");
  const score = Math.max(0, 1 - risks.length * 0.2);
  return { survivable: score >= 0.5, risks, score };
}
