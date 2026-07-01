import { createHash } from "node:crypto";

export type FederatedOperationalEvent = {
  workspaceId: string;
  connectorId: string;
  sourceSystem: "jira" | "slack" | "github" | "calendar" | "notion" | "custom";
  eventType: string;
  timestamp: string;
  payloadHash: string;
  lineage: {
    ingressId: string;
    replayKey: string;
    rawEventId: string;
    normalizedAt: string;
  };
  severity: "low" | "medium" | "high" | "critical";
  freshness: "fresh" | "warming" | "stale";
  signalVector: string[];
  payload: Record<string, unknown>;
};

export type NormalizeInput = {
  workspaceId: string;
  connectorId: string;
  sourceSystem: FederatedOperationalEvent["sourceSystem"];
  rawPayload: Record<string, unknown>;
  replayKey: string;
};

export type NormalizedIngressEvent = FederatedOperationalEvent;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function normalizeFederatedEvent(input: NormalizeInput): FederatedOperationalEvent {
  const canonicalPayload = stableJson(input.rawPayload);
  const payloadHash = createHash("sha256").update(canonicalPayload).digest("hex");
  const eventType = String(input.rawPayload.type ?? input.rawPayload.event ?? "external.event");
  const timestamp = String(input.rawPayload.timestamp ?? input.rawPayload.ts ?? new Date().toISOString());
  const severity = /incident|failure|blocked|outage/i.test(eventType) ? "high" : "medium";
  const ageMs = Date.now() - Date.parse(timestamp);
  const freshness = ageMs < 2 * 60 * 1000 ? "fresh" : ageMs < 30 * 60 * 1000 ? "warming" : "stale";

  return {
    workspaceId: input.workspaceId,
    connectorId: input.connectorId,
    sourceSystem: input.sourceSystem,
    eventType,
    timestamp,
    payloadHash,
    lineage: {
      ingressId: createHash("sha1").update(`${input.workspaceId}:${input.connectorId}:${payloadHash}`).digest("hex"),
      replayKey: input.replayKey,
      rawEventId: String(input.rawPayload.id ?? input.rawPayload.event_id ?? payloadHash.slice(0, 16)),
      normalizedAt: new Date().toISOString(),
    },
    severity,
    freshness,
    signalVector: [input.sourceSystem, eventType, severity, freshness],
    payload: input.rawPayload,
  };
}

export function normalizeIngressEvent(input: NormalizeInput): NormalizedIngressEvent {
  return normalizeFederatedEvent(input);
}

export function normalizeEventBatch(inputs: NormalizeInput[]): NormalizedIngressEvent[] {
  return inputs.map((input) => normalizeIngressEvent(input));
}
