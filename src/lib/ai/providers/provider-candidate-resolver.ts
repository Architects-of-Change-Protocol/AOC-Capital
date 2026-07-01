import type { InferenceRequest, DataSensitivity } from "@/lib/ai/inference/types";
import type { RoutingMode, ProviderCandidate } from "./routing-policy";
import { getProviderMetadata, getRegisteredProviders, isProviderConfigured } from "./provider-registry";

export interface RoutingContext {
  routingMode: RoutingMode;
  dataSensitivity: DataSensitivity;
  preferredProvider?: string;
  allowFallback: boolean;
  requireLocalExecution: boolean;
  moduleId?: string;
  actorType?: string;
  workspaceId?: string;
  projectId?: string;
}

export function buildRoutingContext(request: InferenceRequest): RoutingContext {
  const meta = request.metadata ?? {};
  return {
    routingMode: (meta.routingMode as RoutingMode | undefined) ?? "default",
    dataSensitivity: request.dataSensitivity ?? "internal",
    preferredProvider: meta.preferredProvider as string | undefined,
    allowFallback: typeof meta.allowFallback === "boolean" ? meta.allowFallback : true,
    requireLocalExecution: typeof meta.requireLocalExecution === "boolean" ? meta.requireLocalExecution : false,
    moduleId: request.moduleId,
    actorType: request.actorType,
    workspaceId: request.workspaceId,
    projectId: request.projectId,
  };
}

function getDefaultProviderId(): string {
  return process.env.DEFAULT_AI_PROVIDER ?? "openai";
}

export function resolveProviderCandidates(context: RoutingContext): ProviderCandidate[] {
  const candidates: ProviderCandidate[] = [];

  // local_only and requireLocalExecution: only the local provider is eligible.
  if (context.routingMode === "local_only" || context.requireLocalExecution) {
    const localMeta = getProviderMetadata("local");
    if (localMeta && isProviderConfigured("local")) {
      candidates.push({ providerId: "local", reason: "local_only_mode", priority: 0, metadata: localMeta });
    }
    // If local is not configured, return empty list — caller fails closed.
    return candidates;
  }

  // sovereign_first: local → trusted → conditional (only when sensitivity permits)
  if (context.routingMode === "sovereign_first") {
    const localMeta = getProviderMetadata("local");
    if (localMeta && isProviderConfigured("local")) {
      candidates.push({ providerId: "local", reason: "sovereign_first_local_preferred", priority: 0, metadata: localMeta });
    }
    for (const provider of getRegisteredProviders()) {
      if (provider.id === "local" || provider.id === "mock") continue;
      if (provider.trustTier === "trusted" && provider.availability === "enabled") {
        candidates.push({ providerId: provider.id, reason: "sovereign_first_trusted_fallback", priority: candidates.length, metadata: provider });
      }
    }
    if (context.dataSensitivity !== "restricted") {
      for (const provider of getRegisteredProviders()) {
        if (provider.id === "local" || provider.id === "mock") continue;
        if (candidates.some((c) => c.providerId === provider.id)) continue;
        if (provider.trustTier === "conditional" && provider.availability === "enabled") {
          candidates.push({ providerId: provider.id, reason: "sovereign_first_conditional_allowed", priority: candidates.length, metadata: provider });
        }
      }
    }
    return candidates;
  }

  // resilience: all configured enabled providers ordered by trust tier
  if (context.routingMode === "resilience") {
    const tierOrder: ProviderCandidate["metadata"]["trustTier"][] = ["sovereign", "local", "trusted", "conditional"];
    const sorted = getRegisteredProviders()
      .filter((p) => p.availability === "enabled" && p.id !== "mock")
      .sort((a, b) => tierOrder.indexOf(a.trustTier) - tierOrder.indexOf(b.trustTier));
    return sorted.map((p, i) => ({ providerId: p.id, reason: "resilience_ordered_chain", priority: i, metadata: p }));
  }

  // default / external_allowed / cost_optimized / quality_optimized:
  // 1. Preferred provider (if explicitly requested and configured, never mock)
  if (context.preferredProvider && context.preferredProvider !== "mock") {
    const preferredMeta = getProviderMetadata(context.preferredProvider);
    if (preferredMeta && isProviderConfigured(context.preferredProvider)) {
      candidates.push({ providerId: context.preferredProvider, reason: "preferred_provider_requested", priority: 0, metadata: preferredMeta });
    }
  }

  // 2. Default provider
  const defaultId = getDefaultProviderId();
  if (!candidates.some((c) => c.providerId === defaultId) && defaultId !== "mock") {
    const defaultMeta = getProviderMetadata(defaultId);
    if (defaultMeta && isProviderConfigured(defaultId)) {
      candidates.push({ providerId: defaultId, reason: "default_provider", priority: candidates.length, metadata: defaultMeta });
    }
  }

  // 3. Fallback chain from remaining configured providers (never mock as silent fallback)
  if (context.allowFallback) {
    for (const provider of getRegisteredProviders()) {
      if (candidates.some((c) => c.providerId === provider.id)) continue;
      if (provider.id === "mock") continue;
      if (provider.availability === "enabled") {
        candidates.push({ providerId: provider.id, reason: "fallback_candidate", priority: candidates.length, metadata: provider });
      }
    }
  }

  return candidates;
}
