import { createHash } from "node:crypto";
import { normalizeFederatedEvent, type FederatedOperationalEvent } from "./event-normalizer";
import { registerIngressNonce, validateIngressReplay } from "./ingress-replay-protection";
import { routeOperationalSignal, type RoutedSignal } from "./realtime-signal-router";

const ingressStore: FederatedOperationalEvent[] = [];

export type FederatedIngressRequest = {
  workspaceId: string;
  connectorId: string;
  sourceSystem: FederatedOperationalEvent["sourceSystem"];
  federationAuthorized: boolean;
  nonce: string;
  payload: Record<string, unknown>;
};

export function validateFederatedIngress(request: FederatedIngressRequest): { valid: boolean; reason?: string; payloadHash: string; replayKey: string } {
  if (!request.federationAuthorized) return { valid: false, reason: "federation authorization failed", payloadHash: "", replayKey: "" };
  const payloadHash = createHash("sha256").update(JSON.stringify(request.payload)).digest("hex");
  const replayValidation = validateIngressReplay(request.workspaceId, request.connectorId, request.nonce, payloadHash);
  if (!replayValidation.accepted) {
    return { valid: false, reason: replayValidation.reason, payloadHash, replayKey: replayValidation.replayKey };
  }
  return { valid: true, payloadHash, replayKey: replayValidation.replayKey };
}

export function persistOperationalIngress(event: FederatedOperationalEvent): void {
  ingressStore.push(event);
}

export function ingestFederatedEvent(request: FederatedIngressRequest): { event: FederatedOperationalEvent; routes: RoutedSignal[] } {
  const ingress = validateFederatedIngress(request);
  if (!ingress.valid) throw new Error(ingress.reason ?? "invalid ingress");
  registerIngressNonce(request.workspaceId, request.connectorId, request.nonce, ingress.payloadHash);
  const event = normalizeFederatedEvent({
    workspaceId: request.workspaceId,
    connectorId: request.connectorId,
    sourceSystem: request.sourceSystem,
    rawPayload: request.payload,
    replayKey: ingress.replayKey,
  });
  persistOperationalIngress(event);
  const routes = routeOperationalSignal(event);
  return { event, routes };
}

export { normalizeFederatedEvent, routeOperationalSignal };

export function listIngressEvents(workspaceId: string): FederatedOperationalEvent[] {
  return ingressStore.filter((event) => event.workspaceId === workspaceId);
}
