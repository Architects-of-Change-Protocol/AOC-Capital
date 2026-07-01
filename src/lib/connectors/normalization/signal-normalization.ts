import { ConnectorSignal, SignalNormalizationResult } from "../types/connector-types";

const meanings: Record<string, string> = {
  jira: "delivery pressure and dependency drift",
  slack: "escalation pressure and coordination breakdown",
  teams: "cross-functional escalation pressure",
  github: "deployment instability and review bottlenecks",
  google_calendar: "meeting overload and congestion"
};

export function normalizeConnectorSignal(signal: ConnectorSignal): SignalNormalizationResult {
  const operationalMeaning = meanings[signal.connector] ?? "operational signal requiring synthesis";
  const confidence = signal.severity === "critical" ? 0.9 : signal.severity === "high" ? 0.82 : 0.72;
  return {
    signal: { ...signal, operationalMeaning, confidence, uncertainty: ["partial external context"], temporalReferences: [signal.occurredAt], lineage: [{ sourceSystem: signal.connector, sourceEventId: signal.id, sourceReference: `${signal.connector}:${signal.id}`, normalizedBy: "normalizeConnectorSignal", federationRuleIds: [], lineageRationale: "direct connector normalization" }] },
    confidence,
    uncertainty: ["taxonomy drift risk"],
    rationale: `Mapped ${signal.connector} activity into operational cognition semantics.`
  };
}
