import type { DataSensitivity } from "@/lib/ai/inference/types";
import type { ProviderMetadata } from "./provider-registry";

export interface EgressEvaluation {
  allowed: boolean;
  reason: string;
  requiresAudit?: boolean;
}

export function evaluateProviderEgress(
  provider: ProviderMetadata,
  dataSensitivity: DataSensitivity,
  routingMode: string,
): EgressEvaluation {
  if (provider.availability !== "enabled") {
    return { allowed: false, reason: `provider_not_available:${provider.availability ?? "unknown"}` };
  }

  // local_only routing mode cannot use any non-local provider.
  if (routingMode === "local_only" && !provider.supportsLocalExecution) {
    return { allowed: false, reason: "local_only_mode_requires_local_provider" };
  }

  // restricted data: only local-execution or sovereign-tier providers allowed.
  if (dataSensitivity === "restricted") {
    if (provider.trustTier !== "local" && provider.trustTier !== "sovereign") {
      return { allowed: false, reason: "restricted_data_requires_local_or_sovereign_provider" };
    }
  }

  // Provider must declare support for this sensitivity level.
  if (!provider.allowedSensitivityLevels.includes(dataSensitivity)) {
    return { allowed: false, reason: `provider_does_not_support_sensitivity_level:${dataSensitivity}` };
  }

  // confidential + conditional tier: allowed but requires mandatory audit trail.
  if (dataSensitivity === "confidential" && provider.trustTier === "conditional") {
    return { allowed: true, reason: "conditional_provider_allowed_for_confidential_with_audit", requiresAudit: true };
  }

  return { allowed: true, reason: "policy_allows" };
}
