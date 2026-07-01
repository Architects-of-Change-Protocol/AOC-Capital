import type { ProviderMetadata } from "./provider-registry";

export type RoutingMode =
  | "default"
  | "sovereign_first"
  | "local_only"
  | "external_allowed"
  | "cost_optimized"
  | "quality_optimized"
  | "resilience";

export interface ProviderCandidate {
  providerId: string;
  reason: string;
  priority: number;
  metadata: ProviderMetadata;
}

export interface ProviderRoutingDecision {
  selectedProviderId: string;
  selectedModel?: string;
  candidatesEvaluated: ProviderCandidate[];
  rejectedCandidates: Array<{
    providerId: string;
    reason: string;
  }>;
  routingMode: RoutingMode;
}
