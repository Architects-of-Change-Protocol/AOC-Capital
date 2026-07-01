import {
  SupabaseAuditProvider,
  SupabaseCapabilityProvider,
  SupabaseMemoryProvider,
  SupabasePolicyProvider,
  SupabasePortableMemoryProvider,
  SupabaseVaultProvider,
} from "@/lib/aoc/providers/supabase";
import type { AuditProvider, CapabilityProvider, MemoryProvider, PolicyProvider, PortableMemoryExportProvider, VaultProvider } from "@/lib/aoc/providers/types";
import type { OperationalDomain } from "@/lib/operational-memory";

export type AocProviders = {
  memoryProvider: MemoryProvider;
  vaultProvider: VaultProvider;
  policyProvider: PolicyProvider;
  auditProvider: AuditProvider;
  capabilityProvider: CapabilityProvider;
  portableMemoryExportProvider: PortableMemoryExportProvider;
};

export const createDefaultAocProviders = (extractFacts: (domain: OperationalDomain, text: string) => { data: Record<string, string>; extractedFacts: string[]; completionScore: number; missingFields: string[]; confidenceScore: number }): AocProviders => {
  const capabilityProvider = new SupabaseCapabilityProvider();
  return {
    capabilityProvider,
    memoryProvider: new SupabaseMemoryProvider(extractFacts),
    vaultProvider: new SupabaseVaultProvider(),
    policyProvider: new SupabasePolicyProvider(capabilityProvider),
    auditProvider: new SupabaseAuditProvider(),
    portableMemoryExportProvider: new SupabasePortableMemoryProvider(),
  };
};

export * from "@/lib/aoc/providers/types";
export * from "@/lib/aoc/providers/supabase";
