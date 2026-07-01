import { openAIProvider, isOpenAIProviderConfigured } from "@/lib/ai/providers/openai-provider";
import type { InferenceProvider, InferenceRequest, InferenceResponse } from "@/lib/ai/inference/types";
import { InferenceError } from "@/lib/ai/inference/types";
import { buildRoutingContext, resolveProviderCandidates } from "./provider-candidate-resolver";
import { evaluateProviderEgress } from "./egress-policy";
import { emitRoutingAudit, emitRoutingFallback } from "./routing-audit";
import {
  getRegisteredProviders,
  isProviderRegistered,
  isProviderConfigured,
  getProviderHealth,
  setProviderAvailabilityResolver,
} from "./provider-registry";

export { getRegisteredProviders, isProviderRegistered, isProviderConfigured, getProviderHealth };

const DEFAULT_MODEL = process.env.DEFAULT_AI_MODEL ?? "gpt-4.1-mini";

// Per-module model overrides; resolved once at startup from env.
const MODULE_MODEL_MAP: Record<string, string> = {
  "meta-intelligence": process.env.OPENAI_META_INTELLIGENCE_MODEL ?? DEFAULT_MODEL,
  "message-nudges": process.env.OPENAI_MESSAGE_NUDGES_MODEL ?? DEFAULT_MODEL,
};

const providerRegistry = new Map<string, InferenceProvider>([
  ["openai", openAIProvider],
  // Future providers registered here:
  // ["anthropic", anthropicProvider],
  // ["gemini", geminiProvider],
  // ["local", localProvider],
]);

// Inject availability into the capability registry so routing decisions are accurate.
// API key checks live in each provider adapter; the registry queries via this resolver.
setProviderAvailabilityResolver((id) => {
  if (id === "openai") return isOpenAIProviderConfigured() ? "enabled" : "not_configured";
  if (id === "mock") return "enabled";
  // anthropic, gemini, local: adapters not yet registered
  return providerRegistry.has(id) ? "enabled" : "not_configured";
});

export function resolveProvider(moduleId?: string): InferenceProvider {
  // Future: consult module registry or policy engine for per-module routing.
  // For now, route everything through the configured default provider.
  void moduleId;
  const providerId = process.env.DEFAULT_AI_PROVIDER ?? "openai";
  const provider = providerRegistry.get(providerId);
  if (!provider) {
    throw new InferenceError(
      `AI provider "${providerId}" is not registered. Available providers: ${[...providerRegistry.keys()].join(", ")}`,
      "unknown",
      providerId,
    );
  }
  return provider;
}

export function resolveModelForModule(moduleId?: string): string {
  return (moduleId && MODULE_MODEL_MAP[moduleId]) ?? DEFAULT_MODEL;
}

export function registerProvider(provider: InferenceProvider): void {
  providerRegistry.set(provider.id, provider);
}

export async function runInference(request: InferenceRequest): Promise<InferenceResponse> {
  const context = buildRoutingContext(request);
  const candidates = resolveProviderCandidates(context);

  const allowedCandidates: Array<{ candidate: (typeof candidates)[0]; requiresAudit: boolean }> = [];
  const rejectedCandidates: Array<{ providerId: string; reason: string }> = [];

  for (const candidate of candidates) {
    const egress = evaluateProviderEgress(candidate.metadata, context.dataSensitivity, context.routingMode);
    if (egress.allowed) {
      allowedCandidates.push({ candidate, requiresAudit: egress.requiresAudit ?? false });
    } else {
      rejectedCandidates.push({ providerId: candidate.providerId, reason: egress.reason });
    }
  }

  if (allowedCandidates.length === 0) {
    throw new InferenceError(
      `No approved provider available for this request. Candidates evaluated: [${candidates.map((c) => c.providerId).join(", ") || "none"}]. Rejected: [${rejectedCandidates.map((r) => `${r.providerId}(${r.reason})`).join(", ") || "none"}].`,
      "unknown",
      "none",
    );
  }

  const resolvedRequest: InferenceRequest = request.modelPreference
    ? request
    : { ...request, modelPreference: resolveModelForModule(request.moduleId) };

  const primaryProviderId = allowedCandidates[0].candidate.providerId;
  let lastError: unknown;

  const limit = context.allowFallback ? allowedCandidates.length : 1;

  for (let i = 0; i < limit; i++) {
    const { candidate, requiresAudit } = allowedCandidates[i];
    const provider = providerRegistry.get(candidate.providerId);

    if (!provider) {
      // Adapter not yet registered for this provider (e.g. anthropic, gemini, local).
      rejectedCandidates.push({ providerId: candidate.providerId, reason: "provider_adapter_not_registered" });
      continue;
    }

    const fallbackUsed = i > 0;
    if (fallbackUsed) {
      emitRoutingFallback(
        allowedCandidates[i - 1].candidate.providerId,
        candidate.providerId,
        lastError instanceof Error ? lastError.message : "unknown_error",
        { module: context.moduleId, routingMode: context.routingMode },
      );
    }

    try {
      const result = await provider.complete(resolvedRequest);

      emitRoutingAudit({
        timestamp: new Date().toISOString(),
        selectedProvider: primaryProviderId,
        routingMode: context.routingMode,
        fallbackUsed,
        finalProvider: candidate.providerId,
        rejectedProviders: rejectedCandidates,
        module: context.moduleId,
        workspaceId: context.workspaceId,
        projectId: context.projectId,
        actorType: context.actorType,
        dataSensitivity: context.dataSensitivity,
        requiresAudit,
      });

      return result;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new InferenceError("All approved providers failed.", "unknown", "none");
}

// Alias kept for inference-gateway.ts and any callers that reference this name.
export const runProviderInference = runInference;
