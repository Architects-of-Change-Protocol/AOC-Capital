import type { DataSensitivity } from "@/lib/ai/inference/types";

export type ProviderTrustTier = "sovereign" | "trusted" | "conditional" | "local";

export interface ProviderMetadata {
  id: string;
  trustTier: ProviderTrustTier;
  supportsEnterpriseIsolation: boolean;
  supportsRegionalResidency?: boolean;
  supportsZeroRetention?: boolean;
  supportsLocalExecution?: boolean;
  allowedSensitivityLevels: DataSensitivity[];
  supportedResponseFormats?: Array<"json_schema" | "json_object" | "text">;
  supportedUseCases?: string[];
  maxInputTokens?: number;
  defaultModel?: string;
  availability?: "enabled" | "disabled" | "not_configured";
}

// Static capability declarations; availability is resolved at runtime via isProviderConfigured().
const CAPABILITY_REGISTRY = new Map<string, Omit<ProviderMetadata, "availability">>([
  [
    "openai",
    {
      id: "openai",
      trustTier: "conditional",
      supportsEnterpriseIsolation: false,
      supportsRegionalResidency: false,
      supportsZeroRetention: false,
      supportsLocalExecution: false,
      allowedSensitivityLevels: ["public", "internal", "confidential"],
      supportedResponseFormats: ["json_schema", "json_object", "text"],
      maxInputTokens: 128000,
      defaultModel: "gpt-4.1-mini",
    },
  ],
  [
    "anthropic",
    {
      id: "anthropic",
      trustTier: "conditional",
      supportsEnterpriseIsolation: false,
      supportsRegionalResidency: false,
      supportsZeroRetention: false,
      supportsLocalExecution: false,
      allowedSensitivityLevels: ["public", "internal", "confidential"],
      supportedResponseFormats: ["json_object", "text"],
      maxInputTokens: 200000,
      defaultModel: "claude-sonnet-4-6",
    },
  ],
  [
    "gemini",
    {
      id: "gemini",
      trustTier: "conditional",
      supportsEnterpriseIsolation: false,
      supportsRegionalResidency: false,
      supportsZeroRetention: false,
      supportsLocalExecution: false,
      allowedSensitivityLevels: ["public", "internal", "confidential"],
      supportedResponseFormats: ["json_object", "text"],
      maxInputTokens: 1000000,
      defaultModel: "gemini-2.0-flash",
    },
  ],
  [
    "local",
    {
      id: "local",
      trustTier: "local",
      supportsEnterpriseIsolation: true,
      supportsRegionalResidency: true,
      supportsZeroRetention: true,
      supportsLocalExecution: true,
      allowedSensitivityLevels: ["public", "internal", "confidential", "restricted"],
      supportedResponseFormats: ["json_schema", "json_object", "text"],
    },
  ],
  [
    "mock",
    {
      id: "mock",
      trustTier: "conditional",
      supportsEnterpriseIsolation: false,
      supportsLocalExecution: false,
      allowedSensitivityLevels: ["public", "internal"],
      supportedResponseFormats: ["json_schema", "json_object", "text"],
    },
  ],
]);

// Availability is injected by the adapter layer (router.ts) at startup.
// Default: all providers are not_configured until an adapter registers them.
// This keeps API key references isolated to each provider's adapter file.
let _availabilityResolver: (id: string) => "enabled" | "disabled" | "not_configured" = (id) =>
  id === "mock" ? "enabled" : "not_configured";

export function setProviderAvailabilityResolver(
  resolver: (id: string) => "enabled" | "disabled" | "not_configured",
): void {
  _availabilityResolver = resolver;
}

function resolveAvailability(id: string): "enabled" | "disabled" | "not_configured" {
  return _availabilityResolver(id);
}

export function getProviderMetadata(providerId: string): ProviderMetadata | undefined {
  const meta = CAPABILITY_REGISTRY.get(providerId);
  if (!meta) return undefined;
  return { ...meta, availability: resolveAvailability(providerId) };
}

export function getRegisteredProviders(): ProviderMetadata[] {
  return [...CAPABILITY_REGISTRY.keys()].map((id) => ({
    ...CAPABILITY_REGISTRY.get(id)!,
    availability: resolveAvailability(id),
  }));
}

export function isProviderRegistered(providerId: string): boolean {
  return CAPABILITY_REGISTRY.has(providerId);
}

export function isProviderConfigured(providerId: string): boolean {
  return resolveAvailability(providerId) === "enabled";
}

export function getProviderHealth(providerId: string): "healthy" | "not_configured" | "unknown" {
  const availability = resolveAvailability(providerId);
  if (availability === "enabled") return "healthy";
  if (availability === "not_configured") return "not_configured";
  return "unknown";
}
