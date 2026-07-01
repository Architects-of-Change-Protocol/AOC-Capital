import { FederatedOperationalSignal, FederatedTimelineEvent } from "../types/connector-types";

export function buildFederatedTimeline(signals: FederatedOperationalSignal[]): FederatedTimelineEvent[] {
  return signals
    .slice()
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((signal) => ({ id: `timeline-${signal.id}`, at: signal.occurredAt, signalIds: [signal.id], description: signal.operationalMeaning, confidence: signal.confidence, lineage: signal.lineage }));
}
